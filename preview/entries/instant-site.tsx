import { createRoot } from 'react-dom/client';
import InstantSiteApp from 'apps/instant-site';
import '../../src/index.css';

// Pairs with duda-instant-site-demo-updated's server (a separate repo) —
// that project's README documents itself as the intended backend pairing
// for this widget. apiUrl/embedToken below are placeholders: deploy that
// project (or worker/'s own instant-site routes) yourself, then set these to
// your own domain and your own EMBED_TOKEN secret.
//
// Whatever value goes here ends up in the public compiled bundle —
// unavoidable for a static SPA entry, matching how this token works for a
// real embed via the Duda Content Editor field: it's a shared,
// not-really-secret credential, not the actual access boundary. The real
// security boundary is the per-site ownership token minted on site
// creation/generation — a caller holding only the embed token can start new
// site creations, but can't delete/patch/grant-access on a site it didn't
// create. Even so, use your own value here, not anyone else's live token.
createRoot(document.getElementById('root')!).render(
  <InstantSiteApp
    apiUrl="https://YOUR_API_DOMAIN"
    embedToken="YOUR_EMBED_TOKEN"
    enablePresets={true}
  />
);
