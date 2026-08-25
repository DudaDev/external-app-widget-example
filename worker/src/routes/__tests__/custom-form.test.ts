import { describe, it, expect, vi, afterEach } from 'vitest';
import app from '../custom-form';
import type { Env } from '../../env';

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

function submit(body: unknown, headers: Record<string, string> = {}) {
  return app.request(
    '/submit',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    },
    makeEnv()
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('POST /submit validation', () => {
  it('rejects a missing field', async () => {
    const res = await submit({ name: 'Jane', email: 'jane@example.com' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'name, email, and message are required' });
  });

  it('rejects a name over the length cap', async () => {
    const res = await submit({ name: 'x'.repeat(201), email: 'jane@example.com', message: 'hello there' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid email', async () => {
    const res = await submit({ name: 'Jane', email: 'not-an-email', message: 'hello there' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'email is invalid' });
  });

  it('rejects a message over the length cap', async () => {
    const res = await submit({ name: 'Jane', email: 'jane@example.com', message: 'x'.repeat(2001) });
    expect(res.status).toBe(400);
  });
});

describe('POST /submit relay', () => {
  it('relays a valid submission and derives siteHost from the Origin header', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchSpy);

    const res = await submit(
      { name: 'Jane', email: 'jane@example.com', message: 'hello there' },
      { Origin: 'https://funkymusicprop.susurrous.dev' }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://forms.example.com/submissions');
    expect(init.method).toBe('POST');
    expect(init.redirect).toBe('manual');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer ingest-token');
    expect(JSON.parse(init.body as string)).toEqual({
      formId: 'custom-form',
      name: 'Jane',
      email: 'jane@example.com',
      message: 'hello there',
      siteHost: 'funkymusicprop.susurrous.dev',
    });
  });

  it('falls back to siteHost "unknown" when there is no Origin or Referer header', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchSpy);

    await submit({ name: 'Jane', email: 'jane@example.com', message: 'hello there' });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).siteHost).toBe('unknown');
  });

  it('returns 502 when form-capture-backend responds with a non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const res = await submit({ name: 'Jane', email: 'jane@example.com', message: 'hello there' });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Failed to deliver submission' });
  });

  it('returns 502 when the relay fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const res = await submit({ name: 'Jane', email: 'jane@example.com', message: 'hello there' });

    expect(res.status).toBe(502);
  });

  it('does not follow redirects from form-capture-backend (a redirected response is not ok)', async () => {
    // fetch's own redirect: 'manual' handling surfaces a 3xx as an opaqueredirect
    // response with ok: false, which the route already treats as a failure.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 0, type: 'opaqueredirect' }));

    const res = await submit({ name: 'Jane', email: 'jane@example.com', message: 'hello there' });

    expect(res.status).toBe(502);
  });
});
