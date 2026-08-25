import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../providers/Artist', () => ({
  useArtistState: vi.fn(),
}));

vi.mock('../../components/Tracks', () => ({
  default: () => <div data-testid="tracks" />,
}));

vi.mock('./components/SpotifyLogo', () => ({
  default: () => <svg data-testid="spotify-logo" />,
}));

import { useArtistState } from '../../providers/Artist';
import Artist from '../../components/Artist/Artist.component';

const ARTIST = {
  id: '123',
  name: 'Test Artist',
  external_urls: { spotify: 'https://open.spotify.com/artist/123' },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useArtistState).mockReturnValue({ data: ARTIST, error: undefined, requested: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Artist component', () => {
  it('renders the artist name', () => {
    render(<Artist />);
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });

  it('renders a link to the Spotify page', () => {
    render(<Artist />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://open.spotify.com/artist/123');
  });

  it('renders the Tracks component', () => {
    render(<Artist />);
    expect(screen.getByTestId('tracks')).toBeInTheDocument();
  });
});
