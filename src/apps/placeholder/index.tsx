/**
Placeholder App: Copy this folder to src/apps/my-app/ to start a new app

  Steps to build your own app:
    1. Copy this folder to src/apps/my-app/
    2. Replace the props below with your widget's properties
    3. Add an entry file in src/entries/my-app.tsx — see src/apps/README.md
    4. Add backend routes in server/routes/my-app.ts (if your app needs a backend)
    5. Mount them in server/app.ts (if needed)
    6. Update the defaults in index.html to match your widget for local dev
 */
import { useEffect, useState } from 'react';
import api from 'src/lib/api';
import ErrorBoundary from './ErrorBoundary';

interface PlaceholderAppProps {
  resourceId?: string;
  onError?: (err: unknown, context: { resourceId?: string }) => void;
}

// APP: replace with your widget's DM Widget Builder property names
function PlaceholderAppInner({ resourceId, onError }: PlaceholderAppProps) {
  const [data,  setData]  = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resourceId) return;
    const controller = new AbortController();
    // APP: replace '/placeholder/:id' with your backend route
    api
      .get<unknown>(`/placeholder/${resourceId}`, { signal: controller.signal })
      .then((res) => setData(res.data))
      .catch((err: unknown) => {
        if ((err instanceof Error || err instanceof DOMException) && err.name === 'AbortError') return;
        console.error(err);
        onError?.(err, { resourceId });
        setError('Failed to load. Please try again.');
      });
    return () => controller.abort();
  }, [resourceId, onError]);

  if (!resourceId) return <div>Configure this widget in DM&apos;s Widget Builder.</div>;
  if (error) return <div role="alert">{error}</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div>
      {/* APP: replace with your widget's UI */}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export default function PlaceholderApp(props: PlaceholderAppProps) {
  return (
    <ErrorBoundary onError={(err) => props.onError?.(err, { resourceId: props.resourceId })}>
      <PlaceholderAppInner {...props} />
    </ErrorBoundary>
  );
}
