import { describe, it, expect } from 'vitest';
import app from '../index';
import type { Env } from '../env';

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    EXTERNAL_API_CLIENT_ID: 'id',
    EXTERNAL_API_CLIENT_SECRET: 'secret',
    EXTERNAL_API_BASE_URL: 'https://api.spotify.com/v1',
    ALLOWED_ORIGINS: 'my.duda.co',
    DUDA_API_USER: 'user',
    DUDA_API_PASSWORD: 'pass',
    DUDA_API_BASE_URL: 'https://api.duda.co/api',
    INSTANT_SITE_EMBED_TOKEN: 'embed-token',
    INSTANT_SITE_SESSION_SECRET: 'session-secret',
    FORM_BACKEND_URL: 'https://forms.example.com',
    FORM_BACKEND_TOKEN: 'ingest-token',
    RATE_LIMITER: { limit: async () => ({ success: true }) },
    ...overrides,
  };
}

describe('ALLOWED_ORIGINS gate', () => {
  it('returns 500 when ALLOWED_ORIGINS is unset', async () => {
    const res = await app.request('/health', {}, makeEnv({ ALLOWED_ORIGINS: '' }));
    expect(res.status).toBe(500);
    expect((await res.json()) as { error: string }).toEqual({
      error: 'Server misconfigured: ALLOWED_ORIGINS not set',
    });
  });

  it('does not gate /health on any other secret', async () => {
    const res = await app.request('/health', {}, makeEnv());
    expect(res.status).toBe(200);
  });
});

describe('per-route-group requireEnv gate', () => {
  it('rejects /spotify/* with a clear message when its secrets are missing', async () => {
    const res = await app.request('/spotify/artists/x', {}, makeEnv({ EXTERNAL_API_CLIENT_ID: '' }));
    expect(res.status).toBe(500);
    expect((await res.json()) as { error: string }).toEqual({
      error: 'Server misconfigured: EXTERNAL_API_CLIENT_ID not set',
    });
  });

  it('lists every missing key, not just the first', async () => {
    const res = await app.request(
      '/spotify/artists/x',
      {},
      makeEnv({ EXTERNAL_API_CLIENT_ID: '', EXTERNAL_API_CLIENT_SECRET: '' })
    );
    expect((await res.json()) as { error: string }).toEqual({
      error: 'Server misconfigured: EXTERNAL_API_CLIENT_ID, EXTERNAL_API_CLIENT_SECRET not set',
    });
  });

  it('rejects /api/* when instant-site secrets are missing', async () => {
    const res = await app.request(
      '/api/templates',
      { headers: { Authorization: 'Bearer embed-token' } },
      makeEnv({ INSTANT_SITE_SESSION_SECRET: '' })
    );
    expect(res.status).toBe(500);
    expect((await res.json()) as { error: string }).toEqual({
      error: 'Server misconfigured: INSTANT_SITE_SESSION_SECRET not set',
    });
  });

  it('rejects /custom-form/* when the relay secrets are missing', async () => {
    const res = await app.request(
      '/custom-form/submit',
      { method: 'POST', body: '{}' },
      makeEnv({ FORM_BACKEND_TOKEN: '' })
    );
    expect(res.status).toBe(500);
    expect((await res.json()) as { error: string }).toEqual({
      error: 'Server misconfigured: FORM_BACKEND_TOKEN not set',
    });
  });

  it('does not gate /placeholder/* on any secret it does not use', async () => {
    const res = await app.request(
      '/placeholder/anything',
      {},
      makeEnv({ EXTERNAL_API_CLIENT_ID: '', DUDA_API_USER: '', FORM_BACKEND_TOKEN: '' })
    );
    // Whatever placeholder itself returns, it must not be the requireEnv 500.
    expect(res.status).not.toBe(500);
  });
});

describe('rate limiter', () => {
  it('returns 429 when the RATE_LIMITER binding reports failure', async () => {
    const res = await app.request(
      '/spotify/anything',
      {},
      makeEnv({ RATE_LIMITER: { limit: async () => ({ success: false }) } })
    );
    expect(res.status).toBe(429);
    expect((await res.json()) as { error: string }).toEqual({ error: 'Too many requests' });
  });

  it('scopes the limiter key per route group, not globally', async () => {
    const seenKeys: string[] = [];
    const env = makeEnv({
      RATE_LIMITER: {
        limit: async ({ key }: { key: string }) => {
          seenKeys.push(key);
          return { success: true };
        },
      },
    });
    await app.request('/spotify/anything', { headers: { 'CF-Connecting-IP': '1.2.3.4' } }, env);
    await app.request('/placeholder/anything', { headers: { 'CF-Connecting-IP': '1.2.3.4' } }, env);
    expect(seenKeys).toContain('spotify:1.2.3.4');
    expect(seenKeys).not.toContain('placeholder:1.2.3.4');
  });
});

describe('app.onError', () => {
  it('returns a JSON 500 when a middleware throws instead of rejecting cleanly', async () => {
    const res = await app.request(
      '/spotify/anything',
      {},
      makeEnv({
        RATE_LIMITER: {
          limit: async () => {
            throw new Error('rate limiter binding unavailable');
          },
        },
      })
    );
    expect(res.status).toBe(500);
    expect((await res.json()) as { error: string }).toEqual({ error: 'rate limiter binding unavailable' });
  });
});
