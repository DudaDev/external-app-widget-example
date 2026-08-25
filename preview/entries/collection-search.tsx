import { createRoot } from 'react-dom/client';
import CollectionSearchApp, { parseCollectionSearchProps } from 'apps/collection-search';
import '../../src/index.css';

// collectionName left blank. Falls back to built-in demo data outside a
// real Duda page.
const flatProps = {
  searchTitle: 'Search',
  searchSubtitle: '',
  searchPlaceholder: 'Search...',
  searchButtonText: 'Search',
  noResultsText: 'No results found',
  noResultsSubtext: 'Try a different search term',
  initialStateText: 'Enter a search term to get started',
  readMoreText: 'View details',
  collectionName: '',
  titleField: '',
  descField: '',
  imageField: '',
  linkField: '',
  categoryField: '',
  metaField: '',
  pageSize: 9,
  resultColumns: 3,
  dynamicPageBase: '',
  filterFields: '',
  multiSelectFields: '',
  sortFields: '',
};

createRoot(document.getElementById('root')!).render(
  <CollectionSearchApp {...parseCollectionSearchProps(flatProps)} />
);
