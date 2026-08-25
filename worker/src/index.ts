import { Hono, type Context, type Next } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { Env } from './env';
import { isAllowedOrigin } from './origin';
import spotifyRoutes from './routes/spotify';
import placeholderRoutes from './routes/placeholder';
import instantSiteRoutes from './routes/instant-site';
import customFormRoutes from './routes/custom-form';

const app = new Hono<{ Bindings: Env }>();

app.use('*', secureHeaders());

// ALLOWED_ORIGINS is required. Fail loudly instead of falling back to a wildcard.
//
// ALLOWED_ORIGINS is static for an isolate's lifetime, so parsing it and
// building the cors() middleware on every single request (including
// /health) is pure waste. Cached per isolate, keyed by the raw string so a
// changed value (new deploy, or a differing .dev.vars in local dev) still
// rebuilds it.
let corsCache: { origins: string; middleware: ReturnType<typeof cors> } | null = null;

function getCorsMiddleware(allowedOrigins: string): ReturnType<typeof cors> {
  if (corsCache && corsCache.origins === allowedOrigins) {
    return corsCache.middleware;
  }
  const patterns = allowedOrigins.split(',').map((o) => o.trim()).filter(Boolean);
  const middleware = cors({
    origin: (origin) => (isAllowedOrigin(origin, patterns) ? origin : ''),
  });
  corsCache = { origins: allowedOrigins, middleware };
  return middleware;
}

app.use('*', async (c, next) => {
  if (!c.env.ALLOWED_ORIGINS) {
    return c.json({ error: 'Server misconfigured: ALLOWED_ORIGINS not set' }, 500);
  }
  return getCorsMiddleware(c.env.ALLOWED_ORIGINS)(c, next);
});

app.get('/health', (c) => c.json({ status: 'ok' }));

// Same "fail loudly instead of falling back" reasoning as ALLOWED_ORIGINS
// above, scoped per route group: a missing secret now surfaces as a clear
// 500 at the edge instead of an opaque error from deep inside duda()/
// TokenManager/the relay fetch.
function requireEnv(...keys: (keyof Env)[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const missing = keys.filter((key) => !c.env[key]);
    if (missing.length > 0) {
      return c.json({ error: `Server misconfigured: ${missing.join(', ')} not set` }, 500);
    }
    await next();
    return;
  };
}

// Cloudflare's Rate Limiting binding, not an in-memory counter, since
// counters don't survive across isolates. prefix keeps each route group's
// counter independent, so a visitor rate-limited on one feature doesn't
// also get 429'd on an unrelated one sharing the same IP.
function rateLimited(prefix: string) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
    const { success } = await c.env.RATE_LIMITER.limit({ key: `${prefix}:${ip}` });
    if (!success) return c.json({ error: 'Too many requests' }, 429);
    await next();
    return;
  };
}

app.use('/spotify/*', requireEnv('EXTERNAL_API_CLIENT_ID', 'EXTERNAL_API_CLIENT_SECRET', 'EXTERNAL_API_BASE_URL'));
app.use('/spotify/*', rateLimited('spotify'));
app.route('/spotify', spotifyRoutes);
app.route('/placeholder', placeholderRoutes);

// Creates real Duda accounts and sites.
app.use('/api/*', requireEnv('DUDA_API_USER', 'DUDA_API_PASSWORD', 'DUDA_API_BASE_URL', 'INSTANT_SITE_EMBED_TOKEN', 'INSTANT_SITE_SESSION_SECRET'));
app.use('/api/*', rateLimited('api'));
app.route('/api', instantSiteRoutes);

// Relays to form-capture-backend, a separate repo.
app.use('/custom-form/*', requireEnv('FORM_BACKEND_URL', 'FORM_BACKEND_TOKEN'));
app.use('/custom-form/*', rateLimited('custom-form'));
app.route('/custom-form', customFormRoutes);
// APP add your app's routes here

app.onError((err, c) => {
  const status = 'status' in err && typeof err.status === 'number' ? err.status : 500;
  return c.json({ error: err.message || 'Internal server error' }, status as never);
});

export default app;
