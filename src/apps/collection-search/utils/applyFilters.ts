import type {
  CollectionItem,
  ActiveFilters,
  FilterOptions,
  SortState,
} from 'src/types/collection.types';
import { collator } from './collator';

export function applyFilters(
  results: CollectionItem[],
  activeFilters: ActiveFilters,
  sort: SortState,
  getValue: (item: CollectionItem, field: string) => unknown
): CollectionItem[] {
  let filtered = results;

  for (const [field, value] of Object.entries(activeFilters)) {
    if (value === '' || value == null || (Array.isArray(value) && value.length === 0)) continue;
    filtered = filtered.filter((item) => {
      const itemVal = String(getValue(item, field) ?? '').trim().toLowerCase();
      if (Array.isArray(value)) {
        return value.some((v) => itemVal === String(v).trim().toLowerCase());
      }
      return itemVal === String(value).trim().toLowerCase();
    });
  }

  if (sort.field) {
    filtered = [...filtered].sort((a, b) => {
      const aVal = String(getValue(a, sort.field) ?? '').toLowerCase();
      const bVal = String(getValue(b, sort.field) ?? '').toLowerCase();
      const cmp = collator.compare(aVal, bVal);
      return sort.dir === 'desc' ? -cmp : cmp;
    });
  }

  return filtered;
}

export function buildFilterOptions(
  allData: CollectionItem[],
  fields: string[],
  getValue: (item: CollectionItem, field: string) => unknown
): FilterOptions {
  const options: FilterOptions = {};
  for (const field of fields) {
    const vals = new Set<string>();
    for (const item of allData) {
      const v = getValue(item, field);
      if (v != null && String(v).trim()) vals.add(String(v).trim());
    }
    if (vals.size >= 2 && vals.size <= 50) {
      options[field] = [...vals].sort((a, b) => collator.compare(a, b));
    }
  }
  return options;
}