import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import type { Env, KVNamespace } from './types';
import type * as IndexModule from './index';

const ACCESS_TEAM_DOMAIN = 'test-team.cloudflareaccess.com';
const ACCESS_AUD = 'test-application-audience-tag';

// A real signed JWT, verified against a mocked JWKS endpoint below, so these
// tests exercise the actual signature/issuer/audience check rather than
// standing in for it with an arbitrary string.
let validAccessJwt: string;
let worker: typeof IndexModule.default;

beforeEach(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const kid = 'test-key';
  const jwk = { ...(await exportJWK(publicKey)), kid, alg: 'RS256' };

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url === `https://${ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`) {
        return new Response(JSON.stringify({ keys: [jwk] }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Unexpected fetch in test: ${url}`);
    })
  );

  validAccessJwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuer(`https://${ACCESS_TEAM_DOMAIN}`)
    .setAudience(ACCESS_AUD)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);

  // index.ts caches its remote JWKS at module scope. Reset so each test's
  // freshly-generated key doesn't collide with a previous test's cached set
  // under the same 'test-key' kid. This also gives each test a clean
  // settingsCache module instance, same reason.
  vi.resetModules();
  worker = (await import('./index')).default;
});

function makeKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key) => store.get(key) ?? null,
    put: async (key, value) => {
      store.set(key, value);
    },
  };
}

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    ASSETS: { fetch: async () => new Response('asset', { status: 200 }) },
    RATE_LIMITER: { limit: async () => ({ success: true }) },
    SETTINGS: makeKv(),
    ACCESS_TEAM_DOMAIN,
    ACCESS_AUD,
    ...overrides,
  };
}

describe('Cloudflare Access gate on / and /admin/react-mode', () => {
  it('rejects GET / with no Cf-Access-Jwt-Assertion header', async () => {
    const res = await worker.fetch(new Request('https://widgets.example.com/'), makeEnv());
    expect(res.status).toBe(403);
  });

  it('rejects GET / with a header present but not a valid signed JWT', async () => {
    // Proves this verifies the signature rather than just checking the
    // header is non-empty, which is all it takes to reach this Worker if
    // the Access application binding is ever missing at the edge.
    const res = await worker.fetch(
      new Request('https://widgets.example.com/', { headers: { 'Cf-Access-Jwt-Assertion': 'anything' } }),
      makeEnv()
    );
    expect(res.status).toBe(403);
  });

  it('rejects a JWT signed with the right shape but the wrong key', async () => {
    const { privateKey: wrongKey } = await generateKeyPair('RS256');
    const forged = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(`https://${ACCESS_TEAM_DOMAIN}`)
      .setAudience(ACCESS_AUD)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(wrongKey);

    const res = await worker.fetch(
      new Request('https://widgets.example.com/', { headers: { 'Cf-Access-Jwt-Assertion': forged } }),
      makeEnv()
    );
    expect(res.status).toBe(403);
  });

  it('accepts GET / with a validly signed Access JWT', async () => {
    const res = await worker.fetch(
      new Request('https://widgets.example.com/', { headers: { 'Cf-Access-Jwt-Assertion': validAccessJwt } }),
      makeEnv()
    );
    expect(res.status).toBe(200);
  });

  it('rejects POST /admin/react-mode with no header', async () => {
    const res = await worker.fetch(
      new Request('https://widgets.example.com/admin/react-mode', { method: 'POST' }),
      makeEnv()
    );
    expect(res.status).toBe(403);
  });

  it('accepts POST /admin/react-mode with a validly signed Access JWT', async () => {
    const form = new URLSearchParams({ spotify: 'standalone' });
    const res = await worker.fetch(
      new Request('https://widgets.example.com/admin/react-mode', {
        method: 'POST',
        headers: {
          'Cf-Access-Jwt-Assertion': validAccessJwt,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      }),
      makeEnv()
    );
    expect(res.status).toBe(303);
  });

  it('does not gate GET /react-mode, read anonymously by widget JS at runtime', async () => {
    const res = await worker.fetch(new Request('https://widgets.example.com/react-mode?app=spotify'), makeEnv());
    expect(res.status).toBe(200);
  });
});
