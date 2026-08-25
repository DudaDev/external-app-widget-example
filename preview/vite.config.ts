import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { resolve } from 'path';

// Standalone multi-page preview build, separate from the root vite.config.ts.
// Bundles React directly and renders with ReactDOM, no Duda environment.
export default defineConfig({
  root: __dirname,
  plugins: [svgr(), react({ jsxRuntime: 'automatic' })],
  resolve: {
    alias: {
      src: resolve(__dirname, '../src'),
      apps: resolve(__dirname, '../src/apps'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // No index.html entry. The root path is rendered dynamically by
        // worker-src/index.ts.
        'collection-search': resolve(__dirname, 'collection-search.html'),
        spotify: resolve(__dirname, 'spotify.html'),
        placeholder: resolve(__dirname, 'placeholder.html'),
        'instant-site': resolve(__dirname, 'instant-site.html'),
        'custom-form': resolve(__dirname, 'custom-form.html'),
      },
    },
  },
});
