import WidgetApp from '../apps/instant-site';
import { createWidgetLifecycle } from '../widgetLifecycle';

function parseProps(flat: Record<string, unknown>) {
  return {
    apiUrl: typeof flat.apiUrl === 'string' ? flat.apiUrl : undefined,
    embedToken: typeof flat.embedToken === 'string' ? flat.embedToken : undefined,
    enablePresets: typeof flat.enablePresets === 'boolean' ? flat.enablePresets : false,
  };
}

export const { init, clean } = createWidgetLifecycle(WidgetApp, parseProps);
