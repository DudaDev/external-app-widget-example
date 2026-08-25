import { createRoot } from 'react-dom/client';
import PlaceholderApp from 'apps/placeholder';
import '../../src/index.css';

// No resourceId: this is a starting-point stub with no backend deployed on
// this preview site. Passing a resourceId would make it fetch
// /placeholder/:id against this Worker's own origin, which has no such
// route and always 404s. Leaving it unset shows the "configure this widget"
// placeholder message instead, which is the accurate state for this app.
createRoot(document.getElementById('root')!).render(<PlaceholderApp />);
