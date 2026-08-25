import { useState } from 'react';
import { AudioPlayerProvider } from 'react-use-audio-player';
import type { SpotifyTrack } from 'src/types/spotify.types';
import { useTracksState } from '../../providers/Tracks';
import AudioPlayer from '../AudioPlayer';
import { millisToMinutesAndSeconds } from '../../utils/time.utils';
import styles from './tracks.module.css';

interface TrackProps {
  track: SpotifyTrack;
  onClick: (track: SpotifyTrack) => void;
}

function Track({ track, onClick }: TrackProps) {
  const duration = millisToMinutesAndSeconds(track.duration_ms);

  return (
    <li className={styles.track}>
      <button onClick={() => onClick(track)} className={styles.trackButton} aria-label={`Play ${track.name}`}>
        <div className={styles.trackName}>
          <div>{track.name}</div>
          <div className={styles.trackAlbum}>{track.album.name}</div>
        </div>
        <div className={styles.trackDuration}>{duration}</div>
      </button>
    </li>
  );
}

export default function Tracks() {
  const state = useTracksState();
  const tracks = state?.data;
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(() => tracks?.[0] ?? null);
  const [prevTracks, setPrevTracks] = useState(tracks);

  // Resets selection to the first track when the tracks list changes,
  // without an effect, same pattern as AudioPlayer's TrackInfo.
  if (tracks !== prevTracks) {
    setPrevTracks(tracks);
    setCurrentTrack(tracks?.[0] ?? null);
  }

  return (
    <>
      <ul className={styles.tracks} aria-label="Tracks">
        {tracks && tracks.length > 0 &&
          tracks.map((track) => (
            <Track key={track.id} track={track} onClick={setCurrentTrack} />
          ))}
      </ul>
      <AudioPlayerProvider>
        <AudioPlayer track={currentTrack} />
      </AudioPlayerProvider>
    </>
  );
}
