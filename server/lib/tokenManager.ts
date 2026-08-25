const FETCH_TIMEOUT_MS = 10_000;

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

interface TokenResponse {
  access_token: string;
  expires_in?: number;
}

export class TokenManager {
  private cache: TokenCache | null = null;
  private pending: Promise<string> | null = null;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly tokenUrl: string
  ) {}

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt - now > 60_000) {
      return this.cache.accessToken;
    }
    if (!this.pending) {
      this.pending = this.fetchToken(now).finally(() => {
        this.pending = null;
      });
    }
    return this.pending;
  }

  private async fetchToken(now: number): Promise<string> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) throw new Error(`Spotify token request failed: ${response.status}`);
    const data = (await response.json()) as TokenResponse;
    this.cache = {
      accessToken: data.access_token,
      expiresAt: now + (data.expires_in ?? 3600) * 1000,
    };
    return this.cache.accessToken;
  }
}
