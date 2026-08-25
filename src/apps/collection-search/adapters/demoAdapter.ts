import type { CollectionAdapter, CollectionItem, SearchResult } from 'src/types/collection.types';

export const DEMO_DELAY_MS = 600;

interface DemoAdapterOptions {
  schedule?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancel?: (id: ReturnType<typeof setTimeout> | undefined) => void;
  resultCount?: number | null;
}

export function createDemoAdapter({
  schedule = setTimeout,
  cancel = clearTimeout,
  resultCount = null,
}: DemoAdapterOptions = {}): CollectionAdapter {
  let pendingTimer: ReturnType<typeof setTimeout> | undefined;

  function search(query: string, signal?: AbortSignal): Promise<SearchResult> {
    if (signal?.aborted) {
      return Promise.reject(new DOMException('Search aborted', 'AbortError'));
    }
    return new Promise((resolve, reject) => {
      cancel(pendingTimer);
      pendingTimer = schedule(() => {
        if (signal?.aborted) {
          return reject(new DOMException('Search aborted', 'AbortError'));
        }
        const trimmedQuery = query.trim();
        const count = resultCount ?? Math.floor(Math.random() * 6) + 2;
        const results: CollectionItem[] = Array.from({ length: count }, (_, i) => ({
          id: `demo-item-${i + 1}`,
          page_item_url: `demo-item-${i + 1}`,
          data: {
            title: `Result ${i + 1} for "${trimmedQuery}"`,
            description: 'This is a sample result. Set collectionName to connect real data.',
            link: '#',
          },
        }));
        resolve({ results, count: results.length });
      }, DEMO_DELAY_MS);

      signal?.addEventListener(
        'abort',
        () => {
          cancel(pendingTimer);
          reject(new DOMException('Search aborted', 'AbortError'));
        },
        { once: true }
      );
    });
  }

  async function getSchema(_signal?: AbortSignal): Promise<string[]> {
    return ['title', 'description', 'category', 'link'];
  }

  async function loadAll(_signal?: AbortSignal): Promise<CollectionItem[]> {
    const categories = ['Technology', 'Design', 'Business', 'Health'];
    return Array.from({ length: 12 }, (_, i) => ({
      id: `demo-item-${i + 1}`,
      page_item_url: `demo-item-${i + 1}`,
      data: {
        title: `Demo Result ${i + 1}`,
        description: 'Sample result for demo mode. Set collectionName to connect real data.',
        category: categories[i % categories.length],
        link: '#',
      },
    }));
  }

  return { search, getSchema, loadAll };
}
