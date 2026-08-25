import { createRoot } from 'react-dom/client';
import SpotifyWidget from 'apps/spotify';
import '../../src/index.css';

// apiBaseUrl points at YOUR_BACKEND_DOMAIN — a placeholder. Deploy worker/ or
// server/ (see their own READMEs) and put your own domain here before using
// this preview entry for real.
createRoot(document.getElementById('root')!).render(
  <SpotifyWidget artistId="4Z8W4fKeB5YxbusRsdQVPb" apiBaseUrl="https://YOUR_BACKEND_DOMAIN" />
);
