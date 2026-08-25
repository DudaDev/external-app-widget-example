import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../providers/Tracks', () => ({
  useTracksState: vi.fn(),
}));

vi.mock('react-use-audio-player', () => ({
  AudioPlayerProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/AudioPlayer', () => ({
  default: ({ track }: { track: { id: string } | null }) => <div data-testid="audio-player" data-track-id={track?.id ?? ''} />,
}));

import { useTracksState } from '../../providers/Tracks';
import Tracks from '../../components/Tracks/Tracks.component';

const TRACKS = [
  { id: 'track-1', name: 'Song One', duration_ms: 213000, preview_url: null, album: { id: 'alb', name: 'Album A', images: [] } },
  { id: 'track-2', name: 'Song Two', duration_ms: 185000, preview_url: null, album: { id: 'alb', name: 'Album A', images: [] } },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useTracksState).mockReturnValue({ data: TRACKS, error: undefined, requested: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Tracks component', () => {
  it('renders a list item for each track', () => {
    render(<Tracks />);
    expect(screen.getByText('Song One')).toBeInTheDocument();
    expect(screen.getByText('Song Two')).toBeInTheDocument();
  });

  it('renders formatted duration for each track', () => {
    render(<Tracks />);
    expect(screen.getByText('3:33')).toBeInTheDocument();
    expect(screen.getByText('3:05')).toBeInTheDocument();
  });

  it('sets the first track as current on mount', () => {
    render(<Tracks />);
    expect(screen.getByTestId('audio-player')).toHaveAttribute('data-track-id', 'track-1');
  });

  it('updates the current track when a track is clicked', async () => {
    const user = userEvent.setup();
    render(<Tracks />);

    await user.click(screen.getByRole('button', { name: /song two/i }));

    expect(screen.getByTestId('audio-player')).toHaveAttribute('data-track-id', 'track-2');
  });

  it('renders nothing in the list when tracks are empty', () => {
    vi.mocked(useTracksState).mockReturnValue({ data: [], error: undefined, requested: true });
    render(<Tracks />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  describe('accessibility', () => {
    it('track list has aria-label="Tracks"', () => {
      render(<Tracks />);
      expect(screen.getByRole('list', { name: 'Tracks' })).toBeInTheDocument();
    });

    it('each track button has an aria-label containing the track name', () => {
      render(<Tracks />);
      expect(screen.getByRole('button', { name: 'Play Song One' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Play Song Two' })).toBeInTheDocument();
    });
  });
});
