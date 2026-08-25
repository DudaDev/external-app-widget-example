import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createElement, useState, type ReactNode } from 'react';

vi.mock('src/lib/api', () => {
  const instance = { get: vi.fn(), baseURL: '' };
  return { default: instance };
});

import api from 'src/lib/api';
import ArtistProvider, { useArtistState, useArtistRetry } from '../../providers/Artist/Artist.provider';

const ARTIST = { id: '123', name: 'Test Artist', external_urls: { spotify: 'https://spotify.com' }, images: [], genres: [], followers: { total: 0 } };

function wrapper({ artistId = '123' } = {}) {
  return ({ children }: { children: ReactNode }) => createElement(ArtistProvider, { artistId } as any, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ArtistProvider — api behaviour', () => {
  it('data and error are undefined while api is in flight', async () => {
    vi.mocked(api.get).mockReturnValueOnce(new Promise(() => {}));

    const { result } = renderHook(() => useArtistState(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current?.requested).toBe(true));
    expect(result.current?.data).toBeUndefined();
    expect(result.current?.error).toBeUndefined();
  });

  it('does not api when artistId is absent', async () => {
    renderHook(() => useArtistState(), {
      wrapper: ({ children }: { children: ReactNode }) => createElement(ArtistProvider, { artistId: '' } as any, children),
    });

    await new Promise(r => setTimeout(r, 50));
    expect(vi.mocked(api.get)).not.toHaveBeenCalled();
  });

  it('apies artist data when artistId is present', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: ARTIST });

    const { result } = renderHook(() => useArtistState(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current?.data).toEqual(ARTIST));
    expect(vi.mocked(api.get)).toHaveBeenCalledWith(
      '/spotify/artists/123',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('sets error when the api fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Not found'));

    const { result } = renderHook(() => useArtistState(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current?.error).toBeDefined());
    expect(result.current?.data).toBeUndefined();
  });

  it('swallows AbortError without setting error', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

    const { result } = renderHook(() => useArtistState(), { wrapper: wrapper() });

    await waitFor(() => expect(vi.mocked(api.get)).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 50));
    expect(result.current?.error).toBeUndefined();
  });

  it('calls onError with the right context when the fetch fails', async () => {
    const onError = vi.fn();
    const err = new Error('Not found');
    vi.mocked(api.get).mockRejectedValueOnce(err);

    renderHook(() => useArtistState(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(ArtistProvider, { artistId: '123', onError } as any, children),
    });

    await waitFor(() => expect(onError).toHaveBeenCalledWith(err, { artistId: '123', type: 'artist' }));
  });

  it('does not call onError for AbortErrors', async () => {
    const onError = vi.fn();
    vi.mocked(api.get).mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

    renderHook(() => useArtistState(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(ArtistProvider, { artistId: '123', onError } as any, children),
    });

    await waitFor(() => expect(vi.mocked(api.get)).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 50));
    expect(onError).not.toHaveBeenCalled();
  });

  it('retry() re-triggers the fetch and clears the error', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce({ data: ARTIST });

    const { result } = renderHook(
      () => ({ state: useArtistState(), retry: useArtistRetry() }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(result.current.state?.error).toBeDefined());

    act(() => { result.current.retry?.(); });

    await waitFor(() => expect(result.current.state?.data).toEqual(ARTIST));
    expect(result.current.state?.error).toBeUndefined();
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2);
  });

  it('re-apies when artistId changes', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: ARTIST });

    let setArtistId: (id: string) => void;
    function StatefulWrapper({ children }: { children: ReactNode }) {
      const [artistId, setId] = useState('123');
      setArtistId = setId;
      return createElement(ArtistProvider, { artistId } as any, children);
    }

    renderHook(() => useArtistState(), { wrapper: StatefulWrapper });

    await waitFor(() => expect(vi.mocked(api.get)).toHaveBeenCalledTimes(1));

    act(() => setArtistId('456'));

    await waitFor(() => expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.get)).toHaveBeenLastCalledWith('/spotify/artists/456', expect.anything());
  });
});
