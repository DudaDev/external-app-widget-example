import { Hono, type Context, type Next } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Env } from '../env';

// Proxies to Duda's Partner/Account API, attaching Basic Auth server-side so
// DUDA_API_USER/PASSWORD never reach the browser.
//
// Creates real accounts and sites, called from anonymous browsers. Rate
// limiting (worker/src/index.ts) is one backstop but doesn't scope *which*
// site a caller can act on; INSTANT_SITE_EMBED_TOKEN below arrives via a
// Content Editor field and so isn't a secret either. The site token minted
// in POST /sites and checked in requireSiteToken is what actually proves a
// caller may delete or grant access to a given site, not just any site.
const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  const auth = c.req.header('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || token !== c.env.INSTANT_SITE_EMBED_TOKEN) {
    return c.json({ error: 'Invalid or missing embed token' }, 401);
  }
  await next();
  return;
});

// Stateless capability token: proves the caller is the same session that
// created siteName, without needing server-side storage. exp is embedded and
// signed rather than looked up, so there's nothing to clean up.
const SITE_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// Constant-time compare via digest, since a direct string compare would leak
// timing information about how many leading bytes matched.
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const digest = (s: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  const [da, db] = await Promise.all([digest(a), digest(b)]);
  const [ba, bb] = [new Uint8Array(da), new Uint8Array(db)];
  let diff = ba.length ^ bb.length;
  for (let i = 0; i < Math.max(ba.length, bb.length); i++) {
    diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

async function signSiteToken(env: Env, siteName: string, exp: number): Promise<string> {
  const sig = await hmacSha256(env.INSTANT_SITE_SESSION_SECRET, `${siteName}.${exp}`);
  return `${exp}.${sig}`;
}

async function verifySiteToken(env: Env, siteName: string, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot < 0) return false;
  const exp = Number(token.slice(0, dot));
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = await signSiteToken(env, siteName, exp);
  return timingSafeEqual(expected, token);
}

// Mounted per-path below rather than inlined per-handler, since every route
// under a given :siteName segment needs the identical check.
async function requireSiteToken(c: Context<{ Bindings: Env }>, next: Next) {
  const siteName = c.req.param('siteName') ?? '';
  if (!(await verifySiteToken(c.env, siteName, c.req.header('X-Site-Token')))) {
    return c.json({ error: 'Missing or invalid site token' }, 403);
  }
  await next();
  return;
}

const DUDA_FETCH_TIMEOUT_MS = 10_000;

async function duda(
  env: Env,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: unknown }> {
  const credentials = btoa(`${env.DUDA_API_USER}:${env.DUDA_API_PASSWORD}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DUDA_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${env.DUDA_API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    // Timeout or network failure. No error.message detail here, matching
    // spotify.ts's stance: a deployed Worker has no dev/prod split, so
    // internals never leak either way. Callers already handle any status
    // >= 400 uniformly, so no call site needs to change for this.
    return { status: 502, data: { error: 'Duda API request failed' } };
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return { status: response.status, data: undefined };
  }
  const data = await response.json().catch(() => undefined);
  return { status: response.status, data };
}

// GET /templates?editor=ADVANCED-2.0 -> GET /sites/multiscreen/templates
// Duda's template catalog changes rarely, but every TemplatePicker mount
// hit this live otherwise — same reasoning as the CORS-middleware cache in
// index.ts and the settings cache in preview/worker-src/settingsCache.ts.
const TEMPLATES_CACHE_TTL_MS = 5 * 60 * 1000;
let templatesCache: { query: string; data: unknown; expiresAt: number } | null = null;

app.get('/templates', async (c) => {
  const query = c.req.query();
  const search = new URLSearchParams(query).toString();

  if (templatesCache && templatesCache.query === search && templatesCache.expiresAt > Date.now()) {
    return c.json(templatesCache.data as Record<string, unknown>);
  }

  const { status, data } = await duda(
    c.env,
    'GET',
    `/sites/multiscreen/templates${search ? `?${search}` : ''}`
  );
  if (status < 400) {
    templatesCache = { query: search, data, expiresAt: Date.now() + TEMPLATES_CACHE_TTL_MS };
  }
  return c.json(data as Record<string, unknown>, status as ContentfulStatusCode);
});

// POST /sites { templateId } -> POST /sites/multiscreen/create { template_alias }
app.post('/sites', async (c) => {
  const body = await c.req.json<{ templateId?: string }>().catch(() => ({}) as { templateId?: string });
  if (!body.templateId) return c.json({ error: 'templateId is required' }, 400);

  const { status, data } = await duda(c.env, 'POST', '/sites/multiscreen/create', {
    template_alias: body.templateId,
  });
  if (status >= 400) return c.json(data as Record<string, unknown>, status as ContentfulStatusCode);
  const result = data as { site_name?: string };
  const siteName = result.site_name ?? '';
  const siteToken = await signSiteToken(c.env, siteName, Date.now() + SITE_TOKEN_TTL_MS);
  return c.json({ siteName, siteToken });
});

app.use('/sites/:siteName', requireSiteToken);

// PATCH /sites/:siteName <contentLibrary> -> POST /sites/multiscreen/{site}/content
app.patch('/sites/:siteName', async (c) => {
  const siteName = c.req.param('siteName');
  const contentLibrary = await c.req.json().catch(() => ({}));
  const { status, data } = await duda(
    c.env,
    'POST',
    `/sites/multiscreen/${encodeURIComponent(siteName)}/content`,
    contentLibrary
  );
  if (status >= 400) return c.json(data as Record<string, unknown>, status as ContentfulStatusCode);
  return c.json({ status: 'ok' });
});

// DELETE /sites/:siteName -> DELETE /sites/multiscreen/{site}
app.delete('/sites/:siteName', async (c) => {
  const siteName = c.req.param('siteName');
  const { status, data } = await duda(
    c.env,
    'DELETE',
    `/sites/multiscreen/${encodeURIComponent(siteName)}`
  );
  if (status >= 400) return c.json(data as Record<string, unknown>, status as ContentfulStatusCode);
  return c.body(null, 204);
});

// POST /users { userId, email, firstName, lastName } -> POST /accounts/create
app.post('/users', async (c) => {
  const body = await c
    .req.json<{ userId?: string; email?: string; firstName?: string; lastName?: string }>()
    .catch(() => ({}) as { userId?: string; email?: string; firstName?: string; lastName?: string });
  if (!body.userId) return c.json({ error: 'userId is required' }, 400);

  const { status, data } = await duda(c.env, 'POST', '/accounts/create', {
    account_name: body.userId,
    email: body.email,
    first_name: body.firstName,
    last_name: body.lastName,
  });
  if (status >= 400) return c.json(data as Record<string, unknown>, status as ContentfulStatusCode);
  return c.json({ userId: body.userId });
});

// POST /users/:userId/accessFor/:siteName -> POST /accounts/{account}/sites/{site}/permissions
// Client sends no permission list (see api.ts's grantUserAccess), so this
// grants a fixed default set. Duda's API rejects PUBLISH unless granted
// alongside both LIMITED_EDITING and REPUBLISH — confirmed against the live
// API, which returned "Permission 'PUBLISH' must be granted with
// permissions : [LIMITED_EDITING, REPUBLISH]" for the previous ['EDIT',
// 'PUBLISH'] set.
const DEFAULT_ACCESS_PERMISSIONS = ['LIMITED_EDITING', 'PUBLISH', 'REPUBLISH'];

app.use('/users/:userId/accessFor/:siteName', requireSiteToken);

app.post('/users/:userId/accessFor/:siteName', async (c) => {
  const userId = c.req.param('userId');
  const siteName = c.req.param('siteName');
  const { status, data } = await duda(
    c.env,
    'POST',
    `/accounts/${encodeURIComponent(userId)}/sites/${encodeURIComponent(siteName)}/permissions`,
    { permissions: DEFAULT_ACCESS_PERMISSIONS }
  );
  if (status >= 400) return c.json(data as Record<string, unknown>, status as ContentfulStatusCode);
  return c.body(null, 204);
});

// GET /users/:userId/accessFor/:siteName -> GET /accounts/sso/{account}/link
app.get('/users/:userId/accessFor/:siteName', async (c) => {
  const userId = c.req.param('userId');
  const siteName = c.req.param('siteName');
  const { status, data } = await duda(
    c.env,
    'GET',
    `/accounts/sso/${encodeURIComponent(userId)}/link?site_name=${encodeURIComponent(siteName)}&target=EDITOR`
  );
  return c.json(data as Record<string, unknown>, status as ContentfulStatusCode);
});

interface GenerateSiteInput {
  businessName: string;
  businessDescription: string;
  businessCategory: string;
  logoUrl?: string;
  serviceArea?: string;
  toneOfVoice?: string;
  phoneNumber?: string;
  email?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  templateAlias?: string;
  instructions?: string;
  maxPages?: number;
  lang?: string;
  themeColors?: Array<{ id: string; label: string; value: string }>;
}

// POST /generate <GenerateSiteInput> -> POST /async-tasks/generate-site-with-ai
app.post('/generate', async (c) => {
  const input = await c.req.json<GenerateSiteInput>().catch(() => ({}) as GenerateSiteInput);

  const hasAddress = input.street || input.city || input.state || input.country || input.zipCode;
  const { status, data } = await duda(c.env, 'POST', '/async-tasks/generate-site-with-ai', {
    business_data: {
      name: input.businessName,
      description: input.businessDescription,
      category: input.businessCategory,
      tone_of_voice: input.toneOfVoice,
      logo_url: input.logoUrl,
      service_area: input.serviceArea,
    },
    additional_ai_context: {
      instructions: input.instructions,
      max_pages: input.maxPages,
    },
    site_data: {
      site_business_info: {
        business_name: input.businessName,
        phone_number: input.phoneNumber,
        email: input.email,
        ...(hasAddress
          ? {
              address: {
                street: input.street,
                city: input.city,
                state: input.state,
                country: input.country,
                zip_code: input.zipCode,
              },
            }
          : {}),
      },
    },
    template_alias: input.templateAlias,
    lang: input.lang,
    theme: input.themeColors ? { colors: input.themeColors } : undefined,
  });

  return c.json(data as Record<string, unknown>, status as ContentfulStatusCode);
});

// GET /generate/:taskId -> GET /async-tasks/{taskId}
//
// The AI-generation flow never calls POST /sites, so without this, the site
// it creates would have no site token at all — grantUserAccess/getSSOLink/
// deleteSite would all 403 for it later. Minting one here, the first place a
// site_name becomes known, closes that gap the same way POST /sites does.
app.get('/generate/:taskId', async (c) => {
  const taskId = c.req.param('taskId');
  const { status, data } = await duda(c.env, 'GET', `/async-tasks/${encodeURIComponent(taskId)}`);
  if (status >= 400) return c.json(data as Record<string, unknown>, status as ContentfulStatusCode);

  const task = data as { status?: string; result?: { site_name?: string } };
  if (task.status === 'COMPLETED' && task.result?.site_name) {
    const siteToken = await signSiteToken(c.env, task.result.site_name, Date.now() + SITE_TOKEN_TTL_MS);
    return c.json({ ...(data as Record<string, unknown>), siteToken });
  }
  return c.json(data as Record<string, unknown>, status as ContentfulStatusCode);
});

export default app;
