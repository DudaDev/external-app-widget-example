import { describe, it, expect, vi, afterEach } from 'vitest';
import { waitFor, act } from '@testing-library/react';
import { createWidgetLifecycle } from '../widgetLifecycle';

function StubApp() {
  return 'stub-widget-content';
}

const { init, clean } = createWidgetLifecycle(StubApp, () => ({}));

afterEach(() => {
  clean();
  vi.restoreAllMocks();
});

describe('widget lifecycle', () => {
  it('init renders the widget inside the container', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      init({ container, props: {} });
    });

    await waitFor(() => {
      expect(container.innerHTML).not.toBe('');
    });

    document.body.removeChild(container);
  });

  it('clean unmounts the widget and empties the container', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      init({ container, props: {} });
    });

    await waitFor(() => expect(container.innerHTML).not.toBe(''));

    await act(async () => {
      clean();
    });

    expect(container.innerHTML).toBe('');
    document.body.removeChild(container);
  });

  it('init sets height:auto !important on the container and its ancestors', () => {
    const grandparent = document.createElement('div');
    const parent = document.createElement('div');
    const container = document.createElement('div');
    grandparent.appendChild(parent);
    parent.appendChild(container);
    document.body.appendChild(grandparent);

    init({ container, props: {} });

    expect(container.style.getPropertyValue('height')).toBe('auto');
    expect(container.style.getPropertyPriority('height')).toBe('important');
    expect(parent.style.getPropertyValue('height')).toBe('auto');
    expect(parent.style.getPropertyPriority('height')).toBe('important');

    document.body.removeChild(grandparent);
  });

  it('init sets width:100% !important on ancestors wider than the viewport', () => {
    const parent = document.createElement('div');
    const container = document.createElement('div');
    parent.appendChild(container);
    document.body.appendChild(parent);

    vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
      width: window.innerWidth + 2000,
      height: 0, top: 0, left: 0, right: 0, bottom: 0,
      x: 0, y: 0, toJSON: () => ({}),
    });

    init({ container, props: {} });

    expect(parent.style.getPropertyValue('width')).toBe('100%');
    expect(parent.style.getPropertyPriority('width')).toBe('important');

    document.body.removeChild(parent);
  });

  it('calling clean without init does not throw', () => {
    expect(() => clean()).not.toThrow();
  });
});
