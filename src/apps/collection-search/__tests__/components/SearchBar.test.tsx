import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from '../../components/SearchBar';

function renderSearchBar(overrides: Record<string, unknown> = {}) {
  const props = {
    placeholder: 'Search...',
    buttonText: 'Search',
    onSearch: vi.fn(),
    onClear: vi.fn(),
    disabled: false,
    ...overrides,
  };
  return { ...render(<SearchBar {...props as any} />), props };
}

describe('SearchBar', () => {
  it('renders the input with the given placeholder', () => {
    renderSearchBar({ placeholder: 'Find something...' });
    expect(screen.getByPlaceholderText('Find something...')).toBeInTheDocument();
  });

  it('renders the search button with the given label', () => {
    renderSearchBar({ buttonText: 'Go' });
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
  });

  it('does not show the clear button when the input is empty', () => {
    renderSearchBar();
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument();
  });

  it('shows the clear button after typing', async () => {
    renderSearchBar();
    await userEvent.type(screen.getByRole('textbox'), 'hello');
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
  });

  it('calls onSearch with the current input value when the search button is clicked', async () => {
    const { props } = renderSearchBar();
    await userEvent.type(screen.getByRole('textbox'), 'react');
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }));
    expect(props.onSearch).toHaveBeenCalledWith('react');
  });

  it('calls onSearch when Enter is pressed in the input', async () => {
    const { props } = renderSearchBar();
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'vitest{Enter}');
    expect(props.onSearch).toHaveBeenCalledWith('vitest');
  });

  it('clears the input and calls onClear when the clear button is clicked', async () => {
    const { props } = renderSearchBar();
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'hello');
    await userEvent.click(screen.getByRole('button', { name: /clear search/i }));
    expect(input).toHaveValue('');
    expect(props.onClear).toHaveBeenCalledOnce();
  });

  it('disables the input and search button when disabled is true', () => {
    renderSearchBar({ disabled: true });
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();
  });

  describe('accessibility', () => {
    it('SearchIcon SVG is aria-hidden', () => {
      const { container } = renderSearchBar();
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('ClearIcon SVG is aria-hidden', async () => {
      const user = userEvent.setup();
      const { container } = renderSearchBar();
      await user.type(screen.getByRole('textbox'), 'hello');
      const svgs = container.querySelectorAll('svg');
      expect(svgs[1]).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
