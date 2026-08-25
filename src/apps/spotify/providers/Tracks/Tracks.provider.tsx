import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import type { SpotifyTrack, SpotifyErrorContext } from 'src/types/spotify.types';
import { createFetchReducer, type FetchState } from 'src/apps/spotify/lib/fetchReducer';
import api from 'src/lib/api';

type TracksState = FetchState<SpotifyTrack[]>;

const TracksStateContext = createContext<TracksState | undefined>(undefined);
const TracksRetryContext = createContext<(() => void) | undefined>(undefined);
const tracksReducer = createFetchReducer<SpotifyTrack[]>();

interface TracksProviderProps {
  artistId: string;
  children: ReactNode;
  onError?: (err: unknown, context: SpotifyErrorContext) => void;
}

export default function TracksProvider({ artistId, children, onError }: TracksProviderProps) {
  const [tracks, dispatch] = useReducer(tracksReducer, {
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
      .get<{ tracks: SpotifyTrack[] }>(`/spotify/artists/${artistId}/top-tracks?country=US`, { signal: controller.signal })
      .then((response) => dispatch({ type: 'FETCH_SUCCESS', data: response.data.tracks }))
      .catch((error: unknown) => {
        if ((error instanceof Error || error instanceof DOMException) && error.name !== 'AbortError') {
          dispatch({ type: 'FETCH_FAILURE', error });
          onErrorRef.current?.(error, { artistId, type: 'tracks' });
        }
      });
    return () => controller.abort();
  }, [artistId, retryKey]);

  return (
    <TracksRetryContext.Provider value={retry}>
      <TracksStateContext.Provider value={tracks}>
        {children}
      </TracksStateContext.Provider>
    </TracksRetryContext.Provider>
  );
}

export function useTracksState(): TracksState | undefined {
  return useContext(TracksStateContext);
}

export function useTracksRetry(): (() => void) | undefined {
  return useContext(TracksRetryContext);
}
