import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../index.css', () => ({}));
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({ render: vi.fn() })),
}));

const { createWidgetLifecycle } = await import('../widgetLifecycle');
const { init } = createWidgetLifecycle(
  () => null,
  () => ({})
);

function buildChain(...ids: string[]): HTMLDivElement[] {
  const nodes = ids.map((id) => {
    const el = document.createElement('div');
    if (id) el.id = id;
    return el;
  });
  for (let i = 1; i < nodes.length; i++) {
    nodes[i - 1]!.parentElement;
    nodes[i]!.appendChild(nodes[i - 1]!);
  }
  document.body.appendChild(nodes[nodes.length - 1]!);
  return nodes;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('init() ancestor traversal', () => {
  it('sets height:auto on ancestors up to and including #widget_hue', () => {
    const [container, p1, p2, widgetHue] = buildChain('', '', '', 'widget_hue', '');

    init({ container: container!, props: {} });

    expect(p1!.style.getPropertyValue('height')).toBe('auto');
    expect(p2!.style.getPropertyValue('height')).toBe('auto');
    expect(widgetHue!.style.getPropertyValue('height')).toBe('auto');
  });

  it('does NOT set height:auto on ancestors beyond #widget_hue', () => {
    const [container, , , , p4] = buildChain('', '', '', 'widget_hue', '');

    init({ container: container!, props: {} });

    expect(p4!.style.getPropertyValue('height')).toBe('');
  });

  it('stops traversal at #widget_hue even when more ancestors exist', () => {
    const [container, widgetHue, beyond] = buildChain('', 'widget_hue', '');

    init({ container: container!, props: {} });

    expect(widgetHue!.style.getPropertyValue('height')).toBe('auto');
    expect(beyond!.style.getPropertyValue('height')).toBe('');
  });

  it('traverses past 8 ancestors when #widget_hue is deeply nested', () => {
    // Simulates Duda DOM structures where #widget_hue is more than 8 levels deep
    const [container, , , , , , , , , widgetHue] = buildChain(
      '', '', '', '', '', '', '', '', '', 'widget_hue', ''
    );

    init({ container: container!, props: {} });

    expect(widgetHue!.style.getPropertyValue('height')).toBe('auto');
  });

  it('does not emit a warning when #widget_hue is absent', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const [container] = buildChain('', '', '', '', '', '', '', '', '', '');

    init({ container: container!, props: {} });

    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('#widget_hue')
    );
  });
});
