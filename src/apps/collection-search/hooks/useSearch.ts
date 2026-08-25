import { useState, useRef, useEffect, useCallback } from 'react';
import type { CollectionAdapter, CollectionItem } from 'src/types/collection.types';
import { retryWithDelay } from 'src/lib/retry';

export const SEARCH_STATE = Object.freeze({
  INITIAL: 'initial',
  LOADING: 'loading',
  EMPTY:   'empty',
  RESULTS: 'results',
  ERROR:   'error',
} as const);

export type SearchStateValue = (typeof SEARCH_STATE)[keyof typeof SEARCH_STATE];

const DEBOUNCE_MS = 300;
const RETRY_DELAY_MS = 1000;

export interface OnErrorContext {
  query: string;
  type: 'search' | 'loadAll';
}

interface UseSearchOptions {
  onError?: (err: unknown, context: OnErrorContext) => void;
}

interface UseSearchReturn {
  rawResults: CollectionItem[];
  loading: boolean;
  searchState: SearchStateValue;
  errorText: string;
  runSearch: (query: string) => void;
  clearSearch: () => void;
}

export function useSearch(adapter: CollectionAdapter, { onError }: UseSearchOptions = {}): UseSearchReturn {
  const [rawResults,  setRawResults]  = useState<CollectionItem[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [searchState, setSearchState] = useState<SearchStateValue>(SEARCH_STATE.INITIAL);
  const [errorText,   setErrorText]   = useState('');

  const searchAbortRef    = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Stable ref so onError changes don't invalidate the runSearch callback
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; });

  // Cancel any inflight request and pending debounce on unmount
  useEffect(() => {
    return () => {
      searchAbortRef.current?.abort();
      clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const runSearch = useCallback(function runSearch(query: string) {
    const trimmedQuery = (query || '').trim();
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      const { signal } = controller;

      setLoading(true);
      setErrorText('');
      setSearchState(SEARCH_STATE.LOADING);

      try {
        let results: CollectionItem[];
        if (trimmedQuery) {
          ({ results } = await adapter.search(trimmedQuery, signal));
        } else {
          results = await adapter.loadAll(signal);
        }
        setRawResults(results);
        setSearchState(results.length === 0 ? SEARCH_STATE.EMPTY : SEARCH_STATE.RESULTS);
      } catch (err) {
        if ((err instanceof Error || err instanceof DOMException) && err.name === 'AbortError') return;
        // Do not retry when the DM Collections API is explicitly unavailable — retrying won't help
        const isApiUnavailable =
          err instanceof Error && err.message === 'DM Collections API is not available';
        if (!isApiUnavailable && !signal.aborted) {
          try {
            const retryResults = await retryWithDelay(
              () => trimmedQuery
                ? adapter.search(trimmedQuery, signal).then((r) => r.results)
                : adapter.loadAll(signal),
              RETRY_DELAY_MS,
              signal
            );
            setRawResults(retryResults);
            setSearchState(retryResults.length === 0 ? SEARCH_STATE.EMPTY : SEARCH_STATE.RESULTS);
            return;
          } catch (retryErr) {
            if ((retryErr instanceof Error || retryErr instanceof DOMException) && retryErr.name === 'AbortError') return;
            onErrorRef.current?.(retryErr, { query: trimmedQuery, type: trimmedQuery ? 'search' : 'loadAll' });
          }
        } else if (!isApiUnavailable) {
          onErrorRef.current?.(err, { query: trimmedQuery, type: trimmedQuery ? 'search' : 'loadAll' });
        }
        setErrorText('Error searching. Please try again.');
        setSearchState(SEARCH_STATE.ERROR);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, [adapter]);

  const clearSearch = useCallback(() => {
    searchAbortRef.current?.abort();
    clearTimeout(searchDebounceRef.current);
    setRawResults([]);
    setSearchState(SEARCH_STATE.INITIAL);
    setErrorText('');
    setLoading(false);
  }, []);

  return { rawResults, loading, searchState, errorText, runSearch, clearSearch };
}
