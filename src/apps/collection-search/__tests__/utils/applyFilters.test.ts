import { describe, it, expect } from 'vitest';
import { applyFilters, buildFilterOptions } from '../../utils/applyFilters';
import { getValue } from '../../utils/getValue';
import type { CollectionItem } from 'src/types/collection.types';

const item = (data: Record<string, unknown>): CollectionItem => ({ id: 'test-item', data });


// applyFilters

describe('applyFilters — filtering', () => {
  const results = [
    item({ title: 'Alpha', category: 'Tech' }),
    item({ title: 'Beta',  category: 'Design' }),
    item({ title: 'Gamma', category: 'Tech' }),
  ];

  it('returns all results when no filters are active', () => {
    expect(applyFilters(results, {}, { field: '', dir: 'asc' }, getValue)).toHaveLength(3);
  });

  it('filters by a single dropdown value', () => {
    const out = applyFilters(results, { category: 'Tech' }, { field: '', dir: 'asc' }, getValue);
    expect(out).toHaveLength(2);
    expect(out.every(r => getValue(r, 'category') === 'Tech')).toBe(true);
  });

  it('returns empty array when no items match the filter', () => {
    const out = applyFilters(results, { category: 'Health' }, { field: '', dir: 'asc' }, getValue);
    expect(out).toHaveLength(0);
  });

  it('ignores filters with empty string value', () => {
    const out = applyFilters(results, { category: '' }, { field: '', dir: 'asc' }, getValue);
    expect(out).toHaveLength(3);
  });

  it('ignores filters with null value', () => {
    const out = applyFilters(results, { category: null }, { field: '', dir: 'asc' }, getValue);
    expect(out).toHaveLength(3);
  });

  it('handles multi-select filter with a single selected value', () => {
    const out = applyFilters(results, { category: ['Tech'] }, { field: '', dir: 'asc' }, getValue);
    expect(out).toHaveLength(2);
  });

  it('handles multi-select filter with multiple selected values (OR logic)', () => {
    const out = applyFilters(results, { category: ['Tech', 'Design'] }, { field: '', dir: 'asc' }, getValue);
    expect(out).toHaveLength(3);
  });

  it('ignores multi-select filter with empty array', () => {
    const out = applyFilters(results, { category: [] }, { field: '', dir: 'asc' }, getValue);
    expect(out).toHaveLength(3);
  });

  it('matching is case-insensitive', () => {
    const out = applyFilters(results, { category: 'tech' }, { field: '', dir: 'asc' }, getValue);
    expect(out).toHaveLength(2);
  });

  it('applies multiple filters together (AND logic)', () => {
    const data = [
      item({ category: 'Tech', status: 'active' }),
      item({ category: 'Tech', status: 'inactive' }),
      item({ category: 'Design', status: 'active' }),
    ];
    const out = applyFilters(data, { category: 'Tech', status: 'active' }, { field: '', dir: 'asc' }, getValue);
    expect(out).toHaveLength(1);
  });

  it('handles items where the filtered field is missing', () => {
    const data = [
      item({ title: 'Has category', category: 'Tech' }),
      item({ title: 'No category' }),
    ];
    const out = applyFilters(data, { category: 'Tech' }, { field: '', dir: 'asc' }, getValue);
    expect(out).toHaveLength(1);
    expect(getValue(out[0]!, 'title')).toBe('Has category');
  });
});

describe('applyFilters — sorting', () => {
  const results = [
    item({ title: 'Banana' }),
    item({ title: 'Apple' }),
    item({ title: 'Cherry' }),
  ];

  it('sorts ascending by a string field', () => {
    const out = applyFilters(results, {}, { field: 'title', dir: 'asc' }, getValue);
    expect(out.map(r => getValue(r, 'title'))).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  it('sorts descending by a string field', () => {
    const out = applyFilters(results, {}, { field: 'title', dir: 'desc' }, getValue);
    expect(out.map(r => getValue(r, 'title'))).toEqual(['Cherry', 'Banana', 'Apple']);
  });

  it('sorts numerically when values are numeric strings', () => {
    const data = [item({ count: '10' }), item({ count: '9' }), item({ count: '2' })];
    const out = applyFilters(data, {}, { field: 'count', dir: 'asc' }, getValue);
    expect(out.map(r => getValue(r, 'count'))).toEqual(['2', '9', '10']);
  });

  it('treats missing field values as empty string (sorts to front ascending)', () => {
    const data = [item({ title: 'Zebra' }), item({}), item({ title: 'Apple' })];
    const out = applyFilters(data, {}, { field: 'title', dir: 'asc' }, getValue);
    expect(getValue(out[0]!, 'title')).toBe('');
  });

  it('does not mutate the original results array', () => {
    const data = [item({ title: 'Banana' }), item({ title: 'Apple' })];
    const copy = [...data];
    applyFilters(data, {}, { field: 'title', dir: 'asc' }, getValue);
    expect(data).toEqual(copy);
  });

  it('does not sort when sort.field is empty', () => {
    const titles = results.map(r => getValue(r, 'title'));
    const out = applyFilters(results, {}, { field: '', dir: 'asc' }, getValue);
    expect(out.map(r => getValue(r, 'title'))).toEqual(titles);
  });
});


// buildFilterOptions

describe('buildFilterOptions', () => {
  it('returns unique sorted values for a field with 2–50 unique values', () => {
    const data = [
      item({ category: 'Tech' }),
      item({ category: 'Design' }),
      item({ category: 'Tech' }),
    ];
    const opts = buildFilterOptions(data, ['category'], getValue);
    expect(opts['category']).toEqual(['Design', 'Tech']);
  });

  it('excludes fields with only 1 unique value', () => {
    const data = [item({ tag: 'only' }), item({ tag: 'only' })];
    const opts = buildFilterOptions(data, ['tag'], getValue);
    expect(opts['tag']).toBeUndefined();
  });

  it('excludes fields with more than 50 unique values', () => {
    const data = Array.from({ length: 51 }, (_, i) => item({ id: String(i) }));
    const opts = buildFilterOptions(data, ['id'], getValue);
    expect(opts['id']).toBeUndefined();
  });

  it('includes fields with exactly 2 unique values', () => {
    const data = [item({ status: 'active' }), item({ status: 'inactive' })];
    const opts = buildFilterOptions(data, ['status'], getValue);
    expect(opts['status']).toHaveLength(2);
  });

  it('includes fields with exactly 50 unique values', () => {
    const data = Array.from({ length: 50 }, (_, i) => item({ label: String(i) }));
    const opts = buildFilterOptions(data, ['label'], getValue);
    expect(opts['label']).toHaveLength(50);
  });

  it('excludes empty and whitespace-only values', () => {
    const data = [item({ tag: 'Tech' }), item({ tag: '' }), item({ tag: '  ' }), item({ tag: 'Design' })];
    const opts = buildFilterOptions(data, ['tag'], getValue);
    expect(opts['tag']).toEqual(['Design', 'Tech']);
  });

  it('returns an empty object when no fields qualify', () => {
    const data = [item({ tag: 'only' })];
    const opts = buildFilterOptions(data, ['tag'], getValue);
    expect(opts).toEqual({});
  });
});
