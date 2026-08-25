export async function retryWithDelay<T>(
  fn: () => Promise<T>,
  delayMs: number,
  signal: AbortSignal
): Promise<T> {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, delayMs);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
  return fn();
}
