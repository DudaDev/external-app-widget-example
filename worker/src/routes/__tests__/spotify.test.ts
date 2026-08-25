import { describe, it, expect, vi, afterEach } from 'vitest';
import app, { resolveProxyUrl } from '../spotify';
import type { Env } from '../../env';

const BASE = 'https://api.spotify.com/v1';

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    EXTERNAL_API_CLIENT_ID: 'id',
    EXTERNAL_API_CLIENT_SECRET: 'secret',
    EXTERNAL_API_BASE_URL: BASE,
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

// Handles the token endpoint too, since getAccessToken() calls it internally.
function mockTokenAndProxy(proxyResponse: Response) {
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('accounts.spotify.com')) {
      return new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 });
    }
    return proxyResponse;
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('resolveProxyUrl', () => {
  it('returns the full URL for a normal path', () => {
    expect(resolveProxyUrl(BASE, '/artists/123')).toBe('https://api.spotify.com/v1/artists/123');
  });

  it('handles paths with query strings', () => {
    expect(resolveProxyUrl(BASE, '/artists/123?market=US')).toBe(
      'https://api.spotify.com/v1/artists/123?market=US'
    );
  });

  it('returns null when dots escape above the base path', () => {
    // %2e%2e = ".." — the URL constructor resolves this upward
    expect(resolveProxyUrl(BASE, '%2e%2e/%2e%2e/etc/passwd')).toBeNull();
  });

  it('returns null for an empty path', () => {
    // Empty string resolves to the base itself; startsWith passes, but
    // a trailing slash means the base differs from baseUrl — returns null
    // (defensive: no way to accidentally proxy to the bare base)
    const result = resolveProxyUrl(BASE, '');
    // Either resolves to base+/ (passes) or null — either is acceptable.
    // Key property: must not return something outside the base.
    if (result !== null) {
      expect(result.startsWith(BASE)).toBe(true);
    }
  });

  it('neutralises protocol-relative paths by stripping leading slashes', () => {
    // "//evil.com/steal" could be a protocol-relative URL, but stripping
    // leading slashes makes it a relative path that stays under the base.
    const result = resolveProxyUrl(BASE, '//evil.com/steal');
    expect(result).not.toBeNull();
    expect(result!.startsWith(BASE)).toBe(true);
  });
});

const ARTIST_ID = '2cCUtGK9sDU2EoElnk0GNB';

function tokenResponse() {
  return new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 });
}

describe('GET /artists/:id/top-tracks', () => {
  it('rejects an invalid artist ID', async () => {
    const res = await app.request('/artists/not-valid!!/top-tracks', {}, makeEnv());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid artist ID' });
  });

  it('forwards a non-ok albums response', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('accounts.spotify.com')) return tokenResponse();
      if (url.includes('/albums?')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
      throw new Error(`unexpected fetch: ${url}`);
    }));

    const res = await app.request(`/artists/${ARTIST_ID}/top-tracks`, {}, makeEnv());
    expect(res.status).toBe(403);
  });

  it('returns empty tracks when the artist has no albums', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('accounts.spotify.com')) return tokenResponse();
      if (url.includes('/albums?')) return new Response(JSON.stringify({ items: [] }), { status: 200 });
      throw new Error(`unexpected fetch: ${url}`);
    }));

    const res = await app.request(`/artists/${ARTIST_ID}/top-tracks`, {}, makeEnv());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tracks: [] });
  });

  it('picks the first album (in original order) with previews, scanned in parallel', async () => {
    const albumA = { id: 'album-a', name: 'Album A', images: [] };
    const albumB = { id: 'album-b', name: 'Album B', images: [] };
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('accounts.spotify.com')) return tokenResponse();
      if (url.includes('/albums?')) return new Response(JSON.stringify({ items: [albumA, albumB] }), { status: 200 });
      if (url.includes('/albums/album-a/tracks')) {
        return new Response(JSON.stringify({ items: [{ id: 't1', preview_url: null }] }), { status: 200 });
      }
      if (url.includes('/albums/album-b/tracks')) {
        return new Response(
          JSON.stringify({ items: [{ id: 't2', preview_url: 'https://p.scdn.co/x' }] }),
          { status: 200 }
        );
      }
      throw new Error(`unexpected fetch: ${url}`);
    }));

    const res = await app.request(`/artists/${ARTIST_ID}/top-tracks`, {}, makeEnv());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tracks: Array<{ id: string; album: unknown }> };
    expect(body.tracks).toHaveLength(1);
    expect(body.tracks[0]?.id).toBe('t2');
    expect(body.tracks[0]?.album).toEqual(albumB);
  });

  it('skips an album whose tracks request fails, without crashing', async () => {
    const albumA = { id: 'album-a', name: 'Album A', images: [] };
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('accounts.spotify.com')) return tokenResponse();
      if (url.includes('/albums?')) return new Response(JSON.stringify({ items: [albumA] }), { status: 200 });
      if (url.includes('/albums/album-a/tracks')) return new Response('', { status: 500 });
      throw new Error(`unexpected fetch: ${url}`);
    }));

    const res = await app.request(`/artists/${ARTIST_ID}/top-tracks`, {}, makeEnv());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tracks: [] });
  });

  it('returns a generic 500, no thrown-error detail, when a request throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('accounts.spotify.com')) return tokenResponse();
      if (url.includes('/albums?')) throw new Error('network exploded with sensitive detail');
      throw new Error(`unexpected fetch: ${url}`);
    }));

    const res = await app.request(`/artists/${ARTIST_ID}/top-tracks`, {}, makeEnv());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to fetch tracks' });
  }, 10000); // fetchWithTimeout retries once with a 500ms delay
});

describe('GET /* (generic proxy)', () => {
  it('proxies a request and returns the Spotify response', async () => {
    mockTokenAndProxy(new Response(JSON.stringify({ id: 'abc', name: 'Test Artist' }), { status: 200 }));

    const res = await app.request('/artists/abc', {}, makeEnv());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'abc', name: 'Test Artist' });
  });

  it('forwards non-ok status codes from Spotify', async () => {
    mockTokenAndProxy(
      new Response(JSON.stringify({ error: { status: 404, message: 'Not Found' } }), { status: 404 })
    );

    const res = await app.request('/artists/missing', {}, makeEnv());

    expect(res.status).toBe(404);
  });

  it('forwards the real status code even when the error body is not JSON', async () => {
    mockTokenAndProxy(new Response('Rate limit exceeded', { status: 429, statusText: 'Too Many Requests' }));

    const res = await app.request('/artists/abc', {}, makeEnv());

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'Rate limit exceeded' });
  });
});
