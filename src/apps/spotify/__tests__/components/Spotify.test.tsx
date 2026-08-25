import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../providers/Artist', () => ({
  useArtistState: vi.fn(),
  useArtistRetry: vi.fn(),
}));

vi.mock('../../providers/Tracks', () => ({
  useTracksState: vi.fn(),
  useTracksRetry: vi.fn(),
}));

vi.mock('../../components/Loading', () => ({
  default: () => <div data-testid="loading" />,
}));

vi.mock('../../components/Artist', () => ({
  default: () => <div data-testid="artist" />,
}));

vi.mock('../../components/FetchError', () => ({
  default: () => <div data-testid="fetch-error" />,
}));

import { useArtistState } from '../../providers/Artist';
import { useTracksState } from '../../providers/Tracks';
import Spotify from '../../components/Spotify/Spotify.component';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Spotify component', () => {
  it('shows Loading when artist data is absent', () => {
    vi.mocked(useArtistState).mockReturnValue({ data: undefined, error: undefined, requested: true });
    vi.mocked(useTracksState).mockReturnValue({ data: [{ id: 'track-1', name: 'Song', duration_ms: 200000, preview_url: null, album: { id: 'alb', name: 'Album', images: [] } }], error: undefined, requested: true });

    render(<Spotify />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.queryByTestId('artist')).not.toBeInTheDocument();
  });

  it('shows Loading when tracks data is absent', () => {
    vi.mocked(useArtistState).mockReturnValue({ data: { id: '1', name: 'Artist', external_urls: { spotify: '' } }, error: undefined, requested: true });
    vi.mocked(useTracksState).mockReturnValue({ data: undefined, error: undefined, requested: true });

    render(<Spotify />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.queryByTestId('artist')).not.toBeInTheDocument();
  });

  it('shows Loading when both artist and tracks are absent', () => {
    vi.mocked(useArtistState).mockReturnValue({ data: undefined, error: undefined, requested: true });
    vi.mocked(useTracksState).mockReturnValue({ data: undefined, error: undefined, requested: true });

    render(<Spotify />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('shows FetchError when artist fetch fails', () => {
    vi.mocked(useArtistState).mockReturnValue({ data: undefined, error: new Error('Network error'), requested: true });
    vi.mocked(useTracksState).mockReturnValue({ data: undefined, error: undefined, requested: true });

    render(<Spotify />);

    expect(screen.getByTestId('fetch-error')).toBeInTheDocument();
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('artist')).not.toBeInTheDocument();
  });

  it('shows FetchError when tracks fetch fails', () => {
    vi.mocked(useArtistState).mockReturnValue({ data: { id: '1', name: 'Artist', external_urls: { spotify: '' } }, error: undefined, requested: true });
    vi.mocked(useTracksState).mockReturnValue({ data: undefined, error: new Error('Network error'), requested: true });

    render(<Spotify />);

    expect(screen.getByTestId('fetch-error')).toBeInTheDocument();
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('artist')).not.toBeInTheDocument();
  });

  it('shows Artist when both artist and tracks data are present', () => {
    vi.mocked(useArtistState).mockReturnValue({ data: { id: '1', name: 'Artist', external_urls: { spotify: '' } }, error: undefined, requested: true });
    vi.mocked(useTracksState).mockReturnValue({ data: [{ id: 'track-1', name: 'Song', duration_ms: 200000, preview_url: null, album: { id: 'alb', name: 'Album', images: [] } }], error: undefined, requested: true });

    render(<Spotify />);

    expect(screen.getByTestId('artist')).toBeInTheDocument();
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
  });
});
