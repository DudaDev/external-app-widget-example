import type { FieldRoles } from 'src/types/collection.types';

export default function detectFieldRoles(fieldNames: string[] | null | undefined): Partial<FieldRoles> {
  if (!fieldNames || fieldNames.length === 0) return {};
  const names = fieldNames;

  function best(patterns: RegExp[]): string {
    for (const pat of patterns) {
      const found = names.find((n) => pat.test(n));
      if (found) return found;
    }
    return '';
  }

  return {
    title:    best([/^title$/i, /^name$/i, /^heading$/i, /^subject$/i, /^label$/i]),
    desc:     best([/^description$/i, /^desc$/i, /^body$/i, /^summary$/i, /^content$/i, /^about$/i, /^detail$/i]),
    image:    best([/^image$/i, /^img$/i, /^photo$/i, /^thumbnail$/i, /^picture$/i, /^banner$/i]),
    category: best([/^category$/i, /^tag$/i, /^type$/i, /^genre$/i]),
    meta:     best([/^date$/i, /^author$/i, /^price$/i, /^rating$/i, /^duration$/i]),
    link:     best([/^url$/i, /^link$/i, /^slug$/i, /^href$/i]),
  };
}
