import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import type { SpotifyArtist, SpotifyErrorContext } from 'src/types/spotify.types';
import { createFetchReducer, type FetchState } from 'src/apps/spotify/lib/fetchReducer';
import api from 'src/lib/api';

type ArtistState = FetchState<SpotifyArtist>;

const ArtistStateContext = createContext<ArtistState | undefined>(undefined);
const ArtistRetryContext = createContext<(() => void) | undefined>(undefined);
const artistReducer = createFetchReducer<SpotifyArtist>();

interface ArtistProviderProps {
  artistId: string;
  children: ReactNode;
  onError?: (err: unknown, context: SpotifyErrorContext) => void;
}

export default function ArtistProvider({ artistId, children, onError }: ArtistProviderProps) {
  const [artist, dispatch] = useReducer(artistReducer, {
    data: undefined,
    error: undefined,
    requested: false,
  });
  const [retryKey, setRetryKey] = useState(0);
  const retry = useCallback(() => setRetryKey((k) => k + 1), []);

  // Stable ref so onError changes don't invalidate the effect
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; });

  useEffect(() => {
    if (!artistId) return;
    const controller = new AbortController();
    dispatch({ type: 'FETCH_REQUEST' });
    api
      .get<SpotifyArtist>(`/spotify/artists/${artistId}`, { signal: controller.signal })
      .then((response) => dispatch({ type: 'FETCH_SUCCESS', data: response.data }))
      .catch((error: unknown) => {
        if ((error instanceof Error || error instanceof DOMException) && error.name !== 'AbortError') {
          dispatch({ type: 'FETCH_FAILURE', error });
          onErrorRef.current?.(error, { artistId, type: 'artist' });
        }
      });
    return () => controller.abort();
  }, [artistId, retryKey]);

  return (
    <ArtistRetryContext.Provider value={retry}>
      <ArtistStateContext.Provider value={artist}>
        {children}
      </ArtistStateContext.Provider>
    </ArtistRetryContext.Provider>
  );
}

export function useArtistState(): ArtistState | undefined {
  return useContext(ArtistStateContext);
}

export function useArtistRetry(): (() => void) | undefined {
  return useContext(ArtistRetryContext);
}
