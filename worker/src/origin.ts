// ALLOWED_ORIGINS entries are bare hostnames, optionally prefixed "*." for
// subdomains only, not the bare root. Example: "my.duda.co,*.multiscreensite.com".
function hostnameMatchesPattern(hostname: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    const base = pattern.slice(2);
    return hostname.endsWith(`.${base}`);
  }
  return hostname === pattern;
}

export function isAllowedOrigin(origin: string, patterns: string[]): boolean {
  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }
  return patterns.some((pattern) => hostnameMatchesPattern(hostname, pattern));
}
