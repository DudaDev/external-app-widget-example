import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { APPS, isAppName, type AppName, type Env, type ReactMode } from './types';
import { getReactModes, saveReactModes } from './settingsCache';
import { rootPage } from './rootPage';

const DEFAULT_REACT_MODE: ReactMode = 'shared';

// Verifies the JWT's signature/issuer/audience/expiry rather than just
// checking it's present: a presence-only check is only as safe as the
// Access application binding staying correctly configured forever, and that
// binding has already gone missing on a sibling project's domain once
// before without anyone noticing until a browser warning surfaced it.
const jwksByTeamDomain = new Map<string, JWTVerifyGetKey>();
function jwksFor(teamDomain: string): JWTVerifyGetKey {
  let jwks = jwksByTeamDomain.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    jwksByTeamDomain.set(teamDomain, jwks);
  }
  return jwks;
}

async function hasValidAccessJwt(request: Request, env: Env): Promise<boolean> {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return false;
  try {
    await jwtVerify(token, jwksFor(env.ACCESS_TEAM_DOMAIN), {
      issuer: `https://${env.ACCESS_TEAM_DOMAIN}`,
      audience: env.ACCESS_AUD,
    });
    return true;
  } catch {
    return false;
  }
}

// Serves preview/dist as static assets, plus a few dynamic routes:
//   GET  /                       app previews and the react-mode settings
//                                form, behind Access login
//   GET  /react-mode?app=<name>  public, Access-bypassed. Read by widget
//                                JS at runtime to pick a bundle.
//   POST /admin/react-mode       separate path from the GET above. Access
//                                bypass matches by path, not method, so
//                                reusing /react-mode would make writes
//                                public too.
//
// /bundles/* are the production widget scripts, loaded cross-origin by
// anonymous visitors. Can't sit behind Access or be CORS-restricted.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/react-mode' && request.method === 'GET') {
      const appParam = url.searchParams.get('app');
      const modes = await getReactModes(env);
      const mode = isAppName(appParam) ? modes[appParam] : DEFAULT_REACT_MODE;
      // Shape is `{ mode: ReactMode }`. Every custom-widget-builder.js file's
      // `settings.mode === 'standalone'` check depends on this exact field
      // name. Renaming it here breaks every widget silently (falls back to
      // "shared", no error).
      return new Response(JSON.stringify({ mode }), {
        headers: {
          'Content-Type': 'application/json',
          // Public, non-sensitive data. Wildcard origin is fine.
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=30',
        },
      });
    }

    if ((url.pathname === '/' || url.pathname === '/admin/react-mode') && !(await hasValidAccessJwt(request, env))) {
      return new Response('Forbidden', { status: 403 });
    }

    if (url.pathname === '/admin/react-mode' && request.method === 'POST') {
      // CSRF check: a cross-site page could otherwise submit this form using
      // the admin's own Access session cookie. Browsers set Origin on
      // cross-site POSTs. No Origin at all means we can't prove it's
      // cross-site, so this doesn't block on its absence.
      const origin = request.headers.get('Origin');
      if (origin) {
        const sameOrigin = URL.canParse(origin) && new URL(origin).host === url.host;
        if (!sameOrigin) return new Response('Forbidden', { status: 403 });
      }

      const form = await request.formData();
      const modes = {} as Record<AppName, ReactMode>;
      for (const app of APPS) {
        modes[app] = form.get(app) === 'standalone' ? 'standalone' : 'shared';
      }
      await saveReactModes(env, modes);
      return new Response(null, { status: 303, headers: { Location: '/' } });
    }

    if (url.pathname === '/' && request.method === 'GET') {
      const modes = await getReactModes(env);
      return new Response(rootPage(modes), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const isBundle = url.pathname.startsWith('/bundles/');

    // The ngrok-bypass header forces a CORS preflight. Without a response
    // here the widget never renders.
    if (isBundle && request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'ngrok-skip-browser-warning',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (isBundle) {
      const key = request.headers.get('CF-Connecting-IP') ?? 'unknown';
      const { success } = await env.RATE_LIMITER.limit({ key });
      if (!success) return new Response('Too many requests', { status: 429 });
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'no-referrer');
    if (isBundle) {
      // Short client cache so redeploys reach widgets fast. Long edge cache
      // absorbs most traffic.
      headers.set('Cache-Control', 'public, max-age=60, s-maxage=3600');
      // Loaded via fetch()+blob, so it's subject to CORS unlike a plain
      // script tag. Public content, wildcard is fine.
      headers.set('Access-Control-Allow-Origin', '*');
    }

    return new Response(response.body, { status: response.status, headers });
  },
};
