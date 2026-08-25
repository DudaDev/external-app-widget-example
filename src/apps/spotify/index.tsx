/**
  Spotify App Example Implementation

  This app fetches an artist's top tracks from Spotify and renders a music player widget.

  Expected props (passed by DM via init()):
    artistId   {string}   Spotify artist ID e.g. '6qqNVTkY8uBg9cP3Jd7DAH' (Billie Eilish)
    apiBaseUrl {string}   URL of your hosted Express server e.g. 'https://my-server.railway.app'
                          Falls back to VITE_API_BASE_URL (localhost:5001 in dev)
    onError    {function} Optional — called when an artist or tracks fetch fails after all retries.
                          Receives (err, { artistId, type: 'artist' | 'tracks' }).
                          Wire up your error monitoring here (Sentry, Datadog, etc.)
 */
import SpotifyProvider from './providers/Spotify';
import ArtistProvider  from './providers/Artist';
import TracksProvider  from './providers/Tracks';
import Spotify         from './components/Spotify';
import ErrorBoundary   from './components/ErrorBoundary';
import type { SpotifyErrorContext } from 'src/types/spotify.types';
import styles from './app.module.css';

interface SpotifyWidgetProps {
  artistId?: string;
  apiBaseUrl?: string;
  onError?: (err: unknown, context: SpotifyErrorContext) => void;
}

export default function SpotifyWidget({ artistId = '', apiBaseUrl, onError }: SpotifyWidgetProps) {
  return (
    <div className={styles.app}>
      <ErrorBoundary>
        <SpotifyProvider apiBaseUrl={apiBaseUrl}>
          <ArtistProvider artistId={artistId} key={artistId} onError={onError}>
            <TracksProvider artistId={artistId} onError={onError}>
              <Spotify />
            </TracksProvider>
          </ArtistProvider>
        </SpotifyProvider>
      </ErrorBoundary>
    </div>
  );
}
