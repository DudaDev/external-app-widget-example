import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithDelay } from '../retry';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('retryWithDelay', () => {
  it('calls fn and returns its result after the delay', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const controller = new AbortController();

    const promise = retryWithDelay(fn, 500, controller.signal);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    const result = await promise;

    expect(fn).toHaveBeenCalledOnce();
    expect(result).toBe('ok');
  });

  it('does not call fn before the delay elapses', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const controller = new AbortController();

    retryWithDelay(fn, 1000, controller.signal);
    vi.advanceTimersByTime(999);

    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
  });

  it('rejects with AbortError when signal is aborted during the delay', async () => {
    const fn = vi.fn();
    const controller = new AbortController();

    const promise = retryWithDelay(fn, 1000, controller.signal);
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(fn).not.toHaveBeenCalled();
  });

  it('rejects with AbortError when signal is already aborted before calling', async () => {
    const fn = vi.fn();
    const controller = new AbortController();
    controller.abort();

    const promise = retryWithDelay(fn, 500, controller.signal);

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(fn).not.toHaveBeenCalled();
  });

  it('propagates errors thrown by fn', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fetch failed'));
    const controller = new AbortController();

    const promise = retryWithDelay(fn, 100, controller.signal);
    vi.advanceTimersByTime(100);

    await expect(promise).rejects.toThrow('fetch failed');
  });
});
