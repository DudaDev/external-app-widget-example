import { describe, it, expect } from 'vitest';
import { isAllowedOrigin } from '../origin';

describe('isAllowedOrigin', () => {
  it('matches an exact hostname pattern', () => {
    expect(isAllowedOrigin('https://my.duda.co', ['my.duda.co'])).toBe(true);
  });

  it('rejects a hostname not in the allowlist', () => {
    expect(isAllowedOrigin('https://evil.com', ['my.duda.co'])).toBe(false);
  });

  it('matches a wildcard subdomain pattern', () => {
    expect(isAllowedOrigin('https://foo.multiscreensite.com', ['*.multiscreensite.com'])).toBe(true);
  });

  it('does not match the bare root domain against a wildcard pattern', () => {
    expect(isAllowedOrigin('https://multiscreensite.com', ['*.multiscreensite.com'])).toBe(false);
  });

  it('does not match a lookalike hostname that merely ends with the base domain', () => {
    expect(isAllowedOrigin('https://evilmultiscreensite.com', ['*.multiscreensite.com'])).toBe(false);
  });

  it('matches when any of several patterns matches', () => {
    const patterns = ['my.duda.co', '*.multiscreensite.com', '*.susurrous.dev'];
    expect(isAllowedOrigin('https://widgets.susurrous.dev', patterns)).toBe(true);
  });

  it('returns false for a malformed origin string', () => {
    expect(isAllowedOrigin('not-a-url', ['my.duda.co'])).toBe(false);
  });

  it('returns false when patterns is empty', () => {
    expect(isAllowedOrigin('https://my.duda.co', [])).toBe(false);
  });
});
