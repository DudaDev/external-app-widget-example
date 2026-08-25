import { createRoot, type Root } from 'react-dom/client';
import type { ComponentType } from 'react';
import './index.css';

interface WidgetInitOptions {
  container: HTMLElement;
  props: Record<string, unknown>;
}

export interface WidgetLifecycle {
  init(options: WidgetInitOptions): void;
  clean(): void;
}

export function createWidgetLifecycle<P extends object>(
  WidgetApp: ComponentType<P>,
  parseProps: (flat: Record<string, unknown>) => P
): WidgetLifecycle {
  let root: Root | null = null;

  // init called by DM when the widget is mounted
  function init({ container, props }: WidgetInitOptions): void {
    // DM sets a fixed width and height on ancestor wrappers. Walk up and reset both.
    container.style.display = 'block';
    container.style.boxSizing = 'border-box';
    container.style.setProperty('width', '100%', 'important');
    container.style.setProperty('height', 'auto', 'important');
    container.style.maxWidth = '100vw';

    const vw = window.innerWidth;
    let node: HTMLElement | null = container.parentElement;
    while (node && node !== document.body) {
      const w = node.getBoundingClientRect().width;
      if (w > vw) {
        node.style.setProperty('width', '100%', 'important');
      }
      node.style.setProperty('height', 'auto', 'important');
      // Stop at #widget_hue. Ancestors above it are page layout, leave untouched.
      if (node.id === 'widget_hue') break;
      node = node.parentElement;
    }

    root = createRoot(container);
    root.render(<WidgetApp {...parseProps(props)} />);
  }

  // clean called by DM to unmount the widget
  function clean(): void {
    root?.unmount();
    root = null;
  }

  return { init, clean };
}
