> **Illustrative Sample Code, Not a Duda Product**
> This code is provided as a non-production proof of concept for illustration only. It is not part of the Duda platform or Services, is not supported or maintained by Duda, and is provided "AS IS" without warranties of any kind.

# Preview Site (Cloudflare Worker + Assets)

Hosts all 5 apps' widget bundles at stable URLs and a small dashboard for
switching each app between `shared`/`standalone` React-loading mode without
a rebuild. Separate deployment from [`worker/`](../worker) this Worker
serves static bundles and a settings page, `worker/` proxies backend APIs.

No `package.json` of its own. Bundle builds run through the root `vite`
config, only `wrangler` itself is invoked from here, resolved via `npx`.

## One-time setup

```bash
cd preview
npx wrangler login          # if not already authenticated
cp wrangler.toml.example wrangler.toml
```

Edit `wrangler.toml`: set your real domain in `routes`, and create the KV
namespace the settings page reads/writes:

```bash
npx wrangler kv namespace create ext-app-widget-preview-settings
# paste the real id into wrangler.toml's [[kv_namespaces]] block
```

## Build

Two separate outputs both need to exist under `preview/public/` (gitignored,
rebuilt locally) before building the site itself:

```bash
# from the repo root
npm run build:preview-bundles   # bundles/shared/duda-widgets.js + all 5 apps × {shared, standalone}
npm run build:preview-site      # preview/*.html entries → preview/dist/
```

`build:preview-bundles` also runs `build:shared-react`, which builds
`preview/public/bundles/shared/duda-widgets.js` from `shared-react/` at the
repo root: a real React + ReactDOM copy exposed as
`window.__dudaSharedReact`/`__dudaSharedReactDOM`, which every app's
shared-mode `custom-widget-builder.js` borrows via `registerReactShims()`
instead of bundling its own React. Hosting that one file for real Duda
sites (as opposed to this preview site, which serves it itself) is left to
the integrator, it's just a static UMD bundle, host it wherever.

## App metadata (notes and admin links)

`worker-src/types.ts`'s `APP_INFO` is the source of truth for each app's overview-page note and, where relevant, a link to that app's own admin dashboard (e.g. `instant-site`'s links to `instant-site-admin.susurrous.dev`, the separate `duda-instant-site-demo-updated` repo's admin UI, see its README). A future partner pointing this at their own backend deployment should update these values (`note`, `adminUrl`) to match their own domains, then rebuild/redeploy this Worker.

## Deploy

```bash
cd preview
npx wrangler deploy
```

## Local dev

```bash
cd preview
npx wrangler dev
```

## Restricting the settings page with Cloudflare Access (Zero Trust)

`GET /` (the settings/overview page) and `POST /admin/react-mode` should
require login. `GET /react-mode` (read by widget JS at runtime) and
`/bundles/*` (the widget scripts themselves) must stay public, anonymous
Duda visitors load them.

1. **Access → Applications → Add an application → Self-hosted**
   - Domain: `YOUR_WORKER_DOMAIN/react-mode` (exact path, bypasses login)
   - Policy: `Bypass`, include `Everyone`
2. **Add another application**
   - Domain: `YOUR_WORKER_DOMAIN/bundles/*`
   - Policy: `Bypass`, include `Everyone`
3. **Add a third application**
   - Domain: `YOUR_WORKER_DOMAIN` (bare hostname, catches everything else,
     including `/` and `/admin/react-mode`)
   - Policy: `Allow`, include whatever identity rule you use

More specific paths win over the bare-hostname catch-all, so the two bypass
apps above take priority for their own paths.

4. **Point the Worker at the catch-all application**: on that application's
   page, copy its **Application Audience (AUD) tag** (Overview tab) and your
   **team domain** (Settings -> Custom Pages, looks like
   `your-team.cloudflareaccess.com`) into `wrangler.toml`'s `[vars]`:
   ```toml
   [vars]
   ACCESS_TEAM_DOMAIN = "your-team.cloudflareaccess.com"
   ACCESS_AUD = "the-aud-tag-from-the-overview-tab"
   ```
   `hasValidAccessJwt()` verifies the `Cf-Access-Jwt-Assertion` header's
   signature against these, not just that the header is present. Left as
   the placeholder values, every request to `/` and `/admin/react-mode`
   gets a 403, including yours, since nothing will match.

**Important**: this only actually gates the settings page if `workers_dev = false`
is set in `wrangler.toml` (see `wrangler.toml.example`). Without it, the
Worker stays reachable at its default `*.workers.dev` URL too, a hostname
the Access applications above aren't bound to, which would let anyone
bypass Access entirely by hitting that URL directly.

## What this does and doesn't protect against

- **The settings page** (`GET /`, `POST /admin/react-mode`) additionally
  verifies the signature, issuer, audience, and expiry of the
  `Cf-Access-Jwt-Assertion` header Cloudflare Access sets on requests that
  passed through an Access application (against `ACCESS_TEAM_DOMAIN`/
  `ACCESS_AUD`'s JWKS). If the Access setup above is ever removed or
  misconfigured, no request will carry a header that verifies against those
  values, and these routes fail closed with a 403 instead of leaving the
  mode switch open to anyone who sends any non-empty header value.
- **`/bundles/*`** is rate limited per `CF-Connecting-IP` via Cloudflare's
  Rate Limiting binding, since it's necessarily public.
- **`POST /admin/react-mode`** additionally rejects a cross-site `Origin`,
  so a page on another site can't submit this form using the admin's own
  Access session.
- **KV `SETTINGS`** holds only the per-app React-mode string. No PII, no
  secrets.
