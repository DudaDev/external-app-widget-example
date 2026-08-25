import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SearchEmptyState, SearchErrorState, SearchInitialState } from '../../components/SearchStates';

describe('SearchEmptyState', () => {
  it('renders the title', () => {
    render(<SearchEmptyState title="No results found" subtitle="Try a different term" />);
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<SearchEmptyState title="No results found" subtitle="Try a different term" />);
    expect(screen.getByText('Try a different term')).toBeInTheDocument();
  });

  it('renders both title and subtitle together', () => {
    render(<SearchEmptyState title="Nothing here" subtitle="Adjust your query" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Adjust your query')).toBeInTheDocument();
  });

  it('has role="status" on the container', () => {
    render(<SearchEmptyState title="No results" subtitle="Try again" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('decorative SVG icon is aria-hidden', () => {
    const { container } = render(<SearchEmptyState title="No results" subtitle="Try again" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('SearchErrorState', () => {
  it('renders with default title and subtitle', () => {
    render(<SearchErrorState />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Please try again.')).toBeInTheDocument();
  });

  it('renders custom title and subtitle', () => {
    render(<SearchErrorState title="Custom error" subtitle="Try refreshing" />);
    expect(screen.getByText('Custom error')).toBeInTheDocument();
    expect(screen.getByText('Try refreshing')).toBeInTheDocument();
  });

  it('has role="alert" on the container', () => {
    render(<SearchErrorState />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('decorative SVG icon is aria-hidden', () => {
    const { container } = render(<SearchErrorState />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('SearchInitialState', () => {
  it('renders the prompt text', () => {
    render(<SearchInitialState text="Enter a search term to get started" />);
    expect(screen.getByText('Enter a search term to get started')).toBeInTheDocument();
  });

  it('renders custom text', () => {
    render(<SearchInitialState text="What are you looking for?" />);
    expect(screen.getByText('What are you looking for?')).toBeInTheDocument();
  });

  it('has role="status" on the container', () => {
    render(<SearchInitialState text="Start searching" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('decorative SVG icon is aria-hidden', () => {
    const { container } = render(<SearchInitialState text="Start searching" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
