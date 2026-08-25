export interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

// Minimal KV binding shape. Avoids depending on @cloudflare/workers-types.
export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  RATE_LIMITER: RateLimit;
  SETTINGS: KVNamespace;
  // Identify the Access application this Worker sits behind, so the Access
  // gate in index.ts can verify a Cf-Access-Jwt-Assertion's signature
  // instead of just checking it's present. Not secrets, both are public
  // identifiers visible on the Access application's own dashboard page.
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
}

export type ReactMode = 'shared' | 'standalone';

export const APPS = ['collection-search', 'spotify', 'placeholder', 'instant-site', 'custom-form'] as const;
export type AppName = (typeof APPS)[number];

export interface AppInfo {
  name: AppName;
  note?: string;
  adminUrl?: string;
}

export const APP_INFO: AppInfo[] = [
  { name: 'collection-search' },
  { name: 'spotify', note: 'apiBaseUrl: https://YOUR_BACKEND_DOMAIN' },
  { name: 'placeholder' },
  {
    name: 'instant-site',
    note: 'Backend: duda-instant-site-demo-updated (separate repo), see its README for setup. adminUrl below is a placeholder.',
    adminUrl: 'https://YOUR_ADMIN_DOMAIN',
  },
  { name: 'custom-form', note: 'apiBaseUrl: https://YOUR_BACKEND_DOMAIN, relays to form-capture-backend' },
];

export function isAppName(value: string | null): value is AppName {
  return value !== null && (APPS as readonly string[]).includes(value);
}
