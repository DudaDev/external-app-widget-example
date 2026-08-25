// A shared instance, not `a.localeCompare(b, undefined, {...})` per pair —
// passing options to localeCompare has V8 construct a fresh Intl.Collator
// internally on every single call. Benchmarked: ~17x slower sorting 20,000
// items than reusing one instance's .compare().
export const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
