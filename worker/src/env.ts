// Minimal shape of the Workers Rate Limiting binding. Not yet in
// @cloudflare/workers-types, so declared by hand.
export interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  EXTERNAL_API_CLIENT_ID: string;
  EXTERNAL_API_CLIENT_SECRET: string;
  EXTERNAL_API_BASE_URL: string;
  ALLOWED_ORIGINS: string;
  DUDA_API_USER: string;
  DUDA_API_PASSWORD: string;
  DUDA_API_BASE_URL: string;
  INSTANT_SITE_EMBED_TOKEN: string;
  INSTANT_SITE_SESSION_SECRET: string;
  FORM_BACKEND_URL: string;
  FORM_BACKEND_TOKEN: string;
  RATE_LIMITER: RateLimit;
}
