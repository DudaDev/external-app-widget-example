> **Illustrative Sample Code, Not a Duda Product**
> This code is provided as a non-production proof of concept for illustration only. It is not part of the Duda platform or Services, is not supported or maintained by Duda, and is provided "AS IS" without warranties of any kind.

# Apps

Each app is a folder exporting a single React component that renders the widget UI. It doesn't receive props from Duda directly, a matching `src/entries/<app>.tsx` file (see below) converts Duda's flat, all-string Content Editor values into typed props, then mounts the component. Apps may also depend on shared code (`src/lib/api.ts`, `src/types/`), so "self-contained" means deletable as a folder, not zero-dependency.

## Structure

```
src/apps/
├── collection-search/    <- Advanced example: search/filter a Duda Collection (default app)
│   ├── index.tsx
│   ├── components/       # each component in its own subfolder (ComponentName/index.tsx + ComponentName.module.css)
│   │                     # ErrorBoundary, Filters, Pagination, ResultCard, ResultsGrid, SearchBar, SearchStates
│   ├── hooks/            # useCollectionSearch (orchestration), useSearch, useFilterOptions, useCollectionTheme
│   ├── adapters/         # collectionAdapter (Duda API), demoAdapter
│   ├── utils/            # detectFieldRoles, buildLinkUrl, applyFilters, getValue, toLabel, collator
│   ├── app.module.css
│   ├── __tests__/        # Vitest test suite (adapters, components, utils, integration)
│   └── custom-widget-builder.js  # copy/paste integration for Duda Widget Builder
├── spotify/              <- Intermediate example: Spotify artist player (3rd party API + backend)
│   ├── index.tsx
│   ├── components/       # includes its own ErrorBoundary
│   ├── providers/
│   ├── utils/
│   └── custom-widget-builder.js  # copy/paste integration for Duda Widget Builder
├── placeholder/          <- Starting point: use this as a base to build your own app
│   ├── index.tsx
│   ├── ErrorBoundary.tsx
│   ├── __tests__/
│   └── custom-widget-builder.js  # copy/paste integration for Duda Widget Builder
├── instant-site/         <- AI-powered instant site creator (Duda site generation API)
│   ├── index.tsx
│   ├── Widget.tsx
│   ├── types.ts          # InstantSiteErrorContext, shared by every step component's onError
│   ├── testData.ts       # INDUSTRY_PRESETS, dev-only autofill data (enablePresets)
│   ├── api/api.ts
│   ├── components/       # includes its own ErrorBoundary
│   ├── hooks/            # useSiteGenerationPolling
│   ├── __tests__/
│   └── duda-widget-builder.js    # copy/paste integration for Duda Widget Builder
└── custom-form/          <- Contact form that never touches Duda (relays to form-capture-backend)
    ├── index.tsx
    ├── ErrorBoundary.tsx
    ├── __tests__/
    └── custom-widget-builder.js  # copy/paste integration for Duda Widget Builder
```

The active app is set by `VITE_WIDGET_APP` (default `collection-search`), which picks a file in [`src/entries/`](../entries). `npm run build` uses `collection-search`. `VITE_WIDGET_APP=spotify npm run build` builds spotify instead. Each entry does one static import, so `vite.config.ts` only resolves that app's dependency graph. A registry object or dynamic import() can't do the same, since Rollup would still see every app reachable from one entry point.

---

## How to create your own app

### 1. Create your app folder

Copy the placeholder as a starting point:

```
src/apps/
└── my-app/
    └── index.js
```

### 2. Export your root React component

```tsx
// src/apps/my-app/index.tsx
export default function MyApp({ resourceId }: { resourceId?: string }) {
  // fetch data from your backend, render your UI
  return <div>My Widget, resource: {resourceId}</div>;
}
```

The props your component receives are whatever Duda passes via `init()`, defined in the Widget Builder's Content Editor.

### 3. Add an entry file for your app

```tsx
// src/entries/my-app.tsx
import WidgetApp from '../apps/my-app';
import { createWidgetLifecycle } from '../widgetLifecycle';

function parseProps(flat: Record<string, unknown>) {
  return {
    resourceId: typeof flat.resourceId === 'string' ? flat.resourceId : undefined,
    // APP: wire up error monitoring here, e.g.:
    // onError: (err, ctx) => window.Sentry?.captureException(err, { extra: ctx }),
  };
}

export const { init, clean } = createWidgetLifecycle(WidgetApp, parseProps);
```

Add `my-app` to `VALID_APPS` in `vite.config.ts`, then build it with
`VITE_WIDGET_APP=my-app npm run build`.

### 4. Add backend routes (if needed)

If your app calls a 3rd party API with credentials, create `server/routes/my-app.ts` with an Express router, then mount it in `server/app.ts`:

```ts
// server/app.ts
import myAppRoutes from './routes/my-app';
app.use('/my-app', myAppRoutes);
```

### 5. Deploy the Express server (if your app needs a backend)

The `server/` Express app must be hosted somewhere accessible. It cannot run on Duda's servers.

#### Option A: ngrok (local testing on a live Duda site)

No build-time URL needed. `vite preview` proxies API routes (e.g. `/spotify/*`) to
`localhost:5001`, so one ngrok tunnel serves both the bundle and the API.

1. Start the Express server: `cd server && npm start`
2. From the project root: `npm run build && npx vite preview --port 5173`
3. In a second terminal: `npx ngrok http 5173`
4. Copy your ngrok URL
5. In Widget Builder Content Editor, set `apiBaseUrl` to your ngrok URL (same URL as `scriptSrc`)

The runtime `apiBaseUrl` prop overrides the baked-in `VITE_API_BASE_URL`. No rebuild needed when your ngrok URL changes.

> The Express server must be started from `server/` so `server/.env` loads correctly.

#### Option B: production hosted server

1. Deploy `server/` to a hosting provider
2. Set `apiBaseUrl` in the Widget Builder Content Editor to your hosted server URL, **or**
   create `.env.production` at the project root and rebuild:

```
VITE_API_BASE_URL=https://your-hosted-server-url.com
```

> If neither `apiBaseUrl` prop nor `VITE_API_BASE_URL` is set, `src/lib/api.ts` uses a relative base
> URL and API calls go to the Duda site origin, returning 404.

**The Spotify example app** (`src/apps/spotify/`) demonstrates this pattern, proxying
Spotify API calls through the Express server (`server/routes/spotify.js`) so
credentials never appear in the client bundle.

### 6. Update dev-mode props in `index.html`

```js
// Update the example props to match your app:
props: { resourceId: 'your-example-id' },
```

### 7. Create a `custom-widget-builder.js` (optional)

Use [`collection-search/custom-widget-builder.js`](collection-search/custom-widget-builder.js) as a template. It documents the HTML, JS, CSS, and Content Editor fields to copy/paste into Duda's Widget Builder for your app.
