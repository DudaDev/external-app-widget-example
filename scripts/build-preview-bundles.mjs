#!/usr/bin/env node
// Rebuilds each app's dm-widget.js and dm-widget.standalone.js and copies
// them into preview/public/bundles/<app>/, so the preview site can't drift
// from what `npm run build` actually produces.
//
// bundles/shared/duda-widgets.js (built from shared-react/) is rebuilt by
// the "npm run build:shared-react" step this script's npm alias chains
// before calling this file, not by this script itself.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APPS = ['collection-search', 'spotify', 'placeholder', 'instant-site', 'custom-form'];

for (const app of APPS) {
  for (const standalone of [false, true]) {
    const fileName = standalone ? 'dm-widget.standalone.js' : 'dm-widget.js';
    console.log(`\n[preview-bundles] building ${app} (${standalone ? 'standalone' : 'shared'})`);
    execFileSync('npx', ['vite', 'build'], {
      cwd: root,
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_WIDGET_APP: app,
        VITE_STANDALONE_BUNDLE: standalone ? 'true' : 'false',
      },
    });
    const destDir = resolve(root, 'preview/public/bundles', app);
    mkdirSync(destDir, { recursive: true });
    cpSync(resolve(root, 'dist/static/js', fileName), resolve(destDir, fileName));
  }
}

console.log('\n[preview-bundles] done.');
