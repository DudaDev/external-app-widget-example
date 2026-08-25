/**
 Searches a DM collection and renders results as a paginated card grid.
 Uses window.dmAPI.loadCollectionsAPI()

  Expected props (set in DM Widget Builder Content Editor):
    searchTitle        {string}    widget heading
    searchSubtitle     {string}    optional subheading
    searchPlaceholder  {string}    input placeholder text
    searchButtonText   {string}    search button label
    noResultsText      {string}    empty-state heading
    noResultsSubtext   {string}    empty-state body
    initialStateText   {string}    pre-search prompt text
    readMoreText       {string}    card link label
    collectionName     {string}    DM collection name to search
    titleField         {string}    override auto-detected title field
    descField          {string}    override auto-detected description field
    imageField         {string}    override auto-detected image field
    linkField          {string}    override auto-detected link field
    categoryField      {string}    override auto-detected category field (hidden when blank)
    metaField          {string}    override auto-detected meta field (hidden when blank)
    pageSize           {number}    results per page (default: 9)
    resultColumns      {number}    grid columns (overridden by breakpoints) (default: 3)
    dynamicPageBase    {string}    base path for dynamic page links e.g. '/articles'
    filterFields       {string}    comma-separated field names to show as filter dropdowns
    multiSelectFields  {string}    comma-separated subset of filterFields for multi-select
    sortFields         {string}    comma-separated field names to offer in sort dropdown

  Design props (map to CSS custom properties; leave empty to use the stylesheet default):
    accentColor        {string}    primary/button/link colour      (default CSS: #3B82F6)
    bgColor            {string}    widget background colour        (default CSS: #ffffff)
    borderColor        {string}    border/divider colour           (default CSS: #E5E7EB)
    textColor          {string}    primary text colour             (default CSS: #111827)
    textMutedColor     {string}    secondary/muted text colour     (default CSS: #6B7280)
    cardBorderRadius   {string}    card corner radius e.g. '8px'  (default CSS: 12px)
 */
import type { CSSProperties } from 'react';
import type { CollectionItem } from 'src/types/collection.types';
import { useCollectionSearch } from './hooks/useCollectionSearch';
import type { ItemProps, OnErrorContext } from './hooks/useCollectionSearch';
import { useCollectionTheme }   from './hooks/useCollectionTheme';
export { DM_API_TIMEOUT_MS } from './hooks/useCollectionSearch';
import { SEARCH_STATE } from './hooks/useSearch';
import type { SearchStateValue } from './hooks/useSearch';
import styles from './app.module.css';
import SearchBar   from './components/SearchBar';
import Filters     from './components/Filters';
import ResultsGrid from './components/ResultsGrid';
import Pagination  from './components/Pagination';
import ErrorBoundary from './components/ErrorBoundary';
import { SearchEmptyState, SearchErrorState, SearchInitialState } from './components/SearchStates';

interface SearchBodyProps {
  searchState: SearchStateValue;
  allResults: CollectionItem[];
  currentResults: CollectionItem[];
  itemProps: ItemProps;
  noResultsText: string;
  noResultsSubtext: string;
  initialStateText: string;
}

function SearchBody({
  searchState,
  allResults,
  currentResults,
  itemProps,
  noResultsText,
  noResultsSubtext,
  initialStateText,
}: SearchBodyProps) {
  if (searchState === SEARCH_STATE.RESULTS && allResults.length > 0) {
    return <ErrorBoundary><ResultsGrid results={currentResults} {...itemProps} /></ErrorBoundary>;
  }
  if (searchState === SEARCH_STATE.ERROR) {
    return <SearchErrorState />;
  }
  if (
    searchState === SEARCH_STATE.EMPTY ||
    (searchState === SEARCH_STATE.RESULTS && allResults.length === 0)
  ) {
    return <SearchEmptyState title={noResultsText} subtitle={noResultsSubtext} />;
  }
  return <SearchInitialState text={initialStateText} />;
}

export interface CollectionSearchContent {
  searchTitle?: string;
  searchSubtitle?: string;
  searchPlaceholder?: string;
  searchButtonText?: string;
  noResultsText?: string;
  noResultsSubtext?: string;
  initialStateText?: string;
  readMoreText?: string;
  loadingText?: string;
  prevText?: string;
  nextText?: string;
}

export interface CollectionSearchFields {
  collectionName?: string;
  titleField?: string;
  descField?: string;
  imageField?: string;
  linkField?: string;
  categoryField?: string;
  metaField?: string;
  dynamicPageBase?: string;
  filterFields?: string;
  multiSelectFields?: string;
  sortFields?: string;
}

export interface CollectionSearchDisplay {
  pageSize?: number | string;
  resultColumns?: number | string;
}

export interface CollectionSearchTheme {
  accentColor?: string;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  textMutedColor?: string;
  cardBorderRadius?: string;
}

export type { OnErrorContext };

export interface CollectionSearchAppProps {
  content?: CollectionSearchContent;
  fields?: CollectionSearchFields;
  display?: CollectionSearchDisplay;
  theme?: CollectionSearchTheme;
  onError?: (err: unknown, context: OnErrorContext) => void;
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === 'string' ? v : undefined;
}

function getNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const v = obj[key];
  if (typeof v === 'number' && !isNaN(v)) return v;
  if (typeof v === 'string') { const n = Number(v); return isNaN(n) ? undefined : n; }
  return undefined;
}

export function parseCollectionSearchProps(flat: Record<string, unknown>): CollectionSearchAppProps {
  return {
    content: {
      searchTitle:       getString(flat, 'searchTitle'),
      searchSubtitle:    getString(flat, 'searchSubtitle'),
      searchPlaceholder: getString(flat, 'searchPlaceholder'),
      searchButtonText:  getString(flat, 'searchButtonText'),
      noResultsText:     getString(flat, 'noResultsText'),
      noResultsSubtext:  getString(flat, 'noResultsSubtext'),
      initialStateText:  getString(flat, 'initialStateText'),
      readMoreText:      getString(flat, 'readMoreText'),
      loadingText:       getString(flat, 'loadingText'),
      prevText:          getString(flat, 'prevText'),
      nextText:          getString(flat, 'nextText'),
    },
    fields: {
      collectionName:    getString(flat, 'collectionName'),
      titleField:        getString(flat, 'titleField'),
      descField:         getString(flat, 'descField'),
      imageField:        getString(flat, 'imageField'),
      linkField:         getString(flat, 'linkField'),
      categoryField:     getString(flat, 'categoryField'),
      metaField:         getString(flat, 'metaField'),
      dynamicPageBase:   getString(flat, 'dynamicPageBase'),
      filterFields:      getString(flat, 'filterFields'),
      multiSelectFields: getString(flat, 'multiSelectFields'),
      sortFields:        getString(flat, 'sortFields'),
    },
    display: {
      pageSize:      getNumber(flat, 'pageSize'),
      resultColumns: getNumber(flat, 'resultColumns'),
    },
    theme: {
      accentColor:      getString(flat, 'accentColor'),
      bgColor:          getString(flat, 'bgColor'),
      borderColor:      getString(flat, 'borderColor'),
      textColor:        getString(flat, 'textColor'),
      textMutedColor:   getString(flat, 'textMutedColor'),
      cardBorderRadius: getString(flat, 'cardBorderRadius'),
    },
  };
}

export default function CollectionSearchApp({
  content  = {},
  fields   = {},
  display  = {},
  theme    = {},
  onError,
}: CollectionSearchAppProps) {
  const {
    searchTitle       = 'Search',
    searchSubtitle    = '',
    searchPlaceholder = 'Search...',
    searchButtonText  = 'Search',
    noResultsText     = 'No results found',
    noResultsSubtext  = 'Try a different search term or adjust your filters',
    initialStateText  = 'Enter a search term to get started',
    readMoreText      = 'Read more →',
    loadingText       = 'Searching...',
    prevText          = 'Prev',
    nextText          = 'Next',
  } = content;
  const {
    collectionName    = '',
    titleField        = '',
    descField         = '',
    imageField        = '',
    linkField         = '',
    categoryField     = '',
    metaField         = '',
    dynamicPageBase   = '',
    filterFields      = '',
    multiSelectFields = '',
    sortFields        = '',
  } = fields;
  const { pageSize = 9, resultColumns = 3 } = display;
  const {
    accentColor      = '',
    bgColor          = '',
    borderColor      = '',
    textColor        = '',
    textMutedColor   = '',
    cardBorderRadius = '',
  } = theme;

  const {
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
  } = useCollectionSearch({
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
  });

  const { cssVars } = useCollectionTheme({
    resultColumns,
    accentColor,
    bgColor,
    borderColor,
    textColor,
    textMutedColor,
    cardBorderRadius,
  });

  return (
    <div ref={containerRef} className={styles.container} style={cssVars as CSSProperties}>
      <div className={styles.searchWidgetContainer}>
        {dmApiTimedOut && (
          <p role="alert" className={styles.searchWarning}>
            Connection timeout — live search is unavailable. Showing demo data.
          </p>
        )}
        {filterError && (
          <p role="alert" className={styles.searchWarning}>
            {filterError}
          </p>
        )}

        <div className={styles.searchHeader}>
          <h2 className={styles.searchTitle}>{searchTitle}</h2>
          {searchSubtitle && <p className={styles.searchSubtitle}>{searchSubtitle}</p>}
        </div>

        <SearchBar
          placeholder={searchPlaceholder}
          buttonText={searchButtonText}
          onSearch={handleSearch}
          onClear={handleClear}
          disabled={loading}
        />

        {showFilters && (
          <Filters
            filterConfig={filterConfig}
            filterOptions={filterOptions}
            activeFilters={activeFilters}
            sort={sort}
            sortFields={sortFieldsList}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            onClearAll={handleClearFilters}
          />
        )}

        <div className={styles.searchMeta}>
          {loading && (
            <span className={styles.searchLoading}>
              <span className={styles.spinner} aria-label="Loading" /> {loadingText}
            </span>
          )}
          {!loading && countText && (
            <span className={styles.searchResultsCount} aria-live="polite" aria-atomic="true">
              {countText}
            </span>
          )}
        </div>

        <div role="region" aria-label="Search results" aria-live="polite">
          <SearchBody
            searchState={searchState}
            allResults={allResults}
            currentResults={currentResults}
            itemProps={itemProps}
            noResultsText={noResultsText}
            noResultsSubtext={noResultsSubtext}
            initialStateText={initialStateText}
          />
        </div>

        {searchState === SEARCH_STATE.RESULTS && allResults.length > 0 && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            prevText={prevText}
            nextText={nextText}
          />
        )}
      </div>
    </div>
  );
}
