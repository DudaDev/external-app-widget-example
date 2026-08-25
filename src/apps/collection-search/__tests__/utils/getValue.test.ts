import { describe, it, expect } from 'vitest';
import { getValue } from '../../utils/getValue';

describe('getValue', () => {
  it('returns empty string for a flat item with no .data (normalization happens at adapter boundary)', () => {
    expect(getValue({ title: 'Hello' } as any, 'title')).toBe('');
  });

  it('returns the field value from a nested .data item', () => {
    expect(getValue({ id: 't', data: { title: 'Hello' } }, 'title')).toBe('Hello');
  });

  it('prefers .data over the root when both have the field', () => {
    expect(getValue({ id: 't', data: { title: 'nested' } }, 'title')).toBe('nested');
  });

  it('returns empty string when field is missing', () => {
    expect(getValue({ id: 't', data: { title: 'Hello' } }, 'missing')).toBe('');
  });

  it('returns empty string when field is null', () => {
    expect(getValue({ id: 't', data: { title: null } }, 'title')).toBe('');
  });

  it('returns empty string when field is undefined', () => {
    expect(getValue({ id: 't', data: {} }, 'title')).toBe('');
  });

  it('returns empty string when field argument is empty', () => {
    expect(getValue({ id: 't', data: { title: 'Hello' } }, '')).toBe('');
  });

  it('coerces numeric and boolean values to strings', () => {
    expect(getValue({ id: 't', data: { count: 0 } }, 'count')).toBe('0');
    expect(getValue({ id: 't', data: { active: false } }, 'active')).toBe('false');
    expect(getValue({ id: 't', data: { score: 42 } }, 'score')).toBe('42');
  });
});
