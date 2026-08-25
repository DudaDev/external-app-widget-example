import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { RefObject } from 'react';
import type {
  CollectionItem,
  CollectionsAPI,
  ActiveFilters,
  SortState,
  FilterConfig,
  FilterOptions,
} from 'src/types/collection.types';
import detectFieldRoles     from '../utils/detectFieldRoles';
import buildLinkUrlUtil     from '../utils/buildLinkUrl';
import { applyFilters }     from '../utils/applyFilters';
import { getValue }         from '../utils/getValue';
import { createCollectionAdapter } from '../adapters/collectionAdapter';
import { createDemoAdapter }       from '../adapters/demoAdapter';
import { useSearch, SEARCH_STATE } from './useSearch';
import type { SearchStateValue, OnErrorContext } from './useSearch';
import { useFilterOptions }        from './useFilterOptions';

export { SEARCH_STATE };
export type { SearchStateValue, OnErrorContext };

export const DM_API_TIMEOUT_MS = 5000;

export interface ItemProps {
  getValue: (item: CollectionItem, field: string) => string;
  buildLinkUrl: (item: CollectionItem) => string;
  titleField: string;
  descField: string;
  imageField: string;
  categoryField: string;
  metaField: string;
  readMoreText: string;
}

export interface UseCollectionSearchParams {
  collectionName: string;
  titleField: string;
  descField: string;
  imageField: string;
  linkField: string;
  categoryField: string;
  metaField: string;
  dynamicPageBase: string;
  filterFields: string;
  multiSelectFields: string;
  sortFields: string;
  pageSize: number | string;
  readMoreText: string;
  onError?: (err: unknown, context: OnErrorContext) => void;
}

export interface UseCollectionSearchReturn {
  containerRef: RefObject<HTMLDivElement | null>;
  searchState: SearchStateValue;
  loading: boolean;
  allResults: CollectionItem[];
  currentResults: CollectionItem[];
  countText: string;
  totalPages: number;
  currentPage: number;
  activeFilters: ActiveFilters;
  sort: SortState;
  filterConfig: FilterConfig[];
  filterOptions: FilterOptions;
  filterError: string | null;
  sortFieldsList: string[];
  itemProps: ItemProps;
  showFilters: boolean;
  dmApiTimedOut: boolean;
  handleSearch: (query: string) => void;
  handleClear: () => void;
  handleFilterChange: (field: string, value: string | string[]) => void;
  handleSortChange: (newSort: SortState) => void;
  handleClearFilters: () => void;
  handlePageChange: (page: number) => void;
}

export function useCollectionSearch({
  collectionName,
  titleField,
  descField,
  imageField,
  linkField,
  categoryField,
  metaField,
  dynamicPageBase,
  filterFields,
  multiSelectFields,
  sortFields,
  pageSize,
  readMoreText,
  onError,
}: UseCollectionSearchParams): UseCollectionSearchReturn {
  const [currentPage,   setCurrentPage]   = useState(1);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [sort,          setSort]          = useState<SortState>({ field: '', dir: 'asc' });
  const [apiReady,      setApiReady]      = useState(false);
  const [dmApiTimedOut, setDmApiTimedOut] = useState(false);

  const collectionAPIRef = useRef<CollectionsAPI | null>(null);
  const containerRef     = useRef<HTMLDivElement>(null);

  const parsedPageSize = useMemo(() => parseInt(String(pageSize), 10) || 9, [pageSize]);

  const dynBase = useMemo(() => {
    // Normalize \ to / first: browsers do this too, so "/\evil.com" would
    // otherwise slip past the "//" check below and resolve as protocol-relative.
    let base = (dynamicPageBase || '').replace(/\\/g, '/').trim().replace(/\/+$/, '');
    if (!base) return '';
    if (!base.startsWith('/')) base = '/' + base;
    if (base.startsWith('//')) {
      console.warn(
        `[CollectionSearch] dynamicPageBase "${dynamicPageBase}" looks like a protocol-relative URL and was ignored`
      );
      return '';
    }
    try {
      new URL(base, 'http://x');
    } catch {
      console.warn(`[CollectionSearch] dynamicPageBase "${base}" is not a valid path`);
      return '';
    }
    return base;
  }, [dynamicPageBase]);

  const adapter = useMemo(() => {
    // collectionAPIRef is read inside createCollectionAdapter's async methods
    // only, never during render here.
    // eslint-disable-next-line react-hooks/refs
    if (collectionName) return createCollectionAdapter(collectionName, collectionAPIRef);
    return createDemoAdapter();
  }, [collectionName]);

  useEffect(() => {
    let cancelled = false;
    async function loadAPI() {
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), DM_API_TIMEOUT_MS));
      let api: CollectionsAPI | null = null;
      try {
        api = (await Promise.race([window.dmAPI?.loadCollectionsAPI(), timeout])) ?? null;
      } catch {
        api = null;
      }
      if (!cancelled) {
        collectionAPIRef.current = api;
        setApiReady(true);
        if (!api) setDmApiTimedOut(true);
      }
    }
    void loadAPI();
    return () => { cancelled = true; };
  }, []);

  const { rawResults, loading, searchState, errorText, runSearch, clearSearch } = useSearch(adapter, { onError });

  const { schemaFields, filterOptions, filterConfig, filterError } = useFilterOptions(adapter, {
    apiReady,
    rawResults,
    filterFields,
    multiSelectFields,
  });

  const detected               = useMemo(() => detectFieldRoles(schemaFields), [schemaFields]);
  const effectiveTitleField    = titleField    || detected.title    || 'title';
  const effectiveDescField     = descField     || detected.desc     || 'description';
  const effectiveImageField    = imageField    || detected.image    || '';
  const effectiveCategoryField = categoryField || detected.category || '';
  const effectiveMetaField     = metaField     || detected.meta     || '';
  const effectiveLinkField     = linkField     || detected.link     || 'link';

  const buildLinkUrl = useCallback(
    (item: CollectionItem) => buildLinkUrlUtil(item, dynBase, effectiveLinkField, getValue),
    [dynBase, effectiveLinkField]
  );

  const allResults = useMemo(
    () => applyFilters(rawResults, activeFilters, sort, getValue),
    [rawResults, activeFilters, sort]
  );

  const totalPages = Math.max(1, Math.ceil(allResults.length / parsedPageSize));

  const countText = useMemo(() => {
    if (errorText) return errorText;
    if (loading || searchState === SEARCH_STATE.INITIAL) return '';
    if (searchState === SEARCH_STATE.EMPTY || allResults.length === 0) return '0 results found';
    const raw      = rawResults.length;
    const filtered = allResults.length;
    if (filtered < raw) {
      return `${filtered} of ${raw} result${raw !== 1 ? 's' : ''} shown`;
    }
    return `${filtered} result${filtered !== 1 ? 's' : ''} found`;
  }, [errorText, loading, searchState, allResults, rawResults]);

  const sortFieldsList = useMemo(() => {
    if (sortFields) return sortFields.split(',').map((f: string) => f.trim()).filter(Boolean);
    return schemaFields.filter((f) => f !== effectiveImageField);
  }, [sortFields, schemaFields, effectiveImageField]);

  const handleClear = useCallback(() => {
    clearSearch();
    setCurrentPage(1);
    setActiveFilters({});
    setSort({ field: '', dir: 'asc' });
  }, [clearSearch]);

  const handleSearch = useCallback(
    (query: string) => {
      setCurrentPage(1);
      runSearch(query);
    },
    [runSearch]
  );

  const handleFilterChange = useCallback(
    (field: string, value: string | string[]) => {
      setActiveFilters((prev) => ({ ...prev, [field]: value }));
      setCurrentPage(1);
      if (searchState === SEARCH_STATE.INITIAL) runSearch('');
    },
    [searchState, runSearch]
  );

  const handleSortChange = useCallback((newSort: SortState) => {
    setSort(newSort);
    setCurrentPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setActiveFilters({});
    setSort({ field: '', dir: 'asc' });
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    containerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, []);

  const currentResults = allResults.slice(
    (currentPage - 1) * parsedPageSize,
    currentPage * parsedPageSize
  );

  const itemProps = useMemo<ItemProps>(
    () => ({
      getValue,
      buildLinkUrl,
      titleField:    effectiveTitleField,
      descField:     effectiveDescField,
      imageField:    effectiveImageField,
      categoryField: effectiveCategoryField,
      metaField:     effectiveMetaField,
      readMoreText,
    }),
    [buildLinkUrl, effectiveTitleField, effectiveDescField, effectiveImageField, effectiveCategoryField, effectiveMetaField, readMoreText]
  );

  const showFilters = filterConfig.length > 0 || sortFieldsList.length > 0;

  return {
    containerRef,
    searchState,
    loading,
    allResults,
    currentResults,
    countText,
    totalPages,
    currentPage,
    activeFilters,
    sort,
    filterConfig,
    filterOptions,
    filterError,
    sortFieldsList,
    itemProps,
    showFilters,
    dmApiTimedOut,
    handleSearch,
    handleClear,
    handleFilterChange,
    handleSortChange,
    handleClearFilters,
    handlePageChange,
  };
}
