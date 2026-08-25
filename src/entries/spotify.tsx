import WidgetApp from '../apps/spotify';
import { createWidgetLifecycle } from '../widgetLifecycle';

function parseProps(flat: Record<string, unknown>) {
  return {
    artistId: typeof flat.artistId === 'string' ? flat.artistId : undefined,
    apiBaseUrl: typeof flat.apiBaseUrl === 'string' ? flat.apiBaseUrl : undefined,
  };
}

export const { init, clean } = createWidgetLifecycle(WidgetApp, parseProps);
