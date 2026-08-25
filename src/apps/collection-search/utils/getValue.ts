import type { CollectionItem } from 'src/types/collection.types';

export function getValue(item: CollectionItem, field: string): string {
  if (!field) return '';
  const val = item.data?.[field];
  return val != null ? String(val) : '';
}
