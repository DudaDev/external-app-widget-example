import WidgetApp, { parseCollectionSearchProps as parseProps } from '../apps/collection-search';
import { createWidgetLifecycle } from '../widgetLifecycle';

export const { init, clean } = createWidgetLifecycle(WidgetApp, parseProps);
