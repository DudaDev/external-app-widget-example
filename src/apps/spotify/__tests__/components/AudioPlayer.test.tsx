import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const mockLoad = vi.fn();
const mockPlay = vi.fn();
const mockPause = vi.fn();
const mockSeek = vi.fn();
const mockGetPosition = vi.fn(() => 0);

vi.mock('react-use-audio-player', () => ({
  useAudioPlayerContext: vi.fn(() => ({
    load: mockLoad,
    play: mockPlay,
    pause: mockPause,
    seek: mockSeek,
    getPosition: mockGetPosition,
    isPlaying: false,
    duration: 0,
  })),
}));

vi.mock('../../components/AudioPlayer/components/Play', () => ({ default: () => <span>Play</span> }));
vi.mock('../../components/AudioPlayer/components/Pause', () => ({ default: () => <span>Pause</span> }));
vi.mock('../../components/AudioPlayer/components/Rewind', () => ({ default: () => <span>Rewind</span> }));
vi.mock('../../components/AudioPlayer/components/FastForward', () => ({ default: () => <span>FastForward</span> }));

import { useAudioPlayerContext } from 'react-use-audio-player';
import AudioPlayer from '../../components/AudioPlayer/AudioPlayer.component';

const TRACK_WITH_PREVIEW = {
  id: 'track-1',
  name: 'Song One',
  preview_url: 'https://preview.example.com/song.mp3',
  duration_ms: 200000,
  album: { id: 'alb', name: 'Album A', images: [{ url: 'https://img.example.com/cover.jpg' }] },
};

const TRACK_WITHOUT_PREVIEW = {
  id: 'track-2',
  name: 'Song Two',
  preview_url: null,
  duration_ms: 180000,
  album: { id: 'alb', name: 'Album A', images: [] },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAudioPlayerContext).mockReturnValue({
    load: mockLoad,
    play: mockPlay,
    pause: mockPause,
    seek: mockSeek,
    getPosition: mockGetPosition,
    isPlaying: false,
    duration: 0,
  } as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AudioPlayer component', () => {
  it('renders nothing when no track is provided', () => {
    const { container } = render(<AudioPlayer track={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders track name and album when a track is provided', () => {
    render(<AudioPlayer track={TRACK_WITH_PREVIEW} />);
    expect(screen.getByText('Song One')).toBeInTheDocument();
    expect(screen.getByText('Album A')).toBeInTheDocument();
  });

  it('renders playback controls when preview_url is present', () => {
    render(<AudioPlayer track={TRACK_WITH_PREVIEW} />);
    expect(screen.getByText('Play')).toBeInTheDocument();
    expect(screen.getByText('Rewind')).toBeInTheDocument();
    expect(screen.getByText('FastForward')).toBeInTheDocument();
  });

  it('shows "Preview not available" when preview_url is null', () => {
    render(<AudioPlayer track={TRACK_WITHOUT_PREVIEW} />);
    expect(screen.getByText('Preview not available')).toBeInTheDocument();
  });

  it('does not render controls when preview_url is null', () => {
    render(<AudioPlayer track={TRACK_WITHOUT_PREVIEW} />);
    expect(screen.queryByText('Play')).not.toBeInTheDocument();
    expect(screen.queryByText('Rewind')).not.toBeInTheDocument();
  });

  it('loads the preview URL on mount', () => {
    render(<AudioPlayer track={TRACK_WITH_PREVIEW} />);
    expect(mockLoad).toHaveBeenCalledWith(
      'https://preview.example.com/song.mp3',
      expect.objectContaining({ format: 'mp3', autoplay: false })
    );
  });

  it('renders album art when images are present', () => {
    render(<AudioPlayer track={TRACK_WITH_PREVIEW} />);
    const img = screen.getByAltText('Album cover art');
    expect(img).toHaveAttribute('src', 'https://img.example.com/cover.jpg');
  });

  it('does not render album art when images are empty', () => {
    render(<AudioPlayer track={TRACK_WITHOUT_PREVIEW} />);
    expect(screen.queryByAltText('Album cover art')).not.toBeInTheDocument();
  });

  it('resets position to 0:00 when a new track is provided while playing', () => {
    vi.useFakeTimers();
    mockGetPosition.mockReturnValue(45);
    vi.mocked(useAudioPlayerContext).mockReturnValue({
      load: mockLoad,
      play: mockPlay,
      pause: mockPause,
      seek: mockSeek,
      getPosition: mockGetPosition,
      isPlaying: true,
      duration: 180,
    } as any);

    const { rerender } = render(<AudioPlayer track={TRACK_WITH_PREVIEW} />);

    act(() => { vi.advanceTimersByTime(1001); });
    expect(screen.getByText('0:45')).toBeInTheDocument();

    const TRACK_B = {
      ...TRACK_WITH_PREVIEW,
      id: 'track-2',
      name: 'Song Two',
      preview_url: 'https://preview.example.com/song2.mp3',
    };
    rerender(<AudioPlayer track={TRACK_B} />);

    expect(screen.getByText('0:00')).toBeInTheDocument();

    vi.useRealTimers();
  });

  describe('accessibility', () => {
    it('has accessible labels on all playback controls', () => {
      render(<AudioPlayer track={TRACK_WITH_PREVIEW} />);
      expect(screen.getByRole('button', { name: 'Rewind 10 seconds' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Fast forward 10 seconds' })).toBeInTheDocument();
    });

    it('labels the toggle button as Pause when playing', () => {
      vi.mocked(useAudioPlayerContext).mockReturnValue({
        load: mockLoad,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        getPosition: mockGetPosition,
        isPlaying: true,
        duration: 30,
      } as any);
      render(<AudioPlayer track={TRACK_WITH_PREVIEW} />);
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument();
    });

    it('has a progressbar role with correct range when playing', () => {
      vi.mocked(useAudioPlayerContext).mockReturnValue({
        load: mockLoad,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        getPosition: mockGetPosition,
        isPlaying: true,
        duration: 30,
      } as any);
      render(<AudioPlayer track={TRACK_WITH_PREVIEW} />);
      const bar = screen.getByRole('progressbar', { name: 'Track progress' });
      expect(bar).toHaveAttribute('aria-valuemin', '0');
      expect(bar).toHaveAttribute('aria-valuemax', '100');
      expect(bar).toHaveAttribute('aria-valuenow');
    });

    it('progressbar has aria-valuetext describing percent played', () => {
      vi.mocked(useAudioPlayerContext).mockReturnValue({
        load: mockLoad,
        play: mockPlay,
        pause: mockPause,
        seek: mockSeek,
        getPosition: mockGetPosition,
        isPlaying: true,
        duration: 30,
      } as any);
      render(<AudioPlayer track={TRACK_WITH_PREVIEW} />);
      const bar = screen.getByRole('progressbar', { name: 'Track progress' });
      expect(bar).toHaveAttribute('aria-valuetext', expect.stringMatching(/% played/));
    });

    it('controls are wrapped in a group labelled "Playback controls"', () => {
      render(<AudioPlayer track={TRACK_WITH_PREVIEW} />);
      expect(screen.getByRole('group', { name: 'Playback controls' })).toBeInTheDocument();
    });
  });
});
