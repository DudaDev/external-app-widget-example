import { createRoot } from 'react-dom/client';
import CustomFormApp from 'apps/custom-form';
import '../../src/index.css';

// apiBaseUrl points at YOUR_BACKEND_DOMAIN — a placeholder. Deploy worker/
// (see its README) and put your own domain here before using this preview
// entry for real.
createRoot(document.getElementById('root')!).render(
  <CustomFormApp apiBaseUrl="https://YOUR_BACKEND_DOMAIN" />
);
