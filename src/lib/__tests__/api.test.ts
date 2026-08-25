import { describe, it, expect, vi, afterEach } from 'vitest';
import api, { setBaseURL } from 'src/lib/api';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setBaseURL('');
});

describe('api.get', () => {
  it('resolves with data on a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ name: 'test' }),
    }));
    const result = await api.get<{ name: string }>('/test');
    expect(result.data).toEqual({ name: 'test' });
  });

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(api.get('/test')).rejects.toThrow('HTTP 404');
  });

  it('adds ngrok bypass header when baseURL contains "ngrok"', async () => {
    setBaseURL('https://abc123.ngrok.io');
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchSpy);
    await api.get('/test');
    expect(fetchSpy.mock.calls[0]?.[1]?.headers?.['ngrok-skip-browser-warning']).toBe('1');
  });

  it('aborts the request after the configured timeout elapses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
          { once: true }
        );
      });
    }));
    // timeoutMs: 1 exercises the same code path as the default 8000ms without fake timers
    await expect(api.get('/slow', { timeoutMs: 1 })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('forwards a caller-supplied AbortSignal to fetch', async () => {
    const controller = new AbortController();
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
          { once: true }
        );
      });
    }));
    const promise = api.get('/test', { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('api.post', () => {
  it('resolves with data on a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'abc' }),
    }));
    const result = await api.post<{ id: string }>('/test', { name: 'test' });
    expect(result.data).toEqual({ id: 'abc' });
  });

  it('sends the body as JSON with a Content-Type header', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchSpy);
    await api.post('/test', { name: 'test' });
    expect(fetchSpy.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(fetchSpy.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ name: 'test' }));
    expect(fetchSpy.mock.calls[0]?.[1]?.headers?.['Content-Type']).toBe('application/json');
  });

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(api.post('/test', {})).rejects.toThrow('HTTP 500');
  });

  it('adds ngrok bypass header when baseURL contains "ngrok"', async () => {
    setBaseURL('https://abc123.ngrok.io');
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchSpy);
    await api.post('/test', {});
    expect(fetchSpy.mock.calls[0]?.[1]?.headers?.['ngrok-skip-browser-warning']).toBe('1');
  });

  it('aborts the request after the configured timeout elapses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
          { once: true }
        );
      });
    }));
    await expect(api.post('/slow', {}, { timeoutMs: 1 })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('forwards a caller-supplied AbortSignal to fetch', async () => {
    const controller = new AbortController();
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
          { once: true }
        );
      });
    }));
    const promise = api.post('/test', {}, { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});
