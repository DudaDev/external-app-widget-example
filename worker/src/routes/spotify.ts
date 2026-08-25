import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Env } from '../env';
import { TokenManager } from '../tokenManager';

const FETCH_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const attempt = () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    return fetch(url, { ...options, signal: controller.signal }).finally(() =>
      clearTimeout(timer)
    );
  };

  try {
    return await attempt();
  } catch {
    // Retry once on network-level failures. Non-2xx responses are not retried.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return attempt();
  }
}

// Resolves a proxy path against baseUrl and returns the full URL, or null if the
// resolved URL escapes the base (catches path traversal like /../ sequences).
function resolveProxyUrl(baseUrl: string, rawPath: string): string | null {
  try {
    const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    const relativePath = rawPath.replace(/^\/+/, '');
    const target = new URL(relativePath, base);
    if (!target.href.startsWith(base)) return null;
    return target.href;
  } catch {
    return null;
  }
}

export { resolveProxyUrl };

// Module-level cache. Persists across requests within the same Worker isolate.
let tokenManager: TokenManager | undefined;
function getTokenManager(env: Env): TokenManager {
  if (!tokenManager) {
    tokenManager = new TokenManager(
      env.EXTERNAL_API_CLIENT_ID,
      env.EXTERNAL_API_CLIENT_SECRET,
      'https://accounts.spotify.com/api/token'
    );
  }
  return tokenManager;
}

const app = new Hono<{ Bindings: Env }>();

// /artists/:id/top-tracks is built from the artist's most recent album because
// Spotify's native top-tracks endpoint requires user-level OAuth.
app.get('/artists/:id/top-tracks', async (c) => {
  const id = c.req.param('id') ?? '';
  if (!/^[A-Za-z0-9]{22}$/.test(id)) {
    return c.json({ error: 'Invalid artist ID' }, 400);
  }

  const baseUrl = c.env.EXTERNAL_API_BASE_URL;
  try {
    const accessToken = await getTokenManager(c.env).getAccessToken();
    const token = `Bearer ${accessToken}`;

    const albumsRes = await fetchWithTimeout(
      `${baseUrl}/artists/${id}/albums?include_groups=album,single&market=US&limit=5`,
      { headers: { Authorization: token } }
    );
    if (!albumsRes.ok) {
      return c.json(
        { error: `Spotify albums request failed: ${albumsRes.status}` },
        albumsRes.status as ContentfulStatusCode
      );
    }
    const albumsData = (await albumsRes.json()) as {
      error?: unknown;
      items?: Array<{ id: string; name: string; images: Array<{ url: string }> }>;
    };

    if (albumsData.error) {
      return c.json(albumsData as Record<string, unknown>, albumsRes.status as ContentfulStatusCode);
    }
    if (!albumsData.items?.length) return c.json({ tracks: [] });

    // Scans albums for tracks with preview_url. Spotify deprecated it in 2024,
    // so it's null for most tracks — fetched in parallel since the common
    // case is scanning all 5 before giving up.
    const albumResults = await Promise.all(
      albumsData.items.map(async (album) => {
        const tracksRes = await fetchWithTimeout(
          `${baseUrl}/albums/${album.id}/tracks?market=US&limit=10`,
          { headers: { Authorization: token } }
        );
        if (!tracksRes.ok) return null;
        const tracksData = (await tracksRes.json()) as { items?: Record<string, unknown>[] };
        const withPreviews = (tracksData.items ?? []).filter((t) => t['preview_url']);
        if (withPreviews.length === 0) return null;
        return withPreviews.map((track) => ({
          ...track,
          album: { id: album.id, name: album.name, images: album.images },
        }));
      })
    );
    const tracks = albumResults.find((result) => result !== null) ?? [];

    return c.json({ tracks });
  } catch {
    // No error.message detail here. A deployed Worker has no dev/prod split,
    // so internals never leak either way.
    return c.json({ error: 'Failed to fetch tracks' }, 500);
  }
});

// Generic GET-only Spotify proxy. Token stays server-side, never sent to the browser.
app.get('/*', async (c) => {
  const url = new URL(c.req.url);
  const subPath = url.pathname.replace(/^\/spotify/, '') + url.search;
  const targetUrl = resolveProxyUrl(c.env.EXTERNAL_API_BASE_URL, subPath);
  if (!targetUrl) return c.json({ error: 'Invalid proxy path' }, 400);

  try {
    const accessToken = await getTokenManager(c.env).getAccessToken();

    const response = await fetchWithTimeout(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Read as text first: a non-JSON error body (e.g. a plain-text 429)
    // would otherwise throw here and fall through to a hardcoded 500 below,
    // losing the real upstream status code.
    const raw = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { error: raw || response.statusText };
    }
    return c.json(data as Record<string, unknown>, response.status as ContentfulStatusCode);
  } catch {
    return c.json({ error: 'Proxy request failed' }, 500);
  }
});

export default app;
