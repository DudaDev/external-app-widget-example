import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCollectionSearch } from '../../hooks/useCollectionSearch';
import { SEARCH_STATE } from '../../hooks/useSearch';

const defaultParams = {
  collectionName: '', // empty → demo adapter
  titleField: '',
  descField: '',
  imageField: '',
  linkField: '',
  categoryField: '',
  metaField: '',
  dynamicPageBase: '',
  filterFields: '',
  multiSelectFields: '',
  sortFields: '',
  pageSize: 9 as number | string,
  readMoreText: 'Read more',
};

afterEach(() => { vi.restoreAllMocks(); });

describe('useCollectionSearch', () => {
  it('starts in INITIAL state with no results on page 1', () => {
    const { result } = renderHook(() => useCollectionSearch(defaultParams));
    expect(result.current.searchState).toBe(SEARCH_STATE.INITIAL);
    expect(result.current.allResults).toEqual([]);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.dmApiTimedOut).toBe(false);
  });

  it('handleSearch transitions to RESULTS state with demo data', async () => {
    const { result } = renderHook(() => useCollectionSearch(defaultParams));
    act(() => { result.current.handleSearch('react'); });
    await waitFor(() => expect(result.current.searchState).toBe(SEARCH_STATE.RESULTS), { timeout: 2000 });
    expect(result.current.allResults.length).toBeGreaterThan(0);
  });

  it('handleClear resets to INITIAL state with empty results on page 1', async () => {
    const { result } = renderHook(() => useCollectionSearch(defaultParams));
    act(() => { result.current.handleSearch('react'); });
    await waitFor(() => expect(result.current.searchState).toBe(SEARCH_STATE.RESULTS), { timeout: 2000 });
    act(() => { result.current.handleClear(); });
    expect(result.current.searchState).toBe(SEARCH_STATE.INITIAL);
    expect(result.current.allResults).toEqual([]);
    expect(result.current.currentPage).toBe(1);
  });

  it('handleFilterChange resets currentPage to 1', async () => {
    const { result } = renderHook(() => useCollectionSearch({ ...defaultParams, pageSize: 1 }));
    act(() => { result.current.handleSearch('react'); });
    await waitFor(() => expect(result.current.totalPages).toBeGreaterThan(1), { timeout: 2000 });
    act(() => { result.current.handlePageChange(2); });
    expect(result.current.currentPage).toBe(2);
    act(() => { result.current.handleFilterChange('category', 'Tech'); });
    expect(result.current.currentPage).toBe(1);
  });

  it('handleSortChange updates sort state', () => {
    const { result } = renderHook(() => useCollectionSearch(defaultParams));
    act(() => { result.current.handleSortChange({ field: 'title', dir: 'desc' }); });
    expect(result.current.sort).toEqual({ field: 'title', dir: 'desc' });
  });

  it('currentResults is a single-page slice of allResults when pageSize is 1', async () => {
    const { result } = renderHook(() => useCollectionSearch({ ...defaultParams, pageSize: 1 }));
    act(() => { result.current.handleSearch('react'); });
    await waitFor(() => expect(result.current.allResults.length).toBeGreaterThan(1), { timeout: 2000 });
    expect(result.current.currentResults).toHaveLength(1);
    expect(result.current.currentResults[0]).toBe(result.current.allResults[0]);
  });

  it('countText shows result count after a search', async () => {
    const { result } = renderHook(() => useCollectionSearch(defaultParams));
    act(() => { result.current.handleSearch('react'); });
    await waitFor(() => expect(result.current.countText).toMatch(/result/i), { timeout: 2000 });
  });

  it('countText is empty in INITIAL state', () => {
    const { result } = renderHook(() => useCollectionSearch(defaultParams));
    expect(result.current.countText).toBe('');
  });
});
