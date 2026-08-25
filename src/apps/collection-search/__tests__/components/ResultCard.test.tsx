import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResultCard from '../../components/ResultCard';
import type { CollectionItem } from 'src/types/collection.types';

const item: CollectionItem = {
  id: 'test-post',
  page_item_url: '/articles/test-post',
  data: {
    title: 'Test Post',
    description: 'A test description.',
    image: 'https://example.com/img.jpg',
    category: 'Engineering',
    date: '2024-01-15',
    url: '/articles/test-post',
  },
};

function getValue(i: CollectionItem, field: string): unknown {
  if (!field) return '';
  const src = i.data ?? (i as unknown as Record<string, unknown>);
  const val = src[field];
  return val != null ? val : '';
}

function buildLinkUrl(i: CollectionItem): string {
  return String(i.data?.['url'] ?? '');
}

function buildLinkUrlEmpty(_i: CollectionItem): string {
  return '';
}

function renderCard(overrides: Record<string, unknown> = {}) {
  const props = {
    item,
    getValue,
    buildLinkUrl,
    titleField: 'title',
    descField: 'description',
    imageField: 'image',
    categoryField: 'category',
    metaField: 'date',
    readMoreText: 'Read more →',
    ...overrides,
  };
  return render(<ResultCard {...props as any} />);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ResultCard', () => {
  it('renders the title', () => {
    renderCard();
    expect(screen.getByText('Test Post')).toBeInTheDocument();
  });

  it('renders the description', () => {
    renderCard();
    expect(screen.getByText('A test description.')).toBeInTheDocument();
  });

  it('renders the card link with the correct href and accessible name', () => {
    renderCard();
    const link = screen.getByRole('link', { name: 'Test Post' });
    expect(link).toHaveAttribute('href', '/articles/test-post');
  });

  it('renders the visual "read more" text', () => {
    renderCard();
    expect(screen.getByText('Read more →')).toBeInTheDocument();
  });

  it('does not render a link or read-more text when linkUrl is empty', () => {
    renderCard({ buildLinkUrl: buildLinkUrlEmpty });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText('Read more →')).not.toBeInTheDocument();
  });

  it('renders the category badge when categoryField is provided', () => {
    renderCard();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });

  it('does not render a category badge when categoryField is empty', () => {
    renderCard({ categoryField: '' });
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
  });

  it('renders the meta field when metaField is provided', () => {
    renderCard();
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
  });

  it('does not render the meta section when metaField is empty', () => {
    renderCard({ metaField: '' });
    expect(screen.queryByText('2024-01-15')).not.toBeInTheDocument();
  });

  it('renders the image when imageField resolves to a URL', () => {
    renderCard();
    const img = screen.getByRole('img', { name: 'Test Post' });
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
  });

  it('does not render an img element when imageField is empty', () => {
    renderCard({ imageField: '' });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('link is the sole focusable interactive element (no tabIndex on article)', () => {
    renderCard();
    const article = screen.getByRole('article');
    expect(article).not.toHaveAttribute('tabindex');
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
  });

  it('there is exactly one link per card when safeLink is set', () => {
    renderCard();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('the read-more link contains the visible readMoreText and is not aria-hidden', () => {
    renderCard();
    const link = screen.getByRole('link', { name: 'Test Post' });
    expect(link).toHaveTextContent('Read more →');
    expect(link).not.toHaveAttribute('aria-hidden', 'true');
  });

  it('link uses target="_top" for safe iframe navigation', () => {
    renderCard();
    expect(screen.getByRole('link')).toHaveAttribute('target', '_top');
  });

  it('link has rel="noopener noreferrer" to prevent reverse tabnapping', () => {
    renderCard();
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not render a link when the URL uses javascript: protocol', () => {
    const dangerousItem: CollectionItem = {
      ...item,
      data: { ...item.data, url: 'javascript:alert(1)' },
    };
    renderCard({ item: dangerousItem });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('removes the image when it fails to load', async () => {
    renderCard();
    const img = screen.getByRole('img', { name: 'Test Post' });
    fireEvent.error(img);
    await waitFor(() => expect(screen.queryByRole('img')).not.toBeInTheDocument());
  });
});
