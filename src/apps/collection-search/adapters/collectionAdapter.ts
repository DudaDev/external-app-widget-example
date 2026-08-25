import type { RefObject } from 'react';
import type {
  CollectionAdapter,
  CollectionItem,
  CollectionsAPI,
  SearchResult,
} from 'src/types/collection.types';

function normalize(raw: Record<string, unknown>, index: number): CollectionItem {
  if (raw.data && typeof raw.data === 'object') {
    const item = raw as unknown as CollectionItem;
    return { ...item, id: item.page_item_url ?? `item-${index}` };
  }
  const { page_item_url, ...rest } = raw;
  const url = page_item_url as string | undefined;
  return { id: url ?? `item-${index}`, page_item_url: url, data: rest };
}

export function createCollectionAdapter(
  collectionName: string,
  collectionAPIRef: RefObject<CollectionsAPI | null>
): CollectionAdapter {
  async function search(query: string, signal?: AbortSignal): Promise<SearchResult> {
    const api = collectionAPIRef.current;
    if (!api) throw new Error('DM Collections API is not available');

    const response = await api.data(collectionName).search(query).pageSize(100).get();

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const results: CollectionItem[] = (response?.values ?? []).map((raw, i) => normalize(raw as unknown as Record<string, unknown>, i));
    if (import.meta.env?.DEV && results.length >= 100) {
      console.warn(
        `[collectionAdapter] search returned ${results.length} items — results may be truncated at the 100-item page size`
      );
    }
    return { results, count: results.length };
  }

  async function getSchema(_signal?: AbortSignal): Promise<string[]> {
    const api = collectionAPIRef.current;
    if (!api) return [];

    if (typeof api.schema === 'function') {
      const schema = await api.schema(collectionName).get();
      const fields = (schema?.fields ?? [])
        .map((f) => f.name ?? f.fieldName ?? f.key ?? '')
        .filter(Boolean);
      if (fields.length) return fields;
    } else if (import.meta.env?.DEV) {
      console.warn(
        `[collectionAdapter] api.schema is not available for "${collectionName}" — falling back to data sampling`
      );
    }

    const sample = await api.data(collectionName).pageSize(1).get();
    const first = sample?.values?.[0];
    if (!first) return [];
    const normalized = normalize(first as unknown as Record<string, unknown>, 0);
    return Object.keys(normalized.data);
  }

  // useFilterOptions (option discovery) and useSearch (the initial/empty-query
  // results) both call loadAll() independently. Without this, a collection
  // gets paginated in full twice on every widget mount that has a filter
  // configured. One adapter instance lives for the collectionName's whole
  // lifetime (see useCollectionSearch.ts's useMemo), so caching here — not
  // per-hook — is what actually de-dupes the fetch between them.
  let cachedLoadAll: Promise<CollectionItem[]> | null = null;

  async function fetchAllPages(): Promise<CollectionItem[]> {
    const api = collectionAPIRef.current;
    if (!api) throw new Error('DM Collections API is not available');

    const PAGE_SIZE = 100;
    const MAX_PAGES = 200; // hard cap at 20,000 items
    const all: CollectionItem[] = [];
    let currentOffset = 0;
    let pagesFetched = 0;

    // Check once — all builders from the same API instance have the same method set
    const supportsOffset = typeof api.data(collectionName).offset === 'function';

    while (pagesFetched < MAX_PAGES) {
      const builder = api.data(collectionName).pageSize(PAGE_SIZE);
      const response = await (supportsOffset ? builder.offset!(currentOffset) : builder).get();
      const page: CollectionItem[] = (response?.values ?? []).map((raw, i) => normalize(raw as unknown as Record<string, unknown>, currentOffset + i));
      all.push(...page);
      // If offset isn't supported we can only fetch one page — stop after the first
      if (page.length < PAGE_SIZE || !supportsOffset) break;
      currentOffset += PAGE_SIZE;
      pagesFetched++;
    }

    if (import.meta.env?.DEV && pagesFetched >= MAX_PAGES) {
      console.warn(
        `[collectionAdapter] loadAll reached the ${MAX_PAGES}-page limit (${MAX_PAGES * PAGE_SIZE} items). ` +
        `Results are truncated. Consider adding filters to reduce collection size.`
      );
    }

    return all;
  }

  async function loadAll(signal?: AbortSignal): Promise<CollectionItem[]> {
    if (!cachedLoadAll) {
      // A caller's own abort shouldn't cancel the fetch for other callers
      // sharing it, so the signal is checked only after the shared promise
      // settles, not threaded into the fetch loop itself.
      cachedLoadAll = fetchAllPages().catch((err: unknown) => {
        cachedLoadAll = null; // don't cache a failure
        throw err;
      });
    }
    const result = await cachedLoadAll;
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return result;
  }

  return { search, getSchema, loadAll };
}
