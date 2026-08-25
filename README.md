> **Illustrative Sample Code, Not a Duda Product**
> This code is provided as a non-production proof of concept for illustration only. It is not part of the Duda platform or Services, is not supported or maintained by Duda, and is provided "AS IS" without warranties of any kind.

# Duda External App Powered Custom Widget Example Skeleton

A starting point for building a **Duda custom widget powered by an external app**.

Built with React + Vite (frontend widget) and Express (backend middleware). Read more about the pattern in the [Duda developer docs](https://developer.duda.co/docs/custom-widget-powered-by-an-external-app).

---

## Architecture

```
Duda Editor / live site
  │  renderExternalApp(scriptSrc, container, props)
Widget Bundle (dist/static/js/dm-widget.js)     <- you host this
  │  init({ container, props })
React App (src/)
  │  fetch /my-app/*
Backend: worker/ (Cloudflare Worker) or server/ (Express)   <- you host this (optional, not needed for collection-search)
  │  exchanges credentials, proxies API calls
External API
```

`worker/` and `server/` are two independent implementations of the same backend pattern, one for Cloudflare, one plain Express, not a primary/fallback pair. Pick whichever fits your hosting, or delete the other.

---

## Project Structure

```
/
├── src/                              # React widget (frontend)
│   ├── apps/
│   │   ├── instant-site/             # AI-powered instant site creator (Duda site generation API)
│   │   │   ├── index.tsx             # App root: MUI theme + ScopedCssBaseline + ErrorBoundary
│   │   │   ├── Widget.tsx            # Step machine (start -> form -> success)
│   │   │   ├── types.ts              # InstantSiteErrorContext, shared by every step component's onError
│   │   │   ├── api/api.ts            # Typed API client (all backend calls)
│   │   │   ├── components/           # AIForm, SimpleForm, SuccessScreen, TemplatePicker,
│   │   │   │                         #   CreationMethod, StepOne, BackButton, AccountFields, ErrorBoundary
│   │   │   ├── hooks/                # useSiteGenerationPolling
│   │   │   ├── testData.ts           # 10 industry autofill presets (dev only)
│   │   │   ├── __tests__/            # Vitest test suite
│   │   │   └── duda-widget-builder.js    # Copy/paste integration guide for Duda Widget Builder
│   │   ├── collection-search/        # Advanced example: search/filter a Duda Collection
│   │   │   ├── index.tsx             # Main app component
│   │   │   ├── components/           # ErrorBoundary, Filters (+ MultiSelectDropdown), Pagination, ResultCard, ResultsGrid, SearchBar, SearchStates
│   │   │   ├── hooks/                # useCollectionSearch, useCollectionTheme, useSearch, useFilterOptions
│   │   │   ├── adapters/             # collectionAdapter, demoAdapter
│   │   │   ├── utils/                # detectFieldRoles, buildLinkUrl, applyFilters, toLabel
│   │   │   ├── app.module.css        # CSS custom properties + container queries
│   │   │   ├── __tests__/            # Vitest test suite (adapters, components, utils, integration)
│   │   │   └── custom-widget-builder.js  # Copy/paste integration guide for Duda Widget Builder
│   │   ├── spotify/                  # Intermediate example: Spotify artist player (3rd party API + backend)
│   │   │   ├── index.tsx
│   │   │   ├── components/           # Artist, AudioPlayer, SiriWave, Spotify, Tracks, Loading
│   │   │   ├── providers/            # Spotify, Artist, Tracks (Context API)
│   │   │   ├── utils/
│   │   │   └── custom-widget-builder.js  # Copy/paste integration guide for Duda Widget Builder
│   │   ├── placeholder/              # Starting point: use this as a base to build your own app
│   │   │   ├── index.tsx
│   │   │   └── custom-widget-builder.js  # Copy/paste integration guide for Duda Widget Builder
│   │   ├── custom-form/              # Contact form that never touches Duda (relays to form-capture-backend)
│   │   │   ├── index.tsx
│   │   │   ├── __tests__/            # Vitest test suite
│   │   │   └── custom-widget-builder.js  # Copy/paste integration guide for Duda Widget Builder
│   │   └── README.md                 # How to create your own app
│   ├── entries/                      # One file per app, each a single static import <- Duda entry point
│   ├── widgetLifecycle.tsx           # Shared init/clean (mount/unmount, DM's DOM-sizing quirks)
│   ├── index.css                     # Global widget styles
│   └── lib/
│       └── api.ts                    # fetch client (reads VITE_API_BASE_URL, adds ngrok bypass header)
├── worker/                           # Cloudflare Worker backend (deployed, Hono)
├── preview/                          # Bundle host + admin dashboard (Cloudflare Worker)
├── server/                           # Express backend (local/reference alternative to worker/)
│   ├── app.ts                        # App setup (cors, routes)
│   ├── index.ts                      # Server entry point (port 5001)
│   ├── config.ts                     # Environment config
│   ├── routes/
│   │   ├── placeholder.ts            # Minimal route template
│   │   └── spotify.ts                # Spotify OAuth + API proxy
│   └── .env.example                  # Credentials template (never commit real values)
├── public/                           # Static assets
├── index.html                        # Dev harness (simulates Duda's renderExternalApp)
└── vite.config.ts                    # Vite build config (UMD library mode, entry set by VITE_WIDGET_APP)
```

`worker/` and `preview/` are independently deployed Cloudflare Workers. `worker/` has its own `package.json`, `preview/` doesn't, its bundle builds run through the root Vite config, only `wrangler` itself runs from `preview/`. See their own READMEs for setup. `form-capture-backend` (the `custom-form` app's storage backend) is a separate sibling repo, not part of this one. `duda-instant-site-demo-updated` (a separate sibling repo, its own README documents the pairing) is the backend the deployed `instant-site` preview actually points at. See [Instant Site App](#instant-site-app) below. `worker/` also has its own independent `instant-site` route implementation (see [`worker/README.md`](worker/README.md)), but it's not what's currently wired up.

---

## Which backend do I need?

Quick Start below sets up `server/` (Express), which is enough for local dev on any app and production for Spotify. Custom Form and Instant Site need Cloudflare Workers deployments this README's Quick Start doesn't cover. See the linked setup docs.

| App | Local dev | Production |
|---|---|---|
| `collection-search` | None, talks to Duda's Collections API directly | Same |
| `spotify` | `server/` (below) | `server/`, hosted anywhere, **or** `worker/` (see [`worker/README.md`](worker/README.md)) |
| `custom-form` | `worker/` (`wrangler dev`) + `form-capture-backend` (separate repo, own `wrangler dev`) | `worker/` **and** `form-capture-backend`, both deployed to Cloudflare, see [`worker/README.md`](worker/README.md) and that repo's own README |
| `instant-site` | Either `worker/` (`wrangler dev`) or the separate `duda-instant-site-demo-updated` repo (`npm run dev`, its own README) | The deployed preview uses `duda-instant-site-demo-updated` on Cloudflare, see that repo's README. `worker/`'s own `instant-site` routes are a usable alternative, see [`worker/README.md`](worker/README.md) |
| `placeholder` | Whatever you build in Step 3 of [How to Build Your Own App](#how-to-build-your-own-app) | Same |

---

## Quick Start

### 1. Install dependencies

```bash
# Widget (project root)
npm install

# Backend (only needed for apps that require credential proxying)
cd server && npm install
```

### 2. Start the dev server

```bash
# From project root starts both Vite (port 5173) and Express (port 5001)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The active widget renders via the dev harness in `index.html`, app set by the import path there (defaults to `collection-search`).

> Collection search doesn't need a backend. It reads from Duda's Collections API directly. The Express server is only for apps that proxy credentials to a 3rd party API, like Spotify.

### 3. Configure the active app's data source

In `index.html`, update the props passed to the widget:

```js
// Using a Duda collection:
props: { collectionName: 'your-collection-name' }

// Leave collectionName empty to use demo mode (synthetic data, no backend needed)
```

---

## Available Scripts

### Widget (project root)

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server + Express backend concurrently |
| `npm start` | Start the Vite dev server only (port 5173) |
| `npm run build` | Build the UMD widget bundle -> `dist/static/js/dm-widget.js` (logs bundle size in kB) |
| `npm run preview` | Serve the production build locally (port 5173) |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once (CI) |
| `npm run test:coverage` | Run tests with coverage report |

### Backend (`server/`)

| Command | Description |
|---|---|
| `npm start` | Start the Express server on port 5001 |

> Always start the backend from `server/` (`cd server && npm start`) so `server/.env` loads.

---

## Instant Site App

Creates a new Duda site using AI generation or a template, then provisions a user account and grants editor access. The deployed preview (`widgets.susurrous.dev/instant-site`) is wired to the sibling `duda-instant-site-demo-updated` repo's server as its backend, that project's own README documents itself as the intended pairing for this widget, and `preview/entries/instant-site.tsx` records the exact live `apiUrl`/`embedToken`. `worker/src/routes/instant-site.ts` is a separate, independent implementation of the same `/api/*` routes (see [`worker/README.md`](worker/README.md)) usable as a backend for this app, but not what the live deployment currently points at.

### Props

| Prop | Type | Description |
|---|---|---|
| `apiUrl` | `string` | Base URL for the instant-site backend (e.g. `https://your-server.com`) |
| `embedToken` | `string` | Shared secret, must match `EMBED_TOKEN` on the backend |
| `enablePresets` | `boolean` | Show the "Fill with example" autofill dropdown in dev/demo mode |

### Setup

Pick one backend, then set `apiUrl`/`embedToken` to match:
- **`duda-instant-site-demo-updated`** (what the live preview uses): clone that separate repo and follow its own README (`npm run dev` locally, or its Cloudflare Workers deploy section for production).
- **`worker/`** (this repo's own implementation): see [`worker/README.md`](worker/README.md) `wrangler login`, `wrangler secret put INSTANT_SITE_SESSION_SECRET`, `wrangler deploy`.

To activate: `VITE_WIDGET_APP=instant-site npm run build` (or for local dev, point `index.html`'s import at `/src/entries/instant-site.tsx`).

See [`src/apps/instant-site/custom-widget-builder.js`](src/apps/instant-site/custom-widget-builder.js) for the full Widget Builder integration.

---

## Collection Search App

Searches and filters items from a Duda collection.

### Data sources

| Prop | Description |
|---|---|
| `collectionName` | Name of a Duda collection uses `window.dmAPI.loadCollectionsAPI()` |

Leave `collectionName` empty to run in demo mode (synthetic data, no backend required).

> `loadAll` paginates the Duda Collections API, capped at 200 pages (20,000 items). `search` returns up to 100 items per query.

### Field mapping

The widget auto-detects which fields to use for title, description, image, etc. by inspecting the collection schema, in `src/apps/collection-search/utils/detectFieldRoles.ts`. Matching is exact (case-insensitive), not substring, a field named `titles` won't match `title`. First match in each list wins. Override detection with explicit props:

| Prop | Auto-detects from (first match wins) |
|---|---|
| `titleField` | `title`, `name`, `heading`, `subject`, `label` |
| `descField` | `description`, `desc`, `body`, `summary`, `content`, `about`, `detail` |
| `imageField` | `image`, `img`, `photo`, `thumbnail`, `picture`, `banner` |
| `categoryField` | `category`, `tag`, `type`, `genre` |
| `metaField` | `date`, `author`, `price`, `rating`, `duration` |
| `linkField` | `url`, `link`, `slug`, `href` |

### Layout & design props

| Prop | Type | Default |
|---|---|---|
| `pageSize` | Number | `9` |
| `resultColumns` | Number | `3` |
| `dynamicPageBase` | Text | None |
| `accentColor` | Color | `#3B82F6` |
| `bgColor` | Color | `#ffffff` |
| `borderColor` | Color | `#E5E7EB` |
| `textColor` | Color | `#111827` |
| `textMutedColor` | Color | `#6B7280` |
| `cardBorderRadius` | Text | `12px` |

See [`src/apps/collection-search/duda-widget-builder.js`](src/apps/collection-search/duda-widget-builder.js) for the full Widget Builder integration: HTML, JS, CSS, and Content Editor field definitions you can copy/paste directly into Duda.

---

## Custom Form App

A self-hosted contact form, not Duda's native Form widget. Posts to your own backend, which relays to a separate `form-capture-backend` repo. Data never touches a Duda Collection or Duda's servers.

### Props

| Prop | Type | Description |
|---|---|---|
| `apiBaseUrl` | `string` | Base URL for the deployed `worker/` backend |
| `submitButtonLabel` | `string` | Optional, default `Send` |
| `successMessage` | `string` | Optional, default `Thanks, we got your message.` |

### Spam mitigation

A hidden honeypot field and a minimum-time-since-mount check run client-side (`src/apps/custom-form/index.tsx`). If either trips, the widget shows success without calling the backend. Real protection against a scripted caller is field validation and rate limiting in `worker/src/routes/custom-form.ts`.

### Backend destination

`FORM_BACKEND_URL`/`FORM_BACKEND_TOKEN` are fixed secrets on `worker/` (`wrangler secret put`), never a Content Editor field. A Content Editor value is visible to any page visitor, and would turn the submit endpoint into an open relay.

### Setup

This app needs two separate Cloudflare Workers deployed, not just `server/`:
1. `form-capture-backend` (separate repo, clone it, then follow its own README's setup: D1 database, `INGEST_TOKEN` secret, `wrangler deploy`).
2. `worker/` in this repo, see [`worker/README.md`](worker/README.md) for `wrangler login`, secrets, and deploy. Set `FORM_BACKEND_URL` to step 1's deployed Worker URL and `FORM_BACKEND_TOKEN` to its `INGEST_TOKEN`.

See [`src/apps/custom-form/custom-widget-builder.js`](src/apps/custom-form/custom-widget-builder.js) for the full Widget Builder integration.

---

## How to Build Your Own App

### Step 1: Create your app folder

Copy `src/apps/placeholder/index.tsx` as a starting point:

```
src/apps/
└── my-app/
    └── index.tsx
```

Export a single React component that receives widget props:

```tsx
// src/apps/my-app/index.tsx
export default function MyApp({ resourceId }: { resourceId?: string }) {
  // fetch from your backend, render your UI
  return <div>My widget, resource: {resourceId}</div>;
}
```

See [`src/apps/README.md`](src/apps/README.md) for a step-by-step guide.

### Step 2: Add an entry file, and pick it via `VITE_WIDGET_APP`

```tsx
// src/entries/my-app.tsx
import MyApp from '../apps/my-app';
import { createWidgetLifecycle } from '../widgetLifecycle';

function parseProps(flat: Record<string, unknown>) {
  return {
    resourceId: typeof flat.resourceId === 'string' ? flat.resourceId : undefined,
  };
}

export const { init, clean } = createWidgetLifecycle(MyApp, parseProps);
```

Add `my-app` to `VALID_APPS` in `vite.config.ts`, then build it with
`VITE_WIDGET_APP=my-app npm run build`. See
[`src/apps/README.md`](src/apps/README.md) for the step-by-step guide.

### Step 3: Add a backend route (if needed)

Two independent, deletable backend implementations exist, pick one, or add the route to both if you want local dev (`server/`) and the Cloudflare deployment (`worker/`) to stay in sync.

**`server/`** (Express, local dev via `npm start`): create `server/routes/my-app.ts` with an Express router, then mount it in `server/app.ts`:

```ts
import myAppRoutes from './routes/my-app';
app.use('/my-app', myAppRoutes);
```

Add credentials to `server/.env` and reference them via `server/config.ts`.

**`worker/`** (Cloudflare Worker, production deployment target): create `worker/src/routes/my-app.ts` with a Hono router, then mount it in `worker/src/index.ts`:

```ts
import myAppRoutes from './routes/my-app';
app.use('/my-app/*', rateLimited);
app.route('/my-app', myAppRoutes);
```

Add secrets via `npx wrangler secret put` and reference them through `worker/src/env.ts`'s `Env` interface. See [`worker/README.md`](worker/README.md).

---

## Deployings

### Option A: ngrok (live Duda site testing from your machine)

```bash
npm run build && npx vite preview --port 5173
```

Then in a second terminal:

```bash
npx ngrok http 5173
```

> **One-command shortcut:** If you want to run build + preview + ngrok in a single step, create a local script (gitignored so it stays off the repo):
>
> ```bash
> # serve.local.sh
> #!/bin/bash
> set -e
> npm run build
> npx concurrently --kill-others-on-fail --names "preview,ngrok" \
>   "npx vite preview --port 5173" \
>   "npx wait-on tcp:5173 && ngrok http 5173"
> ```
>
> Make it executable once (`chmod +x serve.local.sh`), then run with `./serve.local.sh`. Any `*.local.sh` file is already gitignored.

Paste the JS from your app's `custom-widget-builder.js` into the Duda Widget Builder and replace `YOUR_NGROK_OR_HOSTED_URL` with your ngrok URL.

> ngrok's free tier blocks cross-origin script requests. Every `custom-widget-builder.js` already works around this by fetching the bundle with a bypass header and converting it to a blob URL. No changes needed, just paste and use.

For apps that call a backend (e.g. Spotify), `vite preview` proxies `/spotify/*` to `localhost:5001`, so the same ngrok URL works for both the bundle (`scriptSrc`) and API calls (`apiBaseUrl`). Set both to the same ngrok URL in the Widget Builder Content Editor.

> Two things work together to make API calls succeed when the widget runs on a live Duda site via ngrok:
> 1. `src/lib/api.ts` automatically adds `ngrok-skip-browser-warning: 1` to all fetch requests when `apiBaseUrl` contains `ngrok`, bypassing ngrok's HTML interstitial for browser XHR.
> 2. The Express server allows all origins in dev mode (`NODE_ENV` is not `production`), so cross-origin requests from the live Duda site go through without a CORS rejection.
>
> Both automatic, no manual configuration needed.

### Option B: production hosting

1. Build the widget bundle:

```bash
npm run build
# → dist/static/js/dm-widget.js
```

2. Host `dist/static/js/dm-widget.js` at a public HTTPS URL (CDN, your backend's static directory, etc.)

3. In Duda's Widget Builder **JavaScript** tab, paste the function body from your app's `custom-widget-builder.js` with your hosted URL as `scriptSrc`. Each `custom-widget-builder.js` also lists the **Content Editor** fields and **CSS** tab contents to copy in.

For apps with a backend, deploy `server/` to a hosting provider and set `apiBaseUrl` in the Widget Builder Content Editor to that server's URL (no rebuild needed), or set `VITE_API_BASE_URL` in `.env.production` and rebuild. `server/` only implements the Spotify routes,  Custom Form and Instant Site need Cloudflare instead (Option C below).

### Option C: Cloudflare Workers (Custom Form, Instant Site)

`server/` has no Custom Form or Instant Site routes. For those apps, deploy the Cloudflare backend(s) that app needs, see [Which backend do I need?](#which-backend-do-i-need) above for exactly which repo(s) and README(s) to follow:

```bash
cd worker && npx wrangler login && npx wrangler deploy   # see worker/README.md for secrets
```

Then set `apiBaseUrl`/`apiUrl` in the Widget Builder Content Editor to the deployed Worker's custom domain (or rebuild with the equivalent `VITE_*` env var).

---

## Backend API Reference

`server/` (Express) implements the Spotify routes. `worker/` (Cloudflare, see [`worker/README.md`](worker/README.md)) implements all of these plus the Instant Site and Custom Form routes, which `server/` doesn't have an equivalent for. The `/api/*` rows below are `worker only` in the sense that they're the only implementation of these routes *in this repo*, the deployed instant-site preview actually points at the sibling `duda-instant-site-demo-updated` repo's own equivalent routes instead (see [Instant Site App](#instant-site-app) above and that project's own README), which happen to use the same path names.

| Method | Path | Description | Where |
|---|---|---|---|
| `GET` | `/health` | Health check | both |
| `GET` | `/spotify/artists/:id/top-tracks` | Fetch recent tracks for an artist (token managed server-side) | both |
| `GET` | `/spotify/*` | Generic proxy to the Spotify API (token managed server-side) | both |
| `GET` | `/api/templates` | List Duda templates for the Instant Site app | worker only |
| `POST` | `/api/sites` | Create a site from a template | worker only |
| `PATCH` | `/api/sites/:siteName` | Push content into a created site | worker only |
| `DELETE` | `/api/sites/:siteName` | Delete a created site (requires the site token minted by `POST /api/sites`) | worker only |
| `POST` | `/api/users` | Create a Duda account | worker only |
| `POST` \| `GET` | `/api/users/:userId/accessFor/:siteName` | Grant/fetch editor access (requires a site token) | worker only |
| `POST` | `/api/generate` | Kick off AI site generation | worker only |
| `GET` | `/api/generate/:taskId` | Poll an AI generation task | worker only |
| `POST` | `/custom-form/submit` | Relay a Custom Form submission to `form-capture-backend` | worker only |

---

## Security Notes

- **Never commit real credentials.** `server/.env` is listed in `.gitignore`. Only `server/.env.example` should be committed.
- **Spotify tokens never leave the server.** The Express proxy calls `getAccessToken()` internally on every request. The browser sends no auth header and receives no token.
- In production, set `ALLOWED_ORIGINS` in `server/.env` to your Duda site's domain. The server throws at startup if this is unset in production mode.
- `/spotify/*` is rate limited to 30 requests per minute per IP, via `express-rate-limit` in `server/` and Cloudflare's Rate Limiting binding in `worker/`.
- `collectionAdapter` throws (not silently returns empty) when the Duda Collections API is unavailable. The error surfaces to the user instead of a misleading "0 results found" state.
- `dynamicPageBase` and the per item link built from `page_item_url` both normalize `\` to `/` before sanitizing, so a value like `/\evil.com` can't slip past the protocol-relative check by exploiting the browser's own backslash normalization. Invalid paths return `''` rather than passing through.
- `ResultCard` uses `<a target="_top">` for navigation. This avoids the `SecurityError` that `window.top.location.href` assignment throws in cross-origin iframes.
- The `apiBaseUrl` prop (Spotify app) is validated as a well formed HTTP/HTTPS URL before being applied to the fetch client.

---

## References

- [Custom Widget Powered by an External App](https://developer.duda.co/docs/custom-widget-powered-by-an-external-app)
- [External JS Apps](https://developer.duda.co/docs/external-js-apps)
- [Widget Builder Overview](https://developer.duda.co/docs/widget-introduction)
- [Vite Library Mode](https://vitejs.dev/guide/build#library-mode)
