import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSearch, SEARCH_STATE } from '../../hooks/useSearch';
import type { CollectionAdapter } from 'src/types/collection.types';

const ITEM = { id: 1, data: { title: 'Result' } };

function makeAdapter(overrides: Partial<CollectionAdapter> = {}): CollectionAdapter {
  return {
    search:    vi.fn().mockResolvedValue({ results: [ITEM], count: 1 }),
    loadAll:   vi.fn().mockResolvedValue([ITEM]),
    getSchema: vi.fn().mockResolvedValue(['title']),
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useSearch', () => {
  it('starts in INITIAL state with empty results', () => {
    const { result } = renderHook(() => useSearch(makeAdapter()));
    expect(result.current.searchState).toBe(SEARCH_STATE.INITIAL);
    expect(result.current.rawResults).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.errorText).toBe('');
  });

  it('calls adapter.search and transitions to RESULTS for a text query', async () => {
    const adapter = makeAdapter();
    const { result } = renderHook(() => useSearch(adapter));

    act(() => { result.current.runSearch('hello'); });

    await waitFor(() => expect(result.current.searchState).toBe(SEARCH_STATE.RESULTS), { timeout: 1000 });

    expect(vi.mocked(adapter.search)).toHaveBeenCalledWith('hello', expect.any(AbortSignal));
    expect(vi.mocked(adapter.loadAll)).not.toHaveBeenCalled();
    expect(result.current.rawResults).toEqual([ITEM]);
    expect(result.current.loading).toBe(false);
  });

  it('calls adapter.loadAll and not adapter.search for an empty query', async () => {
    const adapter = makeAdapter();
    const { result } = renderHook(() => useSearch(adapter));

    act(() => { result.current.runSearch(''); });

    await waitFor(() => expect(result.current.searchState).toBe(SEARCH_STATE.RESULTS), { timeout: 1000 });

    expect(vi.mocked(adapter.loadAll)).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(vi.mocked(adapter.search)).not.toHaveBeenCalled();
  });

  it('trims whitespace-only queries and routes them to loadAll', async () => {
    const adapter = makeAdapter();
    const { result } = renderHook(() => useSearch(adapter));

    act(() => { result.current.runSearch('   '); });

    await waitFor(() => expect(result.current.searchState).toBe(SEARCH_STATE.RESULTS), { timeout: 1000 });

    expect(vi.mocked(adapter.loadAll)).toHaveBeenCalled();
    expect(vi.mocked(adapter.search)).not.toHaveBeenCalled();
  });

  it('transitions to EMPTY when adapter returns no results', async () => {
    const adapter = makeAdapter({
      search: vi.fn().mockResolvedValue({ results: [], count: 0 }),
    });
    const { result } = renderHook(() => useSearch(adapter));

    act(() => { result.current.runSearch('nothing'); });

    await waitFor(() => expect(result.current.searchState).toBe(SEARCH_STATE.EMPTY), { timeout: 1000 });
    expect(result.current.rawResults).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('sets errorText and ERROR state when the adapter rejects on both initial call and retry', async () => {
    vi.useFakeTimers();
    const adapter = makeAdapter({
      search: vi.fn().mockRejectedValue(new Error('Network error')),
    });
    const { result } = renderHook(() => useSearch(adapter));

    act(() => { result.current.runSearch('query'); });

    // Advance past debounce (300ms) + retry delay (1000ms)
    await act(async () => { await vi.advanceTimersByTimeAsync(1400); });

    expect(result.current.errorText).toBeTruthy();
    expect(result.current.searchState).toBe(SEARCH_STATE.ERROR);
    expect(result.current.loading).toBe(false);
    expect(vi.mocked(adapter.search)).toHaveBeenCalledTimes(2);
  });

  it('retries once on failure and resolves to RESULTS if the retry succeeds', async () => {
    vi.useFakeTimers();
    let callCount = 0;
    const adapter = makeAdapter({
      search: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.reject(new Error('Network error'));
        return Promise.resolve({ results: [ITEM], count: 1 });
      }),
    });
    const { result } = renderHook(() => useSearch(adapter));

    act(() => { result.current.runSearch('hello'); });

    // Advance past debounce (300ms) + retry delay (1000ms)
    await act(async () => { await vi.advanceTimersByTimeAsync(1400); });

    expect(result.current.searchState).toBe(SEARCH_STATE.RESULTS);
    expect(vi.mocked(adapter.search)).toHaveBeenCalledTimes(2);
    expect(result.current.rawResults).toEqual([ITEM]);
    expect(result.current.loading).toBe(false);
  });

  it('does not retry when the DM Collections API is unavailable', async () => {
    const adapter = makeAdapter({
      search: vi.fn().mockRejectedValue(new Error('DM Collections API is not available')),
    });
    const { result } = renderHook(() => useSearch(adapter));

    act(() => { result.current.runSearch('query'); });

    await waitFor(() => expect(result.current.errorText).toBeTruthy(), { timeout: 1000 });
    expect(result.current.searchState).toBe(SEARCH_STATE.ERROR);
    expect(vi.mocked(adapter.search)).toHaveBeenCalledTimes(1);
  });

  it('does not fire the retry if clearSearch is called during the retry delay', async () => {
    vi.useFakeTimers();
    const adapter = makeAdapter({
      search: vi.fn().mockRejectedValue(new Error('Network error')),
    });
    const { result } = renderHook(() => useSearch(adapter));

    act(() => { result.current.runSearch('query'); });

    // Advance past debounce so the initial search fires and fails
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(vi.mocked(adapter.search)).toHaveBeenCalledTimes(1);

    // Clear during the retry delay window
    act(() => { result.current.clearSearch(); });

    // Advance past the retry delay — retry should NOT fire (signal aborted)
    await act(async () => { await vi.advanceTimersByTimeAsync(1100); });

    expect(vi.mocked(adapter.search)).toHaveBeenCalledTimes(1);
    expect(result.current.searchState).toBe(SEARCH_STATE.INITIAL);
    expect(result.current.errorText).toBe('');
  });

  it('swallows AbortError without setting errorText and clears loading', async () => {
    const adapter = makeAdapter({
      search: vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
    });
    const { result } = renderHook(() => useSearch(adapter));

    act(() => { result.current.runSearch('query'); });

    await waitFor(() => expect(result.current.searchState).toBe(SEARCH_STATE.LOADING), { timeout: 1000 });
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 1000 });

    expect(result.current.errorText).toBe('');
    expect(result.current.searchState).toBe(SEARCH_STATE.LOADING);
  });

  it('clearSearch resets all state back to INITIAL', async () => {
    const adapter = makeAdapter();
    const { result } = renderHook(() => useSearch(adapter));

    act(() => { result.current.runSearch('hello'); });
    await waitFor(() => expect(result.current.searchState).toBe(SEARCH_STATE.RESULTS), { timeout: 1000 });

    act(() => { result.current.clearSearch(); });

    expect(result.current.searchState).toBe(SEARCH_STATE.INITIAL);
    expect(result.current.rawResults).toEqual([]);
    expect(result.current.errorText).toBe('');
    expect(result.current.loading).toBe(false);
  });
});
