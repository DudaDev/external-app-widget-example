import { describe, it, expect, vi, afterEach } from 'vitest';
import app from '../instant-site';
import type { Env } from '../../env';

const EMBED_TOKEN = 'embed-token';
const SESSION_SECRET = 'session-secret';

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    EXTERNAL_API_CLIENT_ID: 'id',
    EXTERNAL_API_CLIENT_SECRET: 'secret',
    EXTERNAL_API_BASE_URL: 'https://api.spotify.com/v1',
    ALLOWED_ORIGINS: 'my.duda.co',
    DUDA_API_USER: 'user',
    DUDA_API_PASSWORD: 'pass',
    DUDA_API_BASE_URL: 'https://api.duda.co/api',
    INSTANT_SITE_EMBED_TOKEN: EMBED_TOKEN,
    INSTANT_SITE_SESSION_SECRET: SESSION_SECRET,
    FORM_BACKEND_URL: 'https://forms.example.com',
    FORM_BACKEND_TOKEN: 'ingest-token',
    RATE_LIMITER: { limit: async () => ({ success: true }) },
    ...overrides,
  };
}

function req(path: string, init: RequestInit = {}, env: Env = makeEnv()) {
  return app.request(
    path,
    {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${EMBED_TOKEN}`, ...init.headers },
    },
    env
  );
}

function mockDuda(status: number, data: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(data === undefined ? null : JSON.stringify(data), {
      status,
      headers: data === undefined ? { 'content-length': '0' } : {},
    })
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('embed token middleware', () => {
  it('rejects a request with no Authorization header', async () => {
    const res = await app.request('/templates', {}, makeEnv());
    expect(res.status).toBe(401);
  });

  it('rejects a request with the wrong token', async () => {
    const res = await app.request(
      '/templates',
      { headers: { Authorization: 'Bearer wrong-token' } },
      makeEnv()
    );
    expect(res.status).toBe(401);
  });
});

describe('GET /templates', () => {
  it('relays the query string and forwards the Duda response', async () => {
    vi.stubGlobal('fetch', mockDuda(200, { items: [{ template_id: 1 }] }));
    const res = await req('/templates?editor=ADVANCED-2.0');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [{ template_id: 1 }] });
  });

  it('caches a successful response and does not re-fetch for the same query', async () => {
    const dudaFetch = mockDuda(200, { items: [{ template_id: 'cached-1' }] });
    vi.stubGlobal('fetch', dudaFetch);
    const first = await req('/templates?editor=CACHE-TEST');
    expect(await first.json()).toEqual({ items: [{ template_id: 'cached-1' }] });
    expect(dudaFetch).toHaveBeenCalledTimes(1);

    // A different mock — if this response leaks through, the cache didn't hold.
    vi.stubGlobal('fetch', mockDuda(200, { items: [{ template_id: 'should-not-appear' }] }));
    const second = await req('/templates?editor=CACHE-TEST');
    expect(await second.json()).toEqual({ items: [{ template_id: 'cached-1' }] });
  });

  it('does not cache an error response', async () => {
    vi.stubGlobal('fetch', mockDuda(500, { error: 'boom' }));
    const first = await req('/templates?editor=ERROR-TEST');
    expect(first.status).toBe(500);

    vi.stubGlobal('fetch', mockDuda(200, { items: [] }));
    const second = await req('/templates?editor=ERROR-TEST');
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ items: [] });
  });
});

describe('POST /sites', () => {
  it('rejects a missing templateId', async () => {
    const res = await req('/sites', { method: 'POST', body: JSON.stringify({}) });
    expect(res.status).toBe(400);
  });

  it('creates a site and returns a siteToken alongside siteName', async () => {
    vi.stubGlobal('fetch', mockDuda(200, { site_name: 'my-new-site' }));
    const res = await req('/sites', { method: 'POST', body: JSON.stringify({ templateId: 'tpl-1' }) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { siteName: string; siteToken: string };
    expect(body.siteName).toBe('my-new-site');
    expect(typeof body.siteToken).toBe('string');
    expect(body.siteToken.length).toBeGreaterThan(0);
  });

  it('forwards a Duda error status without minting a token', async () => {
    vi.stubGlobal('fetch', mockDuda(422, { error: 'bad template' }));
    const res = await req('/sites', { method: 'POST', body: JSON.stringify({ templateId: 'tpl-1' }) });
    expect(res.status).toBe(422);
    expect(await res.json()).not.toHaveProperty('siteToken');
  });
});

async function createSite(siteName: string): Promise<string> {
  vi.stubGlobal('fetch', mockDuda(200, { site_name: siteName }));
  const res = await req('/sites', { method: 'POST', body: JSON.stringify({ templateId: 'tpl-1' }) });
  const body = (await res.json()) as { siteToken: string };
  return body.siteToken;
}

describe('DELETE /sites/:siteName — site token ownership check', () => {
  it('rejects with no site token', async () => {
    const res = await req('/sites/some-site', { method: 'DELETE' });
    expect(res.status).toBe(403);
  });

  it('rejects a garbage site token', async () => {
    const res = await req('/sites/some-site', {
      method: 'DELETE',
      headers: { 'X-Site-Token': 'not-a-real-token' },
    });
    expect(res.status).toBe(403);
  });

  it('rejects a valid token minted for a DIFFERENT site — the actual ownership bug this closes', async () => {
    const tokenForSiteA = await createSite('site-a');
    vi.stubGlobal('fetch', mockDuda(204, undefined));
    const res = await req('/sites/site-b', {
      method: 'DELETE',
      headers: { 'X-Site-Token': tokenForSiteA },
    });
    expect(res.status).toBe(403);
  });

  it('accepts the token minted for the same site and deletes it', async () => {
    const token = await createSite('site-a');
    const dudaFetch = mockDuda(204, undefined);
    vi.stubGlobal('fetch', dudaFetch);
    const res = await req('/sites/site-a', { method: 'DELETE', headers: { 'X-Site-Token': token } });
    expect(res.status).toBe(204);
    expect(dudaFetch).toHaveBeenCalledWith(
      expect.stringContaining('/sites/multiscreen/site-a'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('rejects an expired token even for the right site', async () => {
    // Forge an expired token using the same signing scheme the route uses,
    // rather than reaching into route internals.
    const exp = Date.now() - 1000;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`site-a.${exp}`));
    const expiredToken = `${exp}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;

    const res = await req('/sites/site-a', {
      method: 'DELETE',
      headers: { 'X-Site-Token': expiredToken },
    });
    expect(res.status).toBe(403);
  });
});

describe('PATCH /sites/:siteName — site token ownership check', () => {
  it('rejects with no site token', async () => {
    const res = await req('/sites/site-a', { method: 'PATCH', body: JSON.stringify({ pages: [] }) });
    expect(res.status).toBe(403);
  });

  it('rejects a token minted for a different site', async () => {
    const tokenForSiteA = await createSite('site-a');
    const res = await req('/sites/site-b', {
      method: 'PATCH',
      headers: { 'X-Site-Token': tokenForSiteA },
      body: JSON.stringify({ pages: [] }),
    });
    expect(res.status).toBe(403);
  });

  it('relays the content library and returns ok when the site token matches', async () => {
    const token = await createSite('site-a');
    vi.stubGlobal('fetch', mockDuda(200, { status: 'ok' }));
    const res = await req('/sites/site-a', {
      method: 'PATCH',
      headers: { 'X-Site-Token': token },
      body: JSON.stringify({ pages: [] }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});

describe('POST /users', () => {
  it('rejects a missing userId', async () => {
    const res = await req('/users', { method: 'POST', body: JSON.stringify({}) });
    expect(res.status).toBe(400);
  });

  it('creates an account and echoes userId', async () => {
    vi.stubGlobal('fetch', mockDuda(200, { account_name: 'me@example.com' }));
    const res = await req('/users', {
      method: 'POST',
      body: JSON.stringify({ userId: 'me@example.com', email: 'me@example.com' }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: 'me@example.com' });
  });
});

describe('accessFor routes — site token ownership check', () => {
  it('POST rejects with no site token', async () => {
    const res = await req('/users/me/accessFor/site-a', { method: 'POST' });
    expect(res.status).toBe(403);
  });

  it('POST rejects a token minted for a different site', async () => {
    const tokenForSiteA = await createSite('site-a');
    const res = await req('/users/me/accessFor/site-b', {
      method: 'POST',
      headers: { 'X-Site-Token': tokenForSiteA },
    });
    expect(res.status).toBe(403);
  });

  it('POST grants access when the site token matches', async () => {
    const token = await createSite('site-a');
    vi.stubGlobal('fetch', mockDuda(204, undefined));
    const res = await req('/users/me/accessFor/site-a', {
      method: 'POST',
      headers: { 'X-Site-Token': token },
    });
    expect(res.status).toBe(204);
  });

  it('POST sends a permission set Duda actually accepts for PUBLISH', async () => {
    // Regression test: Duda's live API rejects PUBLISH unless granted
    // alongside both LIMITED_EDITING and REPUBLISH — confirmed directly
    // against the real API, which 400'd the previous ['EDIT', 'PUBLISH']
    // default with "Permission 'PUBLISH' must be granted with permissions :
    // [LIMITED_EDITING, REPUBLISH]".
    const token = await createSite('site-a');
    const fetchMock = mockDuda(204, undefined);
    vi.stubGlobal('fetch', fetchMock);
    await req('/users/me/accessFor/site-a', {
      method: 'POST',
      headers: { 'X-Site-Token': token },
    });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { permissions: string[] };
    expect(body.permissions).toEqual(expect.arrayContaining(['LIMITED_EDITING', 'PUBLISH', 'REPUBLISH']));
  });

  it('GET rejects with no site token', async () => {
    const res = await req('/users/me/accessFor/site-a', { method: 'GET' });
    expect(res.status).toBe(403);
  });

  it('GET returns the SSO link when the site token matches', async () => {
    const token = await createSite('site-a');
    vi.stubGlobal('fetch', mockDuda(200, { url: 'https://my.duda.co/sso' }));
    const res = await req('/users/me/accessFor/site-a', {
      method: 'GET',
      headers: { 'X-Site-Token': token },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://my.duda.co/sso' });
  });
});

describe('POST /generate and GET /generate/:taskId', () => {
  it('kicks off generation and forwards the task response', async () => {
    vi.stubGlobal('fetch', mockDuda(200, { id: 'task-1', status: 'STARTED' }));
    const res = await req('/generate', { method: 'POST', body: JSON.stringify({ businessName: 'Acme' }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'task-1', status: 'STARTED' });
  });

  it('polls a task by id', async () => {
    vi.stubGlobal('fetch', mockDuda(200, { id: 'task-1', status: 'COMPLETED' }));
    const res = await req('/generate/task-1', { method: 'GET' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'task-1', status: 'COMPLETED' });
  });

  it('mints a site token once a completed task reports a site_name, so the AI flow can grant access later', async () => {
    vi.stubGlobal(
      'fetch',
      mockDuda(200, { id: 'task-1', status: 'COMPLETED', result: { site_name: 'ai-site' } })
    );
    const res = await req('/generate/task-1', { method: 'GET' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { siteToken: string; result: { site_name: string } };
    expect(body.result.site_name).toBe('ai-site');
    expect(typeof body.siteToken).toBe('string');
    expect(body.siteToken.length).toBeGreaterThan(0);

    // The minted token actually works against the site it names.
    vi.stubGlobal('fetch', mockDuda(204, undefined));
    const deleteRes = await req('/sites/ai-site', {
      method: 'DELETE',
      headers: { 'X-Site-Token': body.siteToken },
    });
    expect(deleteRes.status).toBe(204);
  });

  it('does not mint a site token for a still-pending task', async () => {
    vi.stubGlobal('fetch', mockDuda(200, { id: 'task-1', status: 'STARTED' }));
    const res = await req('/generate/task-1', { method: 'GET' });
    expect(await res.json()).not.toHaveProperty('siteToken');
  });

  it('does not mint a site token when the upstream task lookup fails', async () => {
    vi.stubGlobal('fetch', mockDuda(404, { error: 'not found' }));
    const res = await req('/generate/task-1', { method: 'GET' });
    expect(res.status).toBe(404);
    expect(await res.json()).not.toHaveProperty('siteToken');
  });
});
