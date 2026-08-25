import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Builds the "duda-shared-widgets" bundle every app's shared-mode custom-widget-builder.js
// expects already on the page. Bundles a real React/ReactDOM copy, exposed via
// window.__dudaSharedReact/__dudaSharedReactDOM.
export default defineConfig({
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  // Without this, Vite pulls the repo root's public/ into this bundle's output folder.
  publicDir: false,
  plugins: [react({ jsxRuntime: 'automatic' })],
  build: {
    outDir: resolve(__dirname, '../preview/public/bundles/shared'),
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'entry.ts'),
      name: 'dudaSharedWidgets',
      // UMD, not IIFE. Loaded via RequireJS, which needs define() to resolve the module.
      formats: ['umd'],
      fileName: () => 'duda-widgets.js',
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
