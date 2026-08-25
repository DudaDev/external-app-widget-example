import WidgetApp from '../apps/placeholder';
import { createWidgetLifecycle } from '../widgetLifecycle';

function parseProps(flat: Record<string, unknown>) {
  return { resourceId: typeof flat.resourceId === 'string' ? flat.resourceId : undefined };
}

export const { init, clean } = createWidgetLifecycle(WidgetApp, parseProps);
