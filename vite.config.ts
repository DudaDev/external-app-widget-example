import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import { resolve } from 'path';
import { statSync } from 'fs';

// Each entry must match a file under src/entries/.
const VALID_APPS = ['collection-search', 'spotify', 'placeholder', 'instant-site', 'custom-form'];
const DEFAULT_APP = 'collection-search';
const requestedApp = process.env.VITE_WIDGET_APP;
if (requestedApp && !VALID_APPS.includes(requestedApp)) {
  console.warn(
    `[warn] Unknown VITE_WIDGET_APP value "${requestedApp}". Valid values: ${VALID_APPS.join(', ')}. Falling back to "${DEFAULT_APP}".`
  );
}
const widgetApp = requestedApp && VALID_APPS.includes(requestedApp) ? requestedApp : DEFAULT_APP;

// Typed explicitly so both ternary branches check against Record<string, string>
// directly, rather than TS trying to unify the ternary's own inferred type
// against rollup's OutputOptions['globals'] and narrowing "{}" incorrectly.
const standaloneBundle = process.env.VITE_STANDALONE_BUNDLE === 'true';
const externalizedReactGlobals: Record<string, string> = standaloneBundle
  ? {}
  : {
      react: 'React',
      'react-dom': 'ReactDOM',
      'react-dom/client': 'ReactDOM',
    };

export default defineConfig(({ mode }) => ({
  define:
    mode !== 'test'
      ? {
          // Force production React build in the UMD bundle so it ships minified
          'process.env.NODE_ENV': '"production"',
        }
      : {},
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    cors: {
      origin: '*',
      allowedHeaders: ['ngrok-skip-browser-warning', 'Authorization', 'Content-Type'],
    },
    proxy: {
      '/spotify': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        configure: (proxy) => {
          // Rewrite DM's origin to localhost so Express's CORS allowlist passes.
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Origin', 'http://localhost:5173');
          });
          // Replace Express's CORS header with a wildcard so any DM site origin is accepted.
          proxy.on('proxyRes', (proxyRes) => {
            delete proxyRes.headers['access-control-allow-origin'];
            delete proxyRes.headers['access-control-allow-headers'];
            delete proxyRes.headers['access-control-allow-methods'];
            proxyRes.headers['access-control-allow-origin'] = '*';
          });
        },
      },
    },
  },
  plugins: [
    {
      // Howler's AMD define() collides with the define() this bundle registers under, which can
      // abort Duda's require() for the entire widget. Strip just the AMD block.
      name: 'strip-howler-amd-define',
      transform(code, id) {
        if (!id.includes('node_modules/howler')) return null;
        const pattern =
          /if\s*\(\s*typeof\s+define\s*===\s*'function'\s*&&\s*define\.amd\s*\)\s*\{\s*define\(\[\],\s*function\(\)\s*\{\s*return\s*\{\s*Howler:\s*Howler,\s*Howl:\s*Howl\s*\};\s*\}\);\s*\}/;
        if (!pattern.test(code)) {
          console.warn(
            '[strip-howler-amd-define] AMD block not found in howler source. Check node_modules/howler/dist/howler.js'
          );
          return null;
        }
        return { code: code.replace(pattern, ''), map: null };
      },
    },
    {
      name: 'check-env',
      buildStart() {
        if (mode === 'test') return;
        if (!process.env.VITE_API_BASE_URL) {
          console.warn('[warn] VITE_API_BASE_URL is not set. Spotify app will use relative URLs (not needed for collection-search or placeholder)');
        }
      },
    },
    svgr(),
    react({ jsxRuntime: 'automatic' }),
    cssInjectedByJsPlugin(),
    {
      name: 'report-bundle-size',
      apply: 'build' as const,
      closeBundle() {
        const fileName =
          process.env.VITE_STANDALONE_BUNDLE === 'true' ? 'dm-widget.standalone.js' : 'dm-widget.js';
        try {
          const bytes = statSync(`dist/static/js/${fileName}`).size;
          console.log(`\n[bundle] ${fileName} → ${(bytes / 1024).toFixed(1)} kB`);
        } catch {
          // file not found, build may have failed
        }
      },
    },
    {
      // Dev only: serve a placeholder "dynamic page" for any non-asset path.
      name: 'dynamic-page-placeholder',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url?.split('?')[0] ?? '/';
          const isAsset =
            url === '/' ||
            url.startsWith('/@') ||
            url.startsWith('/src') ||
            /\.[^/]+$/.test(url);
          if (isAsset) return next();

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dynamic Page — Placeholder</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, sans-serif;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: #111827;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      padding: 48px 56px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 520px;
      width: 90%;
    }
    .badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #3B82F6;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 99px;
      padding: 4px 12px;
      margin-bottom: 24px;
    }
    h1 { font-size: 1.1rem; font-weight: 600; color: #6B7280; margin: 0 0 12px; }
    .path {
      font-size: 1.4rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 32px;
      word-break: break-all;
    }
    a {
      font-size: 0.875rem;
      color: #6B7280;
      text-decoration: none;
    }
    a:hover { color: #111827; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">DM Dynamic Page — Dev Placeholder</span>
    <h1>This widget would link to</h1>
    <p class="path" id="path"></p>
    <a href="/">← Back to widget dev harness</a>
  </div>
  <script>
    document.getElementById('path').textContent = window.location.pathname;
  </script>
</body>
</html>`);
        });
      },
    },
  ],
  resolve: {
    alias: {
      src: resolve(__dirname, 'src'),
      apps: resolve(__dirname, 'src/apps'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 88,
        branches: 78,
        functions: 88,
        lines: 90,
      },
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, `src/entries/${widgetApp}.tsx`),
      // Global name this bundle exposes itself as. Update this if you rename the widget.
      name: 'dmWidget',
      // VITE_STANDALONE_BUNDLE=true bundles React in directly instead of externalizing it.
      // Separate filename so both variants can be hosted side by side.
      fileName: () =>
        process.env.VITE_STANDALONE_BUNDLE === 'true'
          ? 'static/js/dm-widget.standalone.js'
          : 'static/js/dm-widget.js',
      // UMD, not IIFE. Duda's renderExternalApp() loads the bundle via RequireJS, which only
      // resolves a module if the script calls define(). See custom-widget-builder.js for the
      // AMD shims that make the externalized react/react-dom deps resolve.
      formats: ['umd'],
    },
    rollupOptions: {
      // Default: React externalized. The bundle reads window.React/window.ReactDOM instead of
      // bundling its own copy, so every app must go through loadSharedReact() first (see
      // custom-widget-builder.js).
      //
      // VITE_STANDALONE_BUNDLE=true bundles React/ReactDOM directly instead. Adds ~130KB
      // gzipped, but avoids the shared-React dance and version-mismatch risk.
      external: standaloneBundle ? [] : ['react', 'react-dom', 'react-dom/client'],
      output: {
        inlineDynamicImports: true,
        globals: externalizedReactGlobals,
      },
    },
  },
}));
