import { memo, useState, useEffect, useRef, useMemo } from 'react';
import { useAudioPlayerContext } from 'react-use-audio-player';
import type { SpotifyTrack, SpotifyImage } from 'src/types/spotify.types';

import Play        from './components/Play';
import Pause       from './components/Pause';
import FastForward from './components/FastForward';
import Rewind      from './components/Rewind';

import { millisToMinutesAndSeconds } from '../../utils/time.utils';
import styles from './audioPlayer.module.css';

interface AlbumImageProps {
  images: SpotifyImage[];
}

const AlbumImage = memo(function AlbumImage({ images }: AlbumImageProps) {
  if (!images?.length) return null;
  return <img src={images[0]?.url} className={styles.albumImage} alt="Album cover art" />;
});

interface TrackProgressProps {
  position: number;
  duration: number;
}

function TrackProgress({ position, duration }: TrackProgressProps) {
  const formattedPosition = useMemo(
    () => millisToMinutesAndSeconds(Math.round(position) * 1000),
    [position]
  );
  const formattedDuration = useMemo(
    () => millisToMinutesAndSeconds(Math.floor(duration) * 1000),
    [duration]
  );

  return (
    <div className={styles.trackProgress}>
      <span className={styles.trackPosition}>{formattedPosition}</span>
      <span className={styles.trackDuration}>/{formattedDuration}</span>
    </div>
  );
}

function TrackProgressBar({ position, duration }: TrackProgressProps) {
  const completed = useMemo(
    () => (duration > 0 ? Math.min(Math.ceil((position / duration) * 100), 100) : 0),
    [position, duration]
  );

  return (
    <div
      className={styles.progressContainer}
      role="progressbar"
      aria-valuenow={completed}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${completed}% played`}
      aria-label="Track progress"
    >
      <div className={styles.progressBackground}>
        <div className={styles.progressActive} style={{ width: `${completed}%` }} />
      </div>
    </div>
  );
}

const SEEK_SECONDS = 10;

interface TrackControlsProps {
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
}

const TrackControls = memo(function TrackControls({ isPlaying, play, pause }: TrackControlsProps) {
  const { seek, getPosition, duration } = useAudioPlayerContext();

  function togglePlay() {
    if (isPlaying) pause();
    else play();
  }

  function handleRewind() {
    seek(Math.max(0, getPosition() - SEEK_SECONDS));
  }

  function handleFastForward() {
    seek(Math.min(duration, getPosition() + SEEK_SECONDS));
  }

  return (
    <div className={styles.controlsContainer} role="group" aria-label="Playback controls">
      <button onClick={handleRewind} className={styles.controlButton} aria-label="Rewind 10 seconds">
        <Rewind aria-hidden="true" />
      </button>
      <button onClick={togglePlay} className={styles.controlButton} aria-label={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </button>
      <button onClick={handleFastForward} className={styles.controlButton} aria-label="Fast forward 10 seconds">
        <FastForward aria-hidden="true" />
      </button>
    </div>
  );
});

interface TrackInfoProps {
  track: SpotifyTrack;
  isPlaying: boolean;
}

function TrackInfo({ track, isPlaying }: TrackInfoProps) {
  const { getPosition, duration } = useAudioPlayerContext();
  const [position, setPosition] = useState(0);
  const [prevTrack, setPrevTrack] = useState(track);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Resets position when track changes, without an effect. Conditional
  // setState during render is React's own pattern for this.
  if (track !== prevTrack) {
    setPrevTrack(track);
    setPosition(0);
  }

  useEffect(() => {
    if (!isPlaying) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setPosition(getPosition());
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, getPosition]);

  return (
    <div className={styles.currentTrack}>
      <div className={styles.allInfo}>
        <AlbumImage images={track.album.images} />
        <div className={styles.trackInfo}>
          <div className={styles.trackTitle}>{track.name}</div>
          <div className={styles.trackAlbum}>{track.album.name}</div>
          {isPlaying && <TrackProgress position={position} duration={duration} />}
        </div>
      </div>
      {isPlaying && <TrackProgressBar position={position} duration={duration} />}
    </div>
  );
}

interface CurrentTrackProps {
  track: SpotifyTrack;
}

function CurrentTrack({ track }: CurrentTrackProps) {
  const { load, isPlaying, play, pause } = useAudioPlayerContext();

  useEffect(() => {
    if (track.preview_url) {
      load(track.preview_url, { format: 'mp3', autoplay: false });
    }
  }, [track.preview_url, load]);

  return (
    <>
      <TrackInfo track={track} isPlaying={isPlaying} />
      {track.preview_url ? (
        <TrackControls isPlaying={isPlaying} play={play} pause={pause} />
      ) : (
        <div className={styles.previewUnavailable}>Preview not available</div>
      )}
    </>
  );
}

interface AudioPlayerProps {
  track: SpotifyTrack | null;
}

export default function AudioPlayer({ track }: AudioPlayerProps) {
  return track ? <CurrentTrack track={track} /> : null;
}
