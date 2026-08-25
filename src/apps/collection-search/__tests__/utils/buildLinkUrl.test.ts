import { describe, it, expect } from 'vitest';
import buildLinkUrl from '../../utils/buildLinkUrl';
import type { CollectionItem } from 'src/types/collection.types';

function getValue(item: CollectionItem, field: string): unknown {
  if (!field) return '';
  const src = (item.data ?? (item as unknown as Record<string, unknown>));
  const val = src[field];
  return val != null ? val : '';
}

const item: CollectionItem = {
  id: 'my-post',
  page_item_url: 'my-post',
  data: { title: 'Post', link: 'https://example.com/external' },
};

const itemNoSlug: CollectionItem = {
  id: 'no-slug',
  page_item_url: '',
  data: { title: 'Post', link: 'https://example.com/external' },
};

describe('buildLinkUrl', () => {
  it('combines dynBase with page_item_url', () => {
    expect(buildLinkUrl(item, '/articles', 'link', getValue))
      .toBe('/articles/my-post');
  });

  it('uses page_item_url alone when no dynBase', () => {
    expect(buildLinkUrl(item, '', 'link', getValue))
      .toBe('/my-post');
  });

  it('strips leading slashes from page_item_url before prepending base', () => {
    const slashedItem: CollectionItem = { id: 'slashed', page_item_url: '//my-post', data: {} };
    expect(buildLinkUrl(slashedItem, '/articles', 'link', getValue))
      .toBe('/articles/my-post');
  });

  it('falls back to linkField value when page_item_url is empty', () => {
    expect(buildLinkUrl(itemNoSlug, '/articles', 'link', getValue))
      .toBe('https://example.com/external');
  });

  it('returns empty string when page_item_url and linkField are both empty', () => {
    const bare: CollectionItem = { id: 'bare', page_item_url: '', data: {} };
    expect(buildLinkUrl(bare, '/articles', 'link', getValue))
      .toBe('');
  });
});
