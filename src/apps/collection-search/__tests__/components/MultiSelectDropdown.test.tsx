import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MultiSelectDropdown from '../../components/Filters/MultiSelectDropdown';

function renderDropdown(overrides: Record<string, unknown> = {}) {
  const onChange = vi.fn();
  const props = {
    field: 'category',
    options: ['Alpha', 'Beta', 'Gamma'],
    value: [] as string[],
    onChange,
    ...overrides,
  };
  return { ...render(<MultiSelectDropdown {...props as any} />), onChange: props.onChange };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MultiSelectDropdown', () => {
  it('renders the trigger button with the field label', () => {
    renderDropdown();
    expect(screen.getByRole('button', { name: /all category/i })).toBeInTheDocument();
  });

  it('panel is not visible initially', () => {
    renderDropdown();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });

  it('opens the panel when the trigger is clicked', async () => {
    const user = userEvent.setup();
    renderDropdown();
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('closes the panel on a second click of the trigger', async () => {
    const user = userEvent.setup();
    renderDropdown();
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('button'));
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });

  it('closes the panel on an outside click', async () => {
    const user = userEvent.setup();
    renderDropdown();
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });

  it('closes the panel on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderDropdown();
    const trigger = screen.getByRole('button');
    await user.click(trigger);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('moves focus exactly one option per ArrowDown press, not two', async () => {
    // Regression test: the panel is portaled to document.body, and React
    // bubbles portal keydown events through the component tree, so a
    // handler on both the wrapper and the panel used to fire twice per
    // keypress, skipping every other option.
    const user = userEvent.setup();
    renderDropdown();
    await user.click(screen.getByRole('button'));
    expect(screen.getByLabelText('Alpha')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByLabelText('Beta')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByLabelText('Gamma')).toHaveFocus();
  });

  it('calls onChange with the selected option in an array when checked', async () => {
    const user = userEvent.setup();
    const { onChange } = renderDropdown();
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByLabelText('Alpha'));
    expect(onChange).toHaveBeenCalledWith(['Alpha']);
  });

  it('calls onChange without the option when unchecked', async () => {
    const user = userEvent.setup();
    const { onChange } = renderDropdown({ value: ['Alpha', 'Beta'] });
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByLabelText('Alpha'));
    expect(onChange).toHaveBeenCalledWith(['Beta']);
  });

  it('shows the selection count in the trigger label when items are selected', () => {
    renderDropdown({ value: ['Alpha', 'Beta'] });
    expect(screen.getByRole('button', { name: /category \(2\)/i })).toBeInTheDocument();
  });

  it('panel renders via portal into document.body, not inside the wrapper div', async () => {
    const user = userEvent.setup();
    const { container } = renderDropdown();
    await user.click(screen.getByRole('button'));
    const alphaLabel = screen.getByLabelText('Alpha');
    expect(alphaLabel).toBeInTheDocument();
    expect(container.contains(alphaLabel)).toBe(false);
    expect(document.body.contains(alphaLabel)).toBe(true);
  });

  it('panel uses position:absolute (not fixed) so it tracks the trigger under any iframe scroll', async () => {
    const user = userEvent.setup();
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 100, left: 50, top: 64, right: 250, width: 200, height: 36,
      x: 50, y: 64, toJSON: () => {},
    } as DOMRect);
    renderDropdown();
    await user.click(screen.getByRole('button'));
    const panel = document.body.querySelector('[class*="multiPanel"]') as HTMLElement;
    expect(panel.style.position).toBe('absolute');
  });

  it('offsets panel top/left by window.scrollY/scrollX so it aligns after page scroll', async () => {
    const user = userEvent.setup();
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 100, left: 50, top: 64, right: 250, width: 200, height: 36,
      x: 50, y: 64, toJSON: () => {},
    } as DOMRect);
    Object.defineProperty(window, 'scrollY', { value: 300, configurable: true });
    Object.defineProperty(window, 'scrollX', { value: 20,  configurable: true });
    renderDropdown();
    await user.click(screen.getByRole('button'));
    const panel = document.body.querySelector('[class*="multiPanel"]') as HTMLElement;
    expect(panel.style.top).toBe('400px');  // 100 viewport + 300 scrollY
    expect(panel.style.left).toBe('70px');  // 50 viewport + 20 scrollX
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    Object.defineProperty(window, 'scrollX', { value: 0, configurable: true });
  });
});
