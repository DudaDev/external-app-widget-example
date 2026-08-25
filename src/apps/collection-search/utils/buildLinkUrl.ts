import type { CollectionItem } from 'src/types/collection.types';

export default function buildLinkUrl(
  item: CollectionItem,
  dynBase: string,
  effectiveLinkField: string,
  getValue: (item: CollectionItem, field: string) => unknown
): string {
  const slug = item.page_item_url ?? '';
  // Browsers normalize \ to / for special schemes, so a leading "/\evil.com"
  // becomes protocol-relative after resolution even though it isn't "//" here.
  // Normalizing backslashes ourselves before stripping leading slashes closes that.
  const cleanSlug = slug.replace(/\\/g, '/').replace(/^\/+/, '');
  if (slug && dynBase) return `${dynBase}/${cleanSlug}`;
  if (slug) return `/${cleanSlug}`;
  return String(getValue(item, effectiveLinkField) ?? '');
}
