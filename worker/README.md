> **Illustrative Sample Code, Not a Duda Product**
> This code is provided as a non-production proof of concept for illustration only. It is not part of the Duda platform or Services, is not supported or maintained by Duda, and is provided "AS IS" without warranties of any kind.

# Backend Worker (Cloudflare)

Cloudflare Worker port of [`server/`](../server), the Spotify credential
proxy, for production hosting on `YOUR_BACKEND_DOMAIN`. The Express version
in `server/` is unchanged and still what you run locally for `npm run dev`
and ngrok testing. This is a separate deployment target, not a replacement.

The widget bundle itself (`dist/static/js/dm-widget.js`) is **not** part of
this Worker. It's still built via the root `npm run build` and hosted
however you're already hosting it.

## One-time setup

```bash
cd worker
npm install
npx wrangler login          # opens a browser, authorizes wrangler against your Cloudflare account
```

Set secrets (never committed, these are the real Spotify credentials):

```bash
npx wrangler secret put EXTERNAL_API_CLIENT_ID
npx wrangler secret put EXTERNAL_API_CLIENT_SECRET
```

If you're using the Instant Site app, also set (any long random string, it
only needs to be unguessable, not memorable):

```bash
npx wrangler secret put INSTANT_SITE_SESSION_SECRET
```

Edit `wrangler.toml`'s `ALLOWED_ORIGINS` to a comma separated list of the Duda site origins allowed to call this API. See "What this does and doesn't protect against" below.

## Deploy

```bash
npx wrangler deploy
```

This provisions the route on `YOUR_BACKEND_DOMAIN` per `wrangler.toml`
(`custom_domain = true`). The `susurrous.dev` zone must already be active
in this Cloudflare account, or the deploy will fail to attach the domain.

## Local dev

```bash
cp .dev.vars.example .dev.vars   # fill in real values, gitignored
npx wrangler dev
```

## Restricting the subdomain with Cloudflare Access (Zero Trust)

The widget's fetch calls come from anonymous visitor browsers on Duda
sites. They can't complete an interactive login, so gating the whole
hostname behind Access would break the widget. The setup below gates
*everything except* the specific paths the widget actually calls:

1. In the Zero Trust dashboard: **Access → Applications → Add an application → Self-hosted**.
2. Application domain: `YOUR_BACKEND_DOMAIN` (no path, covers the whole hostname).
3. Add a policy named e.g. `Default: require login`, action **Allow**, with your identity provider or email(s) as the rule. This is the fallback for anything not bypassed below.
4. Add a second policy named e.g. `Public API paths`, action **Bypass**, and set it to a **higher priority** than the login policy (Bypass policies must be evaluated first). Scope this policy's **Path** condition to:
   - `/spotify/*`
   - `/placeholder/*`
   - `/custom-form/*`
   - `/api/*`
   - `/health`
5. Save. Requests to those path prefixes skip Access and hit the Worker directly, still protected by its own CORS and rate limiting. Everything else on the hostname now requires SSO login.

This can't be expressed in `wrangler.toml`. Access applications and policies
live in Zero Trust, configured via the dashboard or the Cloudflare API or Terraform.

## What this does and doesn't protect against

- **Credentials**: the Spotify client secret lives only in this Worker's
  secrets store. It's never sent to or readable by the browser.
- **CORS `ALLOWED_ORIGINS`**: blocks cross-origin `fetch`/`XHR` from *browsers*
  on other origins. It does **not** stop a non-browser client, like `curl` or
  a script, from calling the API directly with a forged `Origin` header. CORS
  is enforced by browsers, not by this server.
- **Rate limiting**: applied per `CF-Connecting-IP`, via Cloudflare's native
  Rate Limiting binding, at 30 req/min per route group. `/spotify/*`,
  `/api/*`, and `/custom-form/*` each get their own counter (keyed by
  `<prefix>:<ip>`), so heavy use of one feature can't 429 an unrelated one
  for the same visitor.
- **Access Bypass paths**: only remove the login wall from those specific
  path prefixes. Everything else on `YOUR_BACKEND_DOMAIN` still requires
  your SSO login.
- **`INSTANT_SITE_EMBED_TOKEN`**: passed via a Content Editor field, so it's
  visible to any site visitor, same as every other Content Editor value on
  any widget here. Not a secret, not real access control on its own.
- **`INSTANT_SITE_SESSION_SECRET`**: what actually scopes delete/access-grant
  calls to the site that created them. `POST /sites` mints a short-lived
  HMAC-signed token for the new `siteName`. `DELETE /sites/:siteName` and the
  `accessFor` routes reject any request that can't present a valid one. This
  stops a caller from acting on a site it didn't just create, which rate  limiting and the embed token alone don't.
