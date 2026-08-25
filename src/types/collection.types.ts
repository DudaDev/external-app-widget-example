// Produced by a CollectionAdapter. Adapters normalize raw API responses so .data is always
// present.
export interface CollectionItem {
  id: string;
  page_item_url?: string;
  data: Record<string, unknown>;
}

export interface SearchResult {
  results: CollectionItem[];
  count: number;
}

export interface FieldRoles {
  title: string;
  desc: string;
  image: string;
  category: string;
  meta: string;
  link: string;
}

export interface SortState {
  field: string;
  dir: 'asc' | 'desc';
}

export interface FilterConfig {
  field: string;
  type: 'dropdown' | 'multiselect';
}

export type ActiveFilters = Record<string, string | string[] | null | undefined>;
export type FilterOptions = Record<string, string[]>;

export interface CollectionAdapter {
  search: (query: string, signal?: AbortSignal) => Promise<SearchResult>;
  getSchema: (signal?: AbortSignal) => Promise<string[]>;
  loadAll: (signal?: AbortSignal) => Promise<CollectionItem[]>;
}

// DM host-injected API (available as window.dmAPI in the widget runtime)
export interface CollectionDataBuilder {
  search: (query: string) => CollectionDataBuilder;
  pageSize: (size: number) => CollectionDataBuilder;
  // Not guaranteed across all DM runtime versions. Always check before calling.
  offset?: (n: number) => CollectionDataBuilder;
  get: () => Promise<{ values?: CollectionItem[] }>;
}

export interface CollectionSchemaField {
  name?: string;
  fieldName?: string;
  key?: string;
}

export interface CollectionSchemaBuilder {
  get: () => Promise<{ fields?: CollectionSchemaField[] }>;
}

export interface CollectionsAPI {
  data: (name: string) => CollectionDataBuilder;
  schema?: (name: string) => CollectionSchemaBuilder;
}

interface DmAPI {
  loadCollectionsAPI: () => Promise<CollectionsAPI>;
}

declare global {
  interface Window {
    dmAPI?: DmAPI;
  }
}
