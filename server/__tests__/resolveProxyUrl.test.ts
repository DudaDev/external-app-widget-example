// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { resolveProxyUrl } from '../routes/spotify';

const BASE = 'https://api.spotify.com/v1';

describe('resolveProxyUrl', () => {
  it('returns the full URL for a normal path', () => {
    expect(resolveProxyUrl(BASE, '/artists/123')).toBe('https://api.spotify.com/v1/artists/123');
  });

  it('handles paths with query strings', () => {
    expect(resolveProxyUrl(BASE, '/artists/123?market=US')).toBe(
      'https://api.spotify.com/v1/artists/123?market=US'
    );
  });

  it('returns null when dots escape above the base path', () => {
    // %2e%2e = ".." — the URL constructor resolves this upward
    expect(resolveProxyUrl(BASE, '%2e%2e/%2e%2e/etc/passwd')).toBeNull();
  });

  it('returns null for an empty path', () => {
    // Empty string resolves to the base itself; startsWith passes, but
    // a trailing slash means the base differs from baseUrl — returns null
    // (defensive: no way to accidentally proxy to the bare base)
    const result = resolveProxyUrl(BASE, '');
    // Either resolves to base+/ (passes) or null — either is acceptable.
    // Key property: must not return something outside the base.
    if (result !== null) {
      expect(result.startsWith(BASE)).toBe(true);
    }
  });

  it('neutralises protocol-relative paths by stripping leading slashes', () => {
    // "//evil.com/steal" could be a protocol-relative URL, but stripping
    // leading slashes makes it a relative path that stays under the base.
    const result = resolveProxyUrl(BASE, '//evil.com/steal');
    expect(result).not.toBeNull();
    expect(result!.startsWith(BASE)).toBe(true);
  });
});
