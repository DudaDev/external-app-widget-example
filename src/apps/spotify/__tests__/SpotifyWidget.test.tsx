import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SpotifyWidget from '../index';

vi.mock('../providers/Spotify', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../providers/Artist', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useArtistState: vi.fn(),
}));
vi.mock('../providers/Tracks', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTracksState: vi.fn(),
}));
vi.mock('../components/Spotify', () => ({
  default: () => { throw new Error('render error'); },
}));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('SpotifyWidget', () => {
  it('shows an error fallback when a child component throws during render', () => {
    render(<SpotifyWidget />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
