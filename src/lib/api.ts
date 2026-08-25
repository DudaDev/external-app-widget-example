let baseURL: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export function setBaseURL(url: string): void {
  baseURL = url;
}

export const REQUEST_TIMEOUT_MS = 8000;

async function get<T>(
  path: string,
  { signal, timeoutMs = REQUEST_TIMEOUT_MS }: { signal?: AbortSignal; timeoutMs?: number } = {}
): Promise<{ data: T }> {
  const headers: Record<string, string> = {};
  if (baseURL.includes('ngrok')) headers['ngrok-skip-browser-warning'] = '1';

  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener('abort', () => controller.abort(), { once: true });

  try {
    const response = await fetch(baseURL + path, { signal: controller.signal, headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as T;
    return { data };
  } finally {
    clearTimeout(timerId);
  }
}

async function post<T>(
  path: string,
  body: unknown,
  { signal, timeoutMs = REQUEST_TIMEOUT_MS }: { signal?: AbortSignal; timeoutMs?: number } = {}
): Promise<{ data: T }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (baseURL.includes('ngrok')) headers['ngrok-skip-browser-warning'] = '1';

  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener('abort', () => controller.abort(), { once: true });

  try {
    const response = await fetch(baseURL + path, {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as T;
    return { data };
  } finally {
    clearTimeout(timerId);
  }
}

const api = { get, post };
export default api;
