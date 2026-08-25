// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { TokenManager } from '../lib/tokenManager';

const TOKEN_URL = 'https://accounts.spotify.com/api/token';

function makeTokenResponse(token = 'tok-abc', expiresIn = 3600) {
  return { ok: true, json: async () => ({ access_token: token, expires_in: expiresIn }) };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('TokenManager.getAccessToken', () => {
  it('fetches a token on the first call', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeTokenResponse()));
    const tm = new TokenManager('id', 'secret', TOKEN_URL);

    const token = await tm.getAccessToken();

    expect(token).toBe('tok-abc');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns the cached token without re-fetching within the expiry window', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeTokenResponse('tok-abc')));
    const tm = new TokenManager('id', 'secret', TOKEN_URL);

    const t1 = await tm.getAccessToken();
    const t2 = await tm.getAccessToken();

    expect(t1).toBe(t2);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent token requests into a single fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeTokenResponse()));
    const tm = new TokenManager('id', 'secret', TOKEN_URL);

    const [t1, t2, t3] = await Promise.all([
      tm.getAccessToken(),
      tm.getAccessToken(),
      tm.getAccessToken(),
    ]);

    expect(t1).toBe('tok-abc');
    expect(t2).toBe('tok-abc');
    expect(t3).toBe('tok-abc');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('re-fetches when the cached token is within 60s of expiry', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(makeTokenResponse('tok-first', 59))  // expires in < 60s
      .mockResolvedValueOnce(makeTokenResponse('tok-second', 3600))
    );
    const tm = new TokenManager('id', 'secret', TOKEN_URL);

    await tm.getAccessToken();           // populates cache with short-lived token
    const token = await tm.getAccessToken(); // should re-fetch

    expect(token).toBe('tok-second');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('throws when the token endpoint returns a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const tm = new TokenManager('id', 'secret', TOKEN_URL);

    await expect(tm.getAccessToken()).rejects.toThrow('Spotify token request failed: 401');
  });

  it('sends Basic auth credentials in the correct format', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(makeTokenResponse());
    vi.stubGlobal('fetch', fetchSpy);
    const tm = new TokenManager('my-id', 'my-secret', TOKEN_URL);

    await tm.getAccessToken();

    const expectedCredentials = Buffer.from('my-id:my-secret').toString('base64');
    expect(fetchSpy.mock.calls[0]?.[1]?.headers?.['Authorization']).toBe(`Basic ${expectedCredentials}`);
  });
});
