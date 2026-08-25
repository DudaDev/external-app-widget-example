// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';

const REQUIRED_ENV = {
  EXTERNAL_API_CLIENT_ID: 'test-id',
  EXTERNAL_API_CLIENT_SECRET: 'test-secret',
  EXTERNAL_API_BASE_URL: 'https://api.spotify.com/v1',
};

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV, ...REQUIRED_ENV };
  delete process.env.NODE_ENV;
  delete process.env.ALLOWED_ORIGINS;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('server/config', () => {
  it('throws when a required env var is missing', async () => {
    delete process.env.EXTERNAL_API_CLIENT_ID;
    await expect(import('../config')).rejects.toThrow(/EXTERNAL_API_CLIENT_ID/);
  });

  it('builds config from env vars when all are present', async () => {
    const config = (await import('../config')).default;
    expect(config.externalApi).toEqual({
      clientId: 'test-id',
      clientSecret: 'test-secret',
      baseUrl: 'https://api.spotify.com/v1',
    });
  });
});

describe('server/app', () => {
  it('throws in production mode when ALLOWED_ORIGINS is unset', async () => {
    process.env.NODE_ENV = 'production';
    await expect(import('../app')).rejects.toThrow(/ALLOWED_ORIGINS/);
  });

  it('responds to GET /health', async () => {
    const app = (await import('../app')).default;
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('allows any origin outside production mode', async () => {
    const app = (await import('../app')).default;
    const res = await request(app).get('/health').set('Origin', 'https://anywhere.example.com');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('rejects a disallowed origin in production mode', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGINS = 'https://my.duda.co';
    const app = (await import('../app')).default;
    const res = await request(app).get('/health').set('Origin', 'https://evil.com');
    expect(res.status).toBe(500);
  });

  it('allows a listed origin in production mode', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGINS = 'https://my.duda.co';
    const app = (await import('../app')).default;
    const res = await request(app).get('/health').set('Origin', 'https://my.duda.co');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://my.duda.co');
  });

  it('rate-limits /spotify/* after 30 requests in the window', async () => {
    const app = (await import('../app')).default;
    // POST isn't a route any router defines under /spotify, so this 404s
    // without ever reaching the network — the limiter (mounted via app.use,
    // ahead of route matching) still counts every one of these requests.
    let lastStatus = 0;
    for (let i = 0; i < 31; i++) {
      lastStatus = (await request(app).post('/spotify/anything')).status;
    }
    expect(lastStatus).toBe(429);
  }, 10000); // 31 sequential requests can be slow under coverage instrumentation
});
