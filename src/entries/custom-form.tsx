import WidgetApp from '../apps/custom-form';
import { createWidgetLifecycle } from '../widgetLifecycle';

function parseProps(flat: Record<string, unknown>) {
  return {
    apiBaseUrl: typeof flat.apiBaseUrl === 'string' ? flat.apiBaseUrl : undefined,
    submitButtonLabel: typeof flat.submitButtonLabel === 'string' ? flat.submitButtonLabel : undefined,
    successMessage: typeof flat.successMessage === 'string' ? flat.successMessage : undefined,
  };
}

export const { init, clean } = createWidgetLifecycle(WidgetApp, parseProps);
