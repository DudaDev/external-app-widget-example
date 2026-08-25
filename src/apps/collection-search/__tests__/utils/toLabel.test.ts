import { describe, it, expect } from 'vitest';
import { toLabel } from '../../utils/toLabel';

describe('toLabel', () => {
  it('converts snake_case to Title Case', () => {
    expect(toLabel('first_name')).toBe('First Name');
  });

  it('converts camelCase to Title Case', () => {
    expect(toLabel('firstName')).toBe('First Name');
  });

  it('handles a single word', () => {
    expect(toLabel('title')).toBe('Title');
  });

  it('handles multiple underscores', () => {
    expect(toLabel('page_item_url')).toBe('Page Item Url');
  });

  it('handles an already-capitalised word', () => {
    expect(toLabel('Title')).toBe('Title');
  });

  it('handles mixed snake_case and camelCase', () => {
    expect(toLabel('my_fieldName')).toBe('My Field Name');
  });
});
