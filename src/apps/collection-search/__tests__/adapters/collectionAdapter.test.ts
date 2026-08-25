import { describe, it, expect, vi } from 'vitest';
import { createCollectionAdapter } from '../../adapters/collectionAdapter';
import type { CollectionsAPI } from 'src/types/collection.types';

type ChainableApi = CollectionsAPI & {
  search: (query: string) => ChainableApi;
  pageSize: (n: number) => ChainableApi;
  offset: (n: number) => ChainableApi;
  get: ReturnType<typeof vi.fn>;
};

function makeApi(overrides: Partial<ChainableApi> = {}): ChainableApi {
  const chainable: ChainableApi = {
    data:     () => chainable,
    search:   () => chainable,
    pageSize: () => chainable,
    offset:   () => chainable,
    get:      vi.fn().mockResolvedValue({ values: [] }),
    schema:   undefined,
    ...overrides,
  } as unknown as ChainableApi;
  return chainable;
}

function makeAdapter(api: ChainableApi | null) {
  const ref = { current: api };
  return createCollectionAdapter('articles', ref);
}

describe('collectionAdapter.search', () => {
  it('throws when API is not ready', async () => {
    const adapter = createCollectionAdapter('articles', { current: null });
    await expect(adapter.search('hello')).rejects.toThrow('DM Collections API is not available');
  });

  it('throws AbortError if signal is aborted when the API call resolves', async () => {
    const controller = new AbortController();
    const api = makeApi({
      get: vi.fn().mockImplementation(async () => {
        controller.abort();
        return { values: [{ page_item_url: 'item-1', data: { title: 'Hello' } }] };
      }),
    } as any);
    const adapter = makeAdapter(api);
    await expect(adapter.search('hello', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('returns values from the API response', async () => {
    const items = [{ page_item_url: 'item-1', data: { title: 'Hello' } }];
    const api = makeApi({ get: vi.fn().mockResolvedValue({ values: items }) } as any);
    const adapter = makeAdapter(api);
    const { results } = await adapter.search('hello');
    expect(results).toEqual([{ id: 'item-1', ...items[0] }]);
  });

  it('returns empty array when API response has no values', async () => {
    const api = makeApi({ get: vi.fn().mockResolvedValue({}) } as any);
    const adapter = makeAdapter(api);
    const { results } = await adapter.search('hello');
    expect(results).toEqual([]);
  });

  it('normalizes flat items (no .data field) to { data } shape', async () => {
    const flatItems = [{ page_item_url: 'item-1', title: 'Hello', body: 'World' }];
    const api = makeApi({ get: vi.fn().mockResolvedValue({ values: flatItems }) } as any);
    const adapter = makeAdapter(api);
    const { results } = await adapter.search('hello');
    expect(results[0]).toEqual({ id: 'item-1', page_item_url: 'item-1', data: { title: 'Hello', body: 'World' } });
  });

  it('preserves items that already have .data', async () => {
    const items = [{ page_item_url: 'item-1', data: { title: 'Hello' } }];
    const api = makeApi({ get: vi.fn().mockResolvedValue({ values: items }) } as any);
    const adapter = makeAdapter(api);
    const { results } = await adapter.search('hello');
    expect(results[0]).toEqual({ id: 'item-1', ...items[0] });
  });
});

describe('collectionAdapter.getSchema', () => {
  it('returns empty array when API is not ready', async () => {
    const adapter = createCollectionAdapter('articles', { current: null });
    const schema = await adapter.getSchema();
    expect(schema).toEqual([]);
  });

  it('returns field names from schema API when available', async () => {
    const api = makeApi();
    (api as any).schema = vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({
        fields: [{ name: 'title' }, { name: 'description' }],
      }),
    });
    const adapter = makeAdapter(api);
    const schema = await adapter.getSchema();
    expect(schema).toEqual(['title', 'description']);
  });

  it('falls back to sampling data keys when schema API is absent', async () => {
    const api = makeApi({
      get: vi.fn().mockResolvedValue({
        values: [{ data: { title: 'Hello', body: 'World' } }],
      }),
    } as any);
    const adapter = makeAdapter(api);
    const schema = await adapter.getSchema();
    expect(schema).toContain('title');
    expect(schema).toContain('body');
  });
});

describe('collectionAdapter.loadAll', () => {
  it('throws when API is not ready', async () => {
    const adapter = createCollectionAdapter('articles', { current: null });
    await expect(adapter.loadAll()).rejects.toThrow('DM Collections API is not available');
  });

  it('returns all values from a single-page collection', async () => {
    const items = [{ page_item_url: 'item-1', data: { title: 'A' } }, { page_item_url: 'item-2', data: { title: 'B' } }];
    const api = makeApi({ get: vi.fn().mockResolvedValue({ values: items }) } as any);
    const adapter = makeAdapter(api);
    const result = await adapter.loadAll();
    expect(result).toEqual([{ id: 'item-1', ...items[0] }, { id: 'item-2', ...items[1] }]);
  });

  it('normalizes flat items (no .data field) to { data } shape', async () => {
    const flatItems = [{ page_item_url: 'item-1', title: 'Hello' }, { page_item_url: 'item-2', title: 'World' }];
    const api = makeApi({ get: vi.fn().mockResolvedValue({ values: flatItems }) } as any);
    const adapter = makeAdapter(api);
    const result = await adapter.loadAll();
    expect(result).toEqual([
      { id: 'item-1', page_item_url: 'item-1', data: { title: 'Hello' } },
      { id: 'item-2', page_item_url: 'item-2', data: { title: 'World' } },
    ]);
  });

  it('calls pageSize(100) per page request', async () => {
    const api = makeApi();
    (api as any).pageSize = vi.fn().mockReturnValue(api);
    const adapter = makeAdapter(api);
    await adapter.loadAll();
    expect((api as any).pageSize).toHaveBeenCalledWith(100);
  });

  it('paginates through multiple full pages to collect all items', async () => {
    const makePage = (start: number) =>
      Array.from({ length: 100 }, (_, i) => ({ data: { title: `Item ${start + i}` } }));
    let call = 0;
    const get = vi.fn().mockImplementation(() => {
      const items = call < 3 ? makePage(call * 100) : [];
      call++;
      return Promise.resolve({ values: items });
    });
    const api = makeApi({ get } as any);
    (api as any).offset = vi.fn().mockReturnValue(api);
    const adapter = makeAdapter(api);
    const result = await adapter.loadAll();
    expect(result).toHaveLength(300);
    expect(get).toHaveBeenCalledTimes(4); // 3 full pages + 1 empty page signals end
    expect((api as any).offset).toHaveBeenCalledWith(0);
    expect((api as any).offset).toHaveBeenCalledWith(100);
    expect((api as any).offset).toHaveBeenCalledWith(200);
  });
});

describe('collectionAdapter.loadAll caching', () => {
  it('shares one underlying fetch across concurrent callers on the same adapter', async () => {
    // Regression test: useFilterOptions and useSearch both call loadAll()
    // independently on mount. Without caching, that's the whole collection
    // paginated twice.
    const items = [{ page_item_url: 'item-1', data: { title: 'A' } }];
    const get = vi.fn().mockResolvedValue({ values: items });
    const api = makeApi({ get } as any);
    const adapter = makeAdapter(api);

    const [a, b] = await Promise.all([adapter.loadAll(), adapter.loadAll()]);

    expect(get).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it('reuses the cached result for a later, sequential call too', async () => {
    const items = [{ page_item_url: 'item-1', data: { title: 'A' } }];
    const get = vi.fn().mockResolvedValue({ values: items });
    const api = makeApi({ get } as any);
    const adapter = makeAdapter(api);

    await adapter.loadAll();
    await adapter.loadAll();

    expect(get).toHaveBeenCalledTimes(1);
  });

  it("does not let one caller's aborted signal affect a concurrent caller sharing the same fetch", async () => {
    const items = [{ page_item_url: 'item-1', data: { title: 'A' } }];
    const api = makeApi({ get: vi.fn().mockResolvedValue({ values: items }) } as any);
    const adapter = makeAdapter(api);
    const abortedController = new AbortController();
    abortedController.abort();

    const [aborted, ok] = await Promise.allSettled([
      adapter.loadAll(abortedController.signal),
      adapter.loadAll(),
    ]);

    expect(aborted.status).toBe('rejected');
    expect(ok.status).toBe('fulfilled');
  });

  it('does not cache a failed fetch — a later call retries', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ values: [{ page_item_url: 'item-1', data: { title: 'A' } }] });
    const api = makeApi({ get } as any);
    const adapter = makeAdapter(api);

    await expect(adapter.loadAll()).rejects.toThrow('network down');
    const result = await adapter.loadAll();

    expect(get).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
  });
});

describe('collectionAdapter.loadAll offset fallback', () => {
  it('returns the first page when the API does not support offset()', async () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ data: { title: `Item ${i}` } }));
    // API without an offset method
    const api = makeApi({ get: vi.fn().mockResolvedValue({ values: items }) } as any);
    delete (api as any).offset;
    const adapter = makeAdapter(api);

    const result = await adapter.loadAll();

    // Only one page fetched — no offset = no pagination
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(100);
  });
});

describe('collectionAdapter.loadAll max-page guard', () => {
  it('stops after MAX_PAGES (200) when the API always returns full pages', async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => ({
      page_item_url: `item-${i}`,
      data: { title: `Item ${i}` },
    }));
    const get = vi.fn().mockResolvedValue({ values: fullPage });
    const api = makeApi({ get } as any);
    const adapter = makeAdapter(api);

    const result = await adapter.loadAll();

    expect(get).toHaveBeenCalledTimes(200);
    expect(result).toHaveLength(200 * 100);
  });
});

describe('collectionAdapter.search page size contract', () => {
  it('calls pageSize(100) when searching', async () => {
    const api = makeApi();
    (api as any).pageSize = vi.fn().mockReturnValue(api);
    const adapter = makeAdapter(api);
    await adapter.search('hello');
    expect((api as any).pageSize).toHaveBeenCalledWith(100);
  });
});
