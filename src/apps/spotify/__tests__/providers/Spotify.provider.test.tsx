import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

vi.mock('src/lib/api', () => ({
  default: { get: vi.fn() },
  setBaseURL: vi.fn(),
}));

import api from 'src/lib/api';
import { setBaseURL } from 'src/lib/api';
import SpotifyProvider, { useSpotifyContext } from '../../providers/Spotify/Spotify.provider';

function wrapper({ children }: { children: ReactNode }) {
  return createElement(SpotifyProvider, null, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SpotifyProvider — no token endpoint', () => {
  it('does not call the token endpoint on mount', () => {
    renderHook(() => useSpotifyContext(), { wrapper });
    expect(vi.mocked(api.get)).not.toHaveBeenCalled();
  });

  it('exposes a truthy context value to children', () => {
    const { result } = renderHook(() => useSpotifyContext(), { wrapper });
    expect(result.current).toMatchObject({ ready: true });
  });
});

describe('SpotifyProvider — apiBaseUrl prop', () => {
  it('sets baseURL when a valid http URL is provided', () => {
    renderHook(() => useSpotifyContext(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(SpotifyProvider, { apiBaseUrl: 'http://my-server.com' } as any, children),
    });

    expect(vi.mocked(setBaseURL)).toHaveBeenCalledWith('http://my-server.com');
  });

  it('sets baseURL when a valid https URL is provided', () => {
    renderHook(() => useSpotifyContext(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(SpotifyProvider, { apiBaseUrl: 'https://my-server.com' } as any, children),
    });

    expect(vi.mocked(setBaseURL)).toHaveBeenCalledWith('https://my-server.com');
  });

  it('ignores an invalid apiBaseUrl and does not call setBaseURL', () => {
    renderHook(() => useSpotifyContext(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(SpotifyProvider, { apiBaseUrl: 'not-a-url' } as any, children),
    });

    expect(vi.mocked(setBaseURL)).not.toHaveBeenCalled();
  });
});
