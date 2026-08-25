import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResultsGrid from '../../components/ResultsGrid';
import type { CollectionItem } from 'src/types/collection.types';

function makeItem(i: number): CollectionItem {
  return {
    id: `/item-${i}`,
    page_item_url: `/item-${i}`,
    data: {
      title: `Item ${i}`,
      description: `Description for item ${i}`,
      link: `/item-${i}`,
    },
  };
}

const sharedProps = {
  getValue: (item: CollectionItem, field: string): string => String(((item.data ?? {}) as Record<string, unknown>)[field] ?? ''),
  buildLinkUrl: (item: CollectionItem) => String(item.data?.['link'] ?? ''),
  titleField: 'title',
  descField: 'description',
  imageField: '',
  categoryField: '',
  metaField: '',
  readMoreText: 'Read more →',
};

describe('ResultsGrid', () => {
  it('renders one card per result', () => {
    const results = [makeItem(1), makeItem(2), makeItem(3)];
    render(<ResultsGrid results={results} {...sharedProps} />);
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('renders the correct title for each card', () => {
    const results = [makeItem(1), makeItem(2)];
    render(<ResultsGrid results={results} {...sharedProps} />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('renders nothing when results array is empty', () => {
    const { container } = render(<ResultsGrid results={[]} {...sharedProps} />);
    expect(container.querySelectorAll('a')).toHaveLength(0);
  });

  it('renders a list element with role="list"', () => {
    const results = [makeItem(1)];
    render(<ResultsGrid results={results} {...sharedProps} />);
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('wraps each card in a list item', () => {
    const results = [makeItem(1), makeItem(2)];
    render(<ResultsGrid results={results} {...sharedProps} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
