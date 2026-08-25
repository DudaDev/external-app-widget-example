import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CollectionSearchApp, { DM_API_TIMEOUT_MS, parseCollectionSearchProps } from '../index';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const defaultProps = {
  content: {
    searchTitle: 'Search Articles',
    searchPlaceholder: 'Type to search...',
    searchButtonText: 'Search',
    initialStateText: 'Enter a search term to get started',
    noResultsText: 'No results found',
    noResultsSubtext: 'Try a different term',
  },
};

describe('CollectionSearchApp (demo mode)', () => {
  it('renders the widget title', () => {
    render(<CollectionSearchApp {...defaultProps} />);
    expect(screen.getByText('Search Articles')).toBeInTheDocument();
  });

  it('shows the initial state prompt on mount', () => {
    render(<CollectionSearchApp {...defaultProps} />);
    expect(screen.getByText('Enter a search term to get started')).toBeInTheDocument();
  });

  it('does not show results or empty state on mount', () => {
    render(<CollectionSearchApp {...defaultProps} />);
    expect(screen.queryByText('No results found')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /read more/i })).not.toBeInTheDocument();
  });

  it('shows results after a demo search', async () => {
    render(<CollectionSearchApp {...defaultProps} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'react' } });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => expect(screen.getByText(/result.* found/i)).toBeInTheDocument(),
      { timeout: 2000 });

    expect(screen.getAllByRole('link').length).toBeGreaterThan(0);
  });

  it('result titles contain the search query', async () => {
    render(<CollectionSearchApp {...defaultProps} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'vitest' } });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => expect(screen.getByText(/result.* found/i)).toBeInTheDocument(),
      { timeout: 2000 });

    expect(screen.getAllByText(/vitest/i).length).toBeGreaterThan(0);
  });

  it('resets to the initial state when the clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<CollectionSearchApp {...defaultProps} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'react' } });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => expect(screen.getByText(/result.* found/i)).toBeInTheDocument(),
      { timeout: 2000 });

    await user.click(screen.getByRole('button', { name: /clear search/i }));

    expect(screen.getByText('Enter a search term to get started')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /read more/i })).not.toBeInTheDocument();
  });

  it('shows pagination when results exceed pageSize', async () => {
    render(<CollectionSearchApp {...defaultProps} display={{ pageSize: 1 }} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'anything' } });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => expect(screen.getByText(/page 1 of/i)).toBeInTheDocument(),
      { timeout: 2000 });
  });

  it('navigates to page 2 when the Next button is clicked', async () => {
    const user = userEvent.setup();
    render(<CollectionSearchApp {...defaultProps} display={{ pageSize: 1 }} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'react' } });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => expect(screen.getByText(/page 1 of/i)).toBeInTheDocument(),
      { timeout: 2000 });

    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText(/page 2 of/i)).toBeInTheDocument();
  });
});

describe('CollectionSearchApp (dmAPI timeout)', () => {
  it('shows a degraded-mode warning when dmAPI does not resolve within the timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('dmAPI', {
      loadCollectionsAPI: () => new Promise(() => {}), // never resolves
    });

    render(<CollectionSearchApp {...defaultProps} fields={{ collectionName: 'articles' }} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DM_API_TIMEOUT_MS + 1);
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('CollectionSearchApp (error and filter states)', () => {
  it('shows error message when the collections API is unavailable', async () => {
    render(<CollectionSearchApp {...defaultProps} fields={{ collectionName: 'articles' }} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(
      () => expect(screen.getByText(/error searching/i)).toBeInTheDocument(),
      { timeout: 2000 },
    );
  });

  it('selecting a filter in initial state triggers a search and shows results', async () => {
    render(<CollectionSearchApp {...defaultProps} />);

    const categorySelect = await waitFor(
      () => screen.getByRole('combobox', { name: /filter by category/i }),
      { timeout: 2000 },
    );

    fireEvent.change(categorySelect, { target: { value: 'Technology' } });

    await waitFor(
      () => expect(screen.getAllByRole('article').length).toBeGreaterThan(0),
      { timeout: 2000 },
    );
  });

  it('toggles sort direction between ascending and descending', async () => {
    const user = userEvent.setup();
    render(<CollectionSearchApp {...defaultProps} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'react' } });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => expect(screen.getByText(/result.* found/i)).toBeInTheDocument(),
      { timeout: 2000 });

    const sortSelect = screen.getByRole('combobox', { name: /sort by field/i });
    fireEvent.change(sortSelect, { target: { value: 'title' } });

    const dirBtn = await waitFor(
      () => screen.getByRole('button', { name: /sort descending/i }),
      { timeout: 1000 },
    );
    await user.click(dirBtn);

    expect(screen.getByRole('button', { name: /sort ascending/i })).toBeInTheDocument();
  });
});

// parseCollectionSearchProps is the actual boundary wired into
// src/entries/collection-search.tsx — it converts Duda's flat, all-string
// Content Editor values into the typed props CollectionSearchApp expects.
describe('parseCollectionSearchProps', () => {
  it('passes through string fields under their respective groups', () => {
    const result = parseCollectionSearchProps({
      searchTitle: 'Search Articles',
      collectionName: 'articles',
      dynamicPageBase: '/articles',
      accentColor: '#ff0000',
    });
    expect(result.content?.searchTitle).toBe('Search Articles');
    expect(result.fields?.collectionName).toBe('articles');
    expect(result.fields?.dynamicPageBase).toBe('/articles');
    expect(result.theme?.accentColor).toBe('#ff0000');
  });

  it('omits fields entirely absent from the flat input', () => {
    const result = parseCollectionSearchProps({});
    expect(result.content?.searchTitle).toBeUndefined();
    expect(result.fields?.collectionName).toBeUndefined();
  });

  it('drops a non-string value for a string field instead of passing it through', () => {
    // Duda's Content Editor always sends strings, but a defensive boundary
    // shouldn't trust that — a stray number/object should become undefined,
    // not leak into a prop typed as string.
    const result = parseCollectionSearchProps({ searchTitle: 42, collectionName: { nested: true } });
    expect(result.content?.searchTitle).toBeUndefined();
    expect(result.fields?.collectionName).toBeUndefined();
  });

  it('coerces a numeric string to a number for pageSize/resultColumns', () => {
    const result = parseCollectionSearchProps({ pageSize: '12', resultColumns: '4' });
    expect(result.display?.pageSize).toBe(12);
    expect(result.display?.resultColumns).toBe(4);
  });

  it('passes through an already-numeric pageSize unchanged', () => {
    const result = parseCollectionSearchProps({ pageSize: 9 });
    expect(result.display?.pageSize).toBe(9);
  });

  it('returns undefined for a non-numeric pageSize string, not NaN', () => {
    const result = parseCollectionSearchProps({ pageSize: 'not-a-number' });
    expect(result.display?.pageSize).toBeUndefined();
  });

  it('returns undefined for an actual NaN number value', () => {
    const result = parseCollectionSearchProps({ pageSize: NaN });
    expect(result.display?.pageSize).toBeUndefined();
  });
});
