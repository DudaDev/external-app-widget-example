import { useArtistState } from '../../providers/Artist';
import Tracks from '../Tracks';
import SpotifyLogo from './components/SpotifyLogo';
import styles from './artist.module.css';

export default function Artist() {
  const state = useArtistState();
  const artist = state?.data;

  if (!artist) return null;

  return (
    <div className={styles.root}>
      <header className={styles.artistHeader}>
        <div className={styles.artistName}>{artist.name}</div>
        <a href={artist.external_urls.spotify} target="_blank" rel="noopener noreferrer">
          <SpotifyLogo className={styles.spotifyLogo} />
        </a>
      </header>
      <Tracks />
    </div>
  );
}
