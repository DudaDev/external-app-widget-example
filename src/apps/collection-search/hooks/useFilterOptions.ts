import { useState, useRef, useEffect, useMemo } from 'react';
import type { CollectionAdapter, CollectionItem, FilterConfig, FilterOptions } from 'src/types/collection.types';
import { buildFilterOptions } from '../utils/applyFilters';
import { getValue } from '../utils/getValue';
import { collator } from '../utils/collator';

interface UseFilterOptionsParams {
  apiReady: boolean;
  rawResults: CollectionItem[];
  filterFields: string;
  multiSelectFields: string;
}

interface UseFilterOptionsReturn {
  schemaFields: string[];
  filterOptions: FilterOptions;
  filterConfig: FilterConfig[];
  filterError: string | null;
}

export function useFilterOptions(
  adapter: CollectionAdapter,
  { apiReady, rawResults, filterFields, multiSelectFields }: UseFilterOptionsParams
): UseFilterOptionsReturn {
  const [schemaFields,  setSchemaFields]  = useState<string[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({});
  const [filterError,   setFilterError]   = useState<string | null>(null);

  const schemaFieldsRef  = useRef(schemaFields);
  const filterOptionsRef = useRef(filterOptions);
  useEffect(() => { schemaFieldsRef.current  = schemaFields;  }, [schemaFields]);
  useEffect(() => { filterOptionsRef.current = filterOptions; }, [filterOptions]);

  useEffect(() => {
    if (!apiReady) return;
    const controller = new AbortController();
    adapter
      .getSchema(controller.signal)
      .then((fields) => {
        if (!controller.signal.aborted && fields.length > 0) setSchemaFields(fields);
      })
      .catch((err: unknown) => {
        if ((err instanceof Error || err instanceof DOMException) && err.name === 'AbortError') return;
        console.warn('[useFilterOptions] getSchema failed:', err);
      });
    return () => controller.abort();
  }, [apiReady, adapter]);

  // Bootstrap schema from first search results when getSchema() returns nothing
  useEffect(() => {
    if (!rawResults.length) return;
    const currentSchema  = schemaFieldsRef.current;
    const currentOptions = filterOptionsRef.current;
    const needsSchema    = currentSchema.length === 0;
    const needsOptions   = Object.keys(currentOptions).length === 0;
    if (!needsSchema && !needsOptions) return;

    const first = rawResults[0];
    const fields = needsSchema
      ? Object.keys(first?.data ?? (first as Record<string, unknown> | undefined) ?? {})
      : currentSchema;
    if (!fields.length) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (needsSchema)  setSchemaFields(fields);
    if (needsOptions) setFilterOptions(buildFilterOptions(rawResults, fields, getValue));
  }, [rawResults]); // intentionally reads schema/options via refs to avoid dep loops

  useEffect(() => {
    if (!apiReady || !schemaFields.length) return;
    const controller = new AbortController();
    adapter
      .loadAll(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        const explicitFields = filterFields
          ? filterFields.split(',').map((f) => f.trim()).filter(Boolean)
          : null;

        if (explicitFields) {
          const opts: FilterOptions = {};
          for (const field of explicitFields) {
            const vals = new Set(
              data.map((item) => String(getValue(item, field) || '').trim()).filter(Boolean)
            );
            if (vals.size) {
              opts[field] = [...vals].sort((a, b) => collator.compare(a, b));
            }
          }
          setFilterOptions(opts);
        } else {
          setFilterOptions(buildFilterOptions(data, schemaFields, getValue));
        }
      })
      .catch((err: unknown) => {
        if ((err instanceof Error || err instanceof DOMException) && err.name === 'AbortError') return;
        console.warn('[useFilterOptions] loadAll failed:', err);
        // Only surface the error banner when filter fields are explicitly configured — auto-detection
        // failure degrades silently, search still works without filters.
        if (filterFields) setFilterError('Filters could not be loaded. Try refreshing the page.');
      });
    return () => controller.abort();
  }, [apiReady, adapter, schemaFields, filterFields]);

  const multiFields = useMemo(() => {
    return new Set(
      multiSelectFields
        ? multiSelectFields.split(',').map((f) => f.trim()).filter(Boolean)
        : []
    );
  }, [multiSelectFields]);

  const filterConfig = useMemo<FilterConfig[]>(() => {
    return Object.keys(filterOptions).map((field) => ({
      field,
      type: multiFields.has(field) ? 'multiselect' : 'dropdown',
    }));
  }, [filterOptions, multiFields]);

  return { schemaFields, filterOptions, filterConfig, filterError };
}
