import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Filters from '../../components/Filters';

const singleFilterConfig = [{ field: 'category', type: 'dropdown' as const }];

afterEach(() => {
  vi.restoreAllMocks();
});

const filterConfig = [{ field: 'category', type: 'multiselect' as const }];
const filterOptions = { category: ['Design', 'Health', 'Tech'] };

function renderFilters(overrides: Record<string, unknown> = {}) {
  const props = {
    filterConfig,
    filterOptions,
    activeFilters: {},
    sort: { field: '', dir: 'asc' as const },
    sortFields: [],
    onFilterChange: vi.fn(),
    onSortChange: vi.fn(),
    onClearAll: vi.fn(),
    ...overrides,
  };
  return { ...render(<Filters {...props as any} />), props };
}

describe('MultiSelectDropdown', () => {
  it('shows the "All Category" trigger button by default', () => {
    renderFilters();
    expect(screen.getByRole('button', { name: /all category/i })).toBeInTheDocument();
  });

  it('opens the checkbox panel when the trigger is clicked', async () => {
    const user = userEvent.setup();
    renderFilters();
    await user.click(screen.getByRole('button', { name: /all category/i }));
    expect(screen.getByRole('checkbox', { name: 'Design' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Health' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Tech' })).toBeInTheDocument();
  });

  it('calls onFilterChange when a checkbox is selected', async () => {
    const user = userEvent.setup();
    const { props } = renderFilters();
    await user.click(screen.getByRole('button', { name: /all category/i }));
    await user.click(screen.getByRole('checkbox', { name: 'Design' }));
    expect(props.onFilterChange).toHaveBeenCalledWith('category', ['Design']);
  });

  it('keeps the panel open after selecting a checkbox', async () => {
    const user = userEvent.setup();
    renderFilters();
    await user.click(screen.getByRole('button', { name: /all category/i }));
    await user.click(screen.getByRole('checkbox', { name: 'Design' }));
    expect(screen.getByRole('checkbox', { name: 'Tech' })).toBeInTheDocument();
  });

  it('closes the panel when Escape is pressed', async () => {
    const user = userEvent.setup();
    renderFilters();
    await user.click(screen.getByRole('button', { name: /all category/i }));
    expect(screen.getByRole('checkbox', { name: 'Design' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('checkbox', { name: 'Design' })).not.toBeInTheDocument();
  });

  it('closes the panel when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Filters
          filterConfig={filterConfig}
          filterOptions={filterOptions}
          activeFilters={{}}
          sort={{ field: '', dir: 'asc' }}
          sortFields={[]}
          onFilterChange={vi.fn()}
          onSortChange={vi.fn()}
          onClearAll={vi.fn()}
        />
        <div data-testid="outside">Outside</div>
      </div>,
    );

    await user.click(screen.getByRole('button', { name: /all category/i }));
    expect(screen.getByRole('checkbox', { name: 'Design' })).toBeInTheDocument();

    await user.click(screen.getByTestId('outside'));
    expect(screen.queryByRole('checkbox', { name: 'Design' })).not.toBeInTheDocument();
  });

  it('shows the active-count badge and updated trigger label when options are selected', () => {
    renderFilters({ activeFilters: { category: ['Design', 'Tech'] } });
    expect(screen.getByRole('button', { name: /category \(2\)/i })).toBeInTheDocument();
  });

  it('shows the "Clear filters" button when a filter is active', () => {
    renderFilters({ activeFilters: { category: ['Design'] } });
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });

  it('calls onClearAll when the "Clear filters" button is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderFilters({ activeFilters: { category: ['Design'] } });
    await user.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(props.onClearAll).toHaveBeenCalledTimes(1);
  });

  describe('accessibility', () => {
    it('sets aria-expanded false by default and true when open', async () => {
      const user = userEvent.setup();
      renderFilters();
      const trigger = screen.getByRole('button', { name: /all category/i });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('focuses the first checkbox when the panel opens', async () => {
      const user = userEvent.setup();
      renderFilters();
      await user.click(screen.getByRole('button', { name: /all category/i }));
      expect(screen.getByRole('checkbox', { name: 'Design' })).toHaveFocus();
    });

    it('moves focus to the next checkbox on ArrowDown', async () => {
      // Dispatched at the focused checkbox, not the trigger button — a real
      // ArrowDown fires wherever focus currently is, which is inside the
      // portaled panel once it's open (see the "focuses the first checkbox"
      // test above), not on the trigger.
      const user = userEvent.setup();
      renderFilters();
      await user.click(screen.getByRole('button', { name: /all category/i }));
      const design = screen.getByRole('checkbox', { name: 'Design' });
      expect(design).toHaveFocus();
      fireEvent.keyDown(design, { key: 'ArrowDown' });
      expect(screen.getByRole('checkbox', { name: 'Health' })).toHaveFocus();
    });

    it('moves focus to the previous checkbox on ArrowUp', async () => {
      const user = userEvent.setup();
      renderFilters();
      await user.click(screen.getByRole('button', { name: /all category/i }));
      const design = screen.getByRole('checkbox', { name: 'Design' });
      fireEvent.keyDown(design, { key: 'ArrowDown' });
      const health = screen.getByRole('checkbox', { name: 'Health' });
      expect(health).toHaveFocus();
      fireEvent.keyDown(health, { key: 'ArrowUp' });
      expect(screen.getByRole('checkbox', { name: 'Design' })).toHaveFocus();
    });

    it('returns focus to the trigger on Escape', async () => {
      const user = userEvent.setup();
      renderFilters();
      const trigger = screen.getByRole('button', { name: /all category/i });
      await user.click(trigger);
      await user.keyboard('{Escape}');
      expect(trigger).toHaveFocus();
    });
  });
});

describe('SingleDropdown', () => {
  function renderSingleFilters(overrides: Record<string, unknown> = {}) {
    const props = {
      filterConfig: singleFilterConfig,
      filterOptions: { category: ['Design', 'Health', 'Tech'] },
      activeFilters: {},
      sort: { field: '', dir: 'asc' as const },
      sortFields: [],
      onFilterChange: vi.fn(),
      onSortChange: vi.fn(),
      onClearAll: vi.fn(),
      ...overrides,
    };
    return { ...render(<Filters {...props as any} />), props };
  }

  it('renders the select with the field label as associated label', () => {
    renderSingleFilters();
    expect(screen.getByRole('combobox', { name: /filter by category/i })).toBeInTheDocument();
  });

  it('the label element is programmatically associated with the select via htmlFor/id', () => {
    const { container } = renderSingleFilters();
    const select = container.querySelector('select')!;
    const label = container.querySelector(`label[for="${select.id}"]`);
    expect(label).not.toBeNull();
    expect((label as HTMLLabelElement).htmlFor).toBe(select.id);
  });

  it('calls onFilterChange when an option is selected', async () => {
    const user = userEvent.setup();
    const { props } = renderSingleFilters();
    await user.selectOptions(screen.getByRole('combobox', { name: /filter by category/i }), 'Design');
    expect(props.onFilterChange).toHaveBeenCalledWith('category', 'Design');
  });
});
