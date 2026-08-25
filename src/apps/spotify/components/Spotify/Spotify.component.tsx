import { useArtistState, useArtistRetry } from '../../providers/Artist';
import { useTracksState, useTracksRetry } from '../../providers/Tracks';
import Artist from '../Artist';
import Loading from '../Loading';
import FetchError from '../FetchError';

export default function Spotify() {
  const artistState = useArtistState();
  const tracksState = useTracksState();
  const artistRetry = useArtistRetry();
  const tracksRetry = useTracksRetry();

  if (artistState?.error) return <FetchError message="Unable to load artist data. Please try again." onRetry={artistRetry} />;
  if (tracksState?.error) return <FetchError message="Unable to load tracks. Please try again." onRetry={tracksRetry} />;
  if (!artistState?.data || !tracksState?.data) return <Loading />;
  return <Artist />;
}
