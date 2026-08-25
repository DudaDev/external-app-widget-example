import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from '../../components/Pagination';

function renderPagination(overrides: Record<string, unknown> = {}) {
  const props = {
    currentPage: 1,
    totalPages: 5,
    onPageChange: vi.fn(),
    prevText: 'Prev',
    nextText: 'Next',
    ...overrides,
  };
  return { ...render(<Pagination {...props as any} />), props };
}

describe('Pagination', () => {
  it('renders current page and total pages', () => {
    renderPagination({ currentPage: 2, totalPages: 8 });
    expect(screen.getByText('Page 2 of 8')).toBeInTheDocument();
  });

  it('renders prevText and nextText as visible button content', () => {
    renderPagination({ prevText: 'Back', nextText: 'Forward' });
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.getByText('Forward')).toBeInTheDocument();
  });

  it('wraps pagination in a nav landmark', () => {
    renderPagination();
    expect(screen.getByRole('navigation', { name: 'Results pagination' })).toBeInTheDocument();
  });

  it('prev button has aria-label="Previous page"', () => {
    renderPagination();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument();
  });

  it('next button has aria-label="Next page"', () => {
    renderPagination();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument();
  });

  it('disables the prev button on the first page', () => {
    renderPagination({ currentPage: 1 });
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();
  });

  it('enables the prev button when not on the first page', () => {
    renderPagination({ currentPage: 2 });
    expect(screen.getByRole('button', { name: /prev/i })).not.toBeDisabled();
  });

  it('disables the next button on the last page', () => {
    renderPagination({ currentPage: 5, totalPages: 5 });
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('enables the next button when not on the last page', () => {
    renderPagination({ currentPage: 3, totalPages: 5 });
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  it('calls onPageChange with currentPage - 1 when prev is clicked', async () => {
    const { props } = renderPagination({ currentPage: 3 });
    await userEvent.click(screen.getByRole('button', { name: /prev/i }));
    expect(props.onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with currentPage + 1 when next is clicked', async () => {
    const { props } = renderPagination({ currentPage: 3 });
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(props.onPageChange).toHaveBeenCalledWith(4);
  });
});
