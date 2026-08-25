// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createSpotifyRouter } from '../routes/spotify';
import type { TokenManager } from '../lib/tokenManager';

const BASE_URL = 'https://api.spotify.com/v1';

function makeApp(tokenOverride?: string) {
  const tokenManager = {
    getAccessToken: vi.fn().mockResolvedValue(tokenOverride ?? 'test-token-abc'),
  } as unknown as TokenManager;

  const app = express();
  app.use(express.json());
  app.use('/spotify', createSpotifyRouter(tokenManager, BASE_URL));
  return app;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const VALID_ARTIST_ID = '2cCUtGK9sDU2EoElnk0GNB';

describe('GET /spotify/artists/:id/top-tracks', () => {
  it('returns 400 for an artist ID with invalid characters', async () => {
    const res = await request(makeApp()).get('/spotify/artists/not-valid!!/top-tracks');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid artist id/i);
  });

  it('returns 400 for an artist ID that is too short', async () => {
    const res = await request(makeApp()).get('/spotify/artists/tooshort/top-tracks');

    expect(res.status).toBe(400);
  });

  it('returns tracks with album metadata attached', async () => {
    const album = { id: 'album1', name: 'Test Album', images: [{ url: 'https://img.example.com/art.jpg' }] };
    const tracks = [{ id: 'track1', name: 'Track One', duration_ms: 200000, preview_url: 'https://p.scdn.co/mp3-preview/abc123' }];

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [album] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: tracks }) })
    );

    const res = await request(makeApp()).get(`/spotify/artists/${VALID_ARTIST_ID}/top-tracks`);

    expect(res.status).toBe(200);
    expect(res.body.tracks).toHaveLength(1);
    expect(res.body.tracks[0].album.name).toBe('Test Album');
    expect(res.body.tracks[0].album.images).toEqual(album.images);
  });

  it('returns empty tracks when artist has no albums', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
    );

    const res = await request(makeApp()).get(`/spotify/artists/${VALID_ARTIST_ID}/top-tracks`);

    expect(res.status).toBe(200);
    expect(res.body.tracks).toEqual([]);
  });

  it('forwards non-ok album response status from Spotify', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ error: 'Forbidden' }) })
    );

    const res = await request(makeApp()).get(`/spotify/artists/${VALID_ARTIST_ID}/top-tracks`);

    expect(res.status).toBe(403);
  });

  it('returns 500 when the token fetch fails', async () => {
    const tokenManager = {
      getAccessToken: vi.fn().mockRejectedValue(new Error('Token fetch failed')),
    } as unknown as TokenManager;
    const app = express();
    app.use(express.json());
    app.use('/spotify', createSpotifyRouter(tokenManager, BASE_URL));

    const res = await request(app).get(`/spotify/artists/${VALID_ARTIST_ID}/top-tracks`);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch tracks');
  });
});

describe('GET /spotify/* (generic proxy)', () => {

  it('proxies a request and returns the Spotify response', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: VALID_ARTIST_ID, name: 'Test Artist' }),
      })
    );

    const res = await request(makeApp()).get(`/spotify/artists/${VALID_ARTIST_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(VALID_ARTIST_ID);
  });

  it('forwards non-ok status codes from the Spotify API', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: { status: 404, message: 'Not Found' } }),
      })
    );

    const res = await request(makeApp()).get(`/spotify/artists/${VALID_ARTIST_ID}`);

    expect(res.status).toBe(404);
  });

  it('forwards the real status code even when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded',
      })
    );

    const res = await request(makeApp()).get(`/spotify/artists/${VALID_ARTIST_ID}`);

    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Rate limit exceeded');
  });

  it('returns 500 when the Spotify API throws', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
    );

    const res = await request(makeApp()).get(`/spotify/artists/${VALID_ARTIST_ID}`);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Proxy request failed');
  });

  it('returns 500 when the token fetch fails', async () => {
    const tokenManager = {
      getAccessToken: vi.fn().mockRejectedValue(new Error('Token fetch failed')),
    } as unknown as TokenManager;
    const app = express();
    app.use(express.json());
    app.use('/spotify', createSpotifyRouter(tokenManager, BASE_URL));

    const res = await request(app).get(`/spotify/artists/${VALID_ARTIST_ID}`);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Proxy request failed');
  });
});
