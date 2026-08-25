import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFilterOptions } from '../../hooks/useFilterOptions';
import type { CollectionAdapter } from 'src/types/collection.types';

const SCHEMA = ['title', 'category', 'author'];
const ALL_ITEMS = [
  { id: 'item-1', data: { title: 'Alpha', category: 'Tech',    author: 'Alice' } },
  { id: 'item-2', data: { title: 'Beta',  category: 'Design',  author: 'Bob'   } },
  { id: 'item-3', data: { title: 'Gamma', category: 'Tech',    author: 'Alice' } },
];

function makeAdapter(overrides: Partial<CollectionAdapter> = {}): CollectionAdapter {
  return {
    getSchema: vi.fn().mockResolvedValue(SCHEMA),
    loadAll:   vi.fn().mockResolvedValue(ALL_ITEMS),
    search:    vi.fn().mockResolvedValue({ results: [], count: 0 }),
    ...overrides,
  };
}

interface RenderOptionsProps {
  apiReady: boolean;
  rawResults: typeof ALL_ITEMS;
  filterFields: string;
  multiSelectFields: string;
}

function renderOptions(adapter: CollectionAdapter, props: Partial<RenderOptionsProps> = {}) {
  const defaults: RenderOptionsProps = { apiReady: false, rawResults: [], filterFields: '', multiSelectFields: '' };
  return renderHook(
    (p: RenderOptionsProps) => useFilterOptions(adapter, p),
    { initialProps: { ...defaults, ...props } },
  );
}

afterEach(() => { vi.restoreAllMocks(); });

describe('useFilterOptions', () => {
  it('returns empty schema and options before apiReady', () => {
    const { result } = renderOptions(makeAdapter());
    expect(result.current.schemaFields).toEqual([]);
    expect(result.current.filterOptions).toEqual({});
    expect(result.current.filterConfig).toEqual([]);
  });

  it('loads schema from adapter once apiReady becomes true', async () => {
    const adapter = makeAdapter();
    const { result, rerender } = renderOptions(adapter);

    rerender({ apiReady: true, rawResults: [], filterFields: '', multiSelectFields: '' });

    await waitFor(() => expect(result.current.schemaFields).toEqual(SCHEMA), { timeout: 1000 });
    expect(vi.mocked(adapter.getSchema)).toHaveBeenCalledTimes(1);
  });

  it('builds filterOptions from loadAll after schema is ready', async () => {
    const adapter = makeAdapter();
    const { result, rerender } = renderOptions(adapter);

    rerender({ apiReady: true, rawResults: [], filterFields: '', multiSelectFields: '' });

    await waitFor(() => expect(Object.keys(result.current.filterOptions).length).toBeGreaterThan(0), { timeout: 1000 });

    expect(result.current.filterOptions['category']).toEqual(['Design', 'Tech']);
  });

  it('falls back to rawResults keys when getSchema returns empty', async () => {
    const adapter = makeAdapter({
      getSchema: vi.fn().mockResolvedValue([]),
      loadAll:   vi.fn().mockResolvedValue([]),
    });
    const { result, rerender } = renderOptions(adapter);

    rerender({
      apiReady: true,
      rawResults: ALL_ITEMS,
      filterFields: '',
      multiSelectFields: '',
    });

    await waitFor(() => expect(result.current.schemaFields.length).toBeGreaterThan(0), { timeout: 1000 });
    expect(result.current.schemaFields).toContain('title');
    expect(result.current.schemaFields).toContain('category');
  });

  it('restricts filterOptions to explicit filterFields when provided', async () => {
    const adapter = makeAdapter();
    const { result, rerender } = renderOptions(adapter);

    rerender({ apiReady: true, rawResults: [], filterFields: 'category', multiSelectFields: '' });

    await waitFor(() => expect(result.current.filterOptions['category']).toBeDefined(), { timeout: 1000 });
    expect(result.current.filterOptions['title']).toBeUndefined();
    expect(result.current.filterOptions['author']).toBeUndefined();
  });

  it('sets type to multiselect for fields listed in multiSelectFields', async () => {
    const adapter = makeAdapter();
    const { result, rerender } = renderOptions(adapter);

    rerender({ apiReady: true, rawResults: [], filterFields: 'category,author', multiSelectFields: 'category' });

    await waitFor(() => expect(result.current.filterConfig.length).toBeGreaterThan(0), { timeout: 1000 });

    const categoryConfig = result.current.filterConfig.find(c => c.field === 'category');
    const authorConfig   = result.current.filterConfig.find(c => c.field === 'author');
    expect(categoryConfig?.type).toBe('multiselect');
    expect(authorConfig?.type).toBe('dropdown');
  });

  it('does not call getSchema before apiReady', () => {
    const adapter = makeAdapter();
    renderOptions(adapter, { apiReady: false });
    expect(vi.mocked(adapter.getSchema)).not.toHaveBeenCalled();
  });

  it('leaves schemaFields empty when getSchema rejects', async () => {
    const adapter = makeAdapter({
      getSchema: vi.fn().mockRejectedValue(new Error('CORS error')),
      loadAll:   vi.fn().mockResolvedValue([]),
    });
    const { result, rerender } = renderOptions(adapter);

    rerender({ apiReady: true, rawResults: [], filterFields: '', multiSelectFields: '' });

    await waitFor(() => expect(vi.mocked(adapter.getSchema)).toHaveBeenCalled(), { timeout: 1000 });

    expect(result.current.schemaFields).toEqual([]);
    expect(result.current.filterOptions).toEqual({});
  });

  it('leaves filterOptions empty when loadAll rejects', async () => {
    const adapter = makeAdapter({
      loadAll: vi.fn().mockRejectedValue(new Error('Network error')),
    });
    const { result, rerender } = renderOptions(adapter);

    rerender({ apiReady: true, rawResults: [], filterFields: '', multiSelectFields: '' });

    await waitFor(() => expect(result.current.schemaFields).toEqual(SCHEMA), { timeout: 1000 });

    expect(result.current.filterOptions).toEqual({});
  });

  it('exposes filterError when loadAll rejects and filterFields was explicitly configured', async () => {
    const adapter = makeAdapter({
      loadAll: vi.fn().mockRejectedValue(new Error('Network error')),
    });
    const { result, rerender } = renderOptions(adapter);

    rerender({ apiReady: true, rawResults: [], filterFields: 'category', multiSelectFields: '' });

    await waitFor(() => expect(result.current.filterError).toBeTruthy(), { timeout: 1000 });
  });

  it('does NOT expose filterError when loadAll rejects but filterFields was not configured', async () => {
    const adapter = makeAdapter({
      loadAll: vi.fn().mockRejectedValue(new Error('Network error')),
    });
    const { result, rerender } = renderOptions(adapter);

    rerender({ apiReady: true, rawResults: [], filterFields: '', multiSelectFields: '' });

    await waitFor(() => expect(vi.mocked(adapter.loadAll)).toHaveBeenCalled(), { timeout: 1000 });
    // Give the catch a tick to run
    await new Promise(r => setTimeout(r, 50));
    expect(result.current.filterError).toBeNull();
  });

  it('filterError is null when loadAll succeeds', async () => {
    const adapter = makeAdapter();
    const { result, rerender } = renderOptions(adapter);

    rerender({ apiReady: true, rawResults: [], filterFields: '', multiSelectFields: '' });

    await waitFor(() => expect(Object.keys(result.current.filterOptions).length).toBeGreaterThan(0), { timeout: 1000 });

    expect(result.current.filterError).toBeNull();
  });
});
