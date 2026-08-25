import { APPS, type AppName, type Env, type ReactMode } from './types';

const REACT_MODES_KEY = 'reactModes';
const DEFAULT_REACT_MODE: ReactMode = 'shared';
const MODES_CACHE_TTL_MS = 30_000;

// Settings only change via the admin form, so cache the KV read per isolate.
// Cleared on save so the admin sees their own change immediately.
let modesCache: { modes: Record<AppName, ReactMode>; expiresAt: number } | null = null;

export function clearReactModesCache(): void {
  modesCache = null;
}

export async function getReactModes(env: Env): Promise<Record<AppName, ReactMode>> {
  if (modesCache && modesCache.expiresAt > Date.now()) {
    return modesCache.modes;
  }
  const stored = await env.SETTINGS.get(REACT_MODES_KEY);
  let parsed: Partial<Record<string, unknown>> = {};
  if (stored) {
    try {
      parsed = JSON.parse(stored);
    } catch {
      // Fall back to defaults on parse failure.
      parsed = {};
    }
  }
  const modes = {} as Record<AppName, ReactMode>;
  for (const app of APPS) {
    modes[app] = parsed[app] === 'standalone' ? 'standalone' : DEFAULT_REACT_MODE;
  }
  modesCache = { modes, expiresAt: Date.now() + MODES_CACHE_TTL_MS };
  return modes;
}

export async function saveReactModes(env: Env, modes: Record<AppName, ReactMode>): Promise<void> {
  await env.SETTINGS.put(REACT_MODES_KEY, JSON.stringify(modes));
  clearReactModesCache();
}
