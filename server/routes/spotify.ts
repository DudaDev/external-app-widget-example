import express, { type Router, type Request, type Response as ExpressResponse } from 'express';
import { TokenManager } from '../lib/tokenManager';

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

// Resolves a proxy path against baseUrl, or null if it escapes the base.
// Blocks path traversal via /../.
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

// Exported for unit testing. Not part of the public API.
export { resolveProxyUrl };

export function createSpotifyRouter(tokenManager: TokenManager, baseUrl: string): Router {
  const router = express.Router();

  // /artists/:id/top-tracks is built from the artist's most recent album because
  // Spotify's native top-tracks endpoint requires user-level OAuth.
  router.get('/artists/:id/top-tracks', async (req: Request, res: ExpressResponse) => {
    const id = req.params['id'] as string | undefined ?? '';
    if (!id || !/^[A-Za-z0-9]{22}$/.test(id)) {
      res.status(400).json({ error: 'Invalid artist ID' });
      return;
    }

    try {
      const accessToken = await tokenManager.getAccessToken();
      const token = `Bearer ${accessToken}`;

      const albumsRes = await fetchWithTimeout(
        `${baseUrl}/artists/${id}/albums?include_groups=album,single&market=US&limit=5`,
        { headers: { Authorization: token } }
      );
      if (!albumsRes.ok) {
        res.status(albumsRes.status).json({ error: `Spotify albums request failed: ${albumsRes.status}` });
        return;
      }
      const albumsData = (await albumsRes.json()) as {
        error?: unknown;
        items?: Array<{ id: string; name: string; images: Array<{ url: string }> }>;
      };

      if (albumsData.error) { res.status(albumsRes.status).json(albumsData); return; }
      if (!albumsData.items?.length) { res.json({ tracks: [] }); return; }

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

      res.json({ tracks });
    } catch {
      // No error.message detail here, even in dev. Matches worker/'s stance:
      // no dev/prod split, so internals never leak either way.
      res.status(500).json({ error: 'Failed to fetch tracks' });
    }
  });

  // Generic GET-only Spotify proxy. Token stays server-side, never sent to the browser.
  router.get('/*splat', async (req: Request, res: ExpressResponse) => {
    const targetUrl = resolveProxyUrl(baseUrl, req.url);
    if (!targetUrl) {
      res.status(400).json({ error: 'Invalid proxy path' });
      return;
    }

    try {
      const accessToken = await tokenManager.getAccessToken();

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
      res.status(response.status).json(data);
    } catch {
      res.status(500).json({ error: 'Proxy request failed' });
    }
  });

  return router;
}
