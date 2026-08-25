import { createContext, useContext, type ReactNode } from 'react';
import { setBaseURL } from 'src/lib/api';

interface SpotifyContextValue {
  ready: true;
}

const SpotifyContext = createContext<SpotifyContextValue | undefined>(undefined);

interface SpotifyProviderProps {
  children: ReactNode;
  apiBaseUrl?: string;
}

export default function SpotifyProvider({ children, apiBaseUrl }: SpotifyProviderProps) {
  if (apiBaseUrl) {
    try {
      const { protocol } = new URL(apiBaseUrl);
      if (protocol === 'http:' || protocol === 'https:') {
        setBaseURL(apiBaseUrl);
      }
    } catch {
      // invalid URL, fall back to build-time VITE_API_BASE_URL
    }
  }

  return (
    <SpotifyContext.Provider value={{ ready: true }}>
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotifyContext(): SpotifyContextValue | undefined {
  return useContext(SpotifyContext);
}
