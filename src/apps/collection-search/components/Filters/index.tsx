import type { ActiveFilters, FilterConfig, FilterOptions, SortState } from 'src/types/collection.types';
import styles from './Filters.module.css';
import { toLabel } from '../../utils/toLabel';
import MultiSelectDropdown from './MultiSelectDropdown';

function allLabel(label: string) {
  return `All ${label}`;
}

const AscIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

const DescIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

interface SingleDropdownProps {
  field: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

function SingleDropdown({ field, options, value, onChange }: SingleDropdownProps) {
  const label    = toLabel(field);
  const selectId = `filter-${field}`;
  return (
    <div className={styles.filterGroup}>
      <label className={styles.filterLabel} htmlFor={selectId}>{label}</label>
      <select
        id={selectId}
        className={`${styles.filterSelect}${value ? ` ${styles.active}` : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Filter by ${label}`}
      >
        <option value="">{allLabel(label)}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

interface FiltersProps {
  filterConfig: FilterConfig[];
  filterOptions: FilterOptions;
  activeFilters: ActiveFilters;
  sort: SortState;
  sortFields: string[];
  onFilterChange: (field: string, value: string | string[]) => void;
  onSortChange: (sort: SortState) => void;
  onClearAll: () => void;
}

export default function Filters({
  filterConfig,
  filterOptions,
  activeFilters,
  sort,
  sortFields,
  onFilterChange,
  onSortChange,
  onClearAll,
}: FiltersProps) {
  const hasActiveFilters =
    filterConfig.some(({ field }) => {
      const v = activeFilters[field];
      return Array.isArray(v) ? v.length > 0 : !!v;
    }) || !!sort.field;

  if (filterConfig.length === 0 && sortFields.length === 0) return null;

  return (
    <div className={styles.filtersContainer}>
      {filterConfig.length > 0 && (
        <div className={styles.filterControls}>
          {filterConfig.map(({ field, type }) => {
            const options = filterOptions[field] ?? [];
            if (!options.length) return null;
            if (type === 'multiselect') {
              return (
                <MultiSelectDropdown
                  key={field}
                  field={field}
                  options={options}
                  value={(activeFilters[field] as string[]) ?? []}
                  onChange={(v) => onFilterChange(field, v)}
                />
              );
            }
            return (
              <SingleDropdown
                key={field}
                field={field}
                options={options}
                value={(activeFilters[field] as string) ?? ''}
                onChange={(v) => onFilterChange(field, v)}
              />
            );
          })}
        </div>
      )}

      {sortFields.length > 0 && (
        <div className={styles.sortGroup}>
          <label className={styles.filterLabel} htmlFor="sort-by-field">Sort by</label>
          <div className={styles.sortControls}>
            <select
              id="sort-by-field"
              className={`${styles.filterSelect}${sort.field ? ` ${styles.active}` : ''}`}
              value={sort.field}
              onChange={(e) => onSortChange({ ...sort, field: e.target.value, dir: 'asc' })}
              aria-label="Sort by field"
            >
              <option value="">Default order</option>
              {sortFields.map((f) => (
                <option key={f} value={f}>{toLabel(f)}</option>
              ))}
            </select>
            {sort.field && (
              <button
                type="button"
                className={styles.sortDirBtn}
                onClick={() => onSortChange({ ...sort, dir: sort.dir === 'asc' ? 'desc' : 'asc' })}
                aria-label={sort.dir === 'asc' ? 'Sort descending' : 'Sort ascending'}
                title={sort.dir === 'asc' ? 'A → Z' : 'Z → A'}
              >
                {sort.dir === 'asc' ? <AscIcon /> : <DescIcon />}
              </button>
            )}
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <button type="button" className={styles.clearBtn} onClick={onClearAll}>
          Clear filters
        </button>
      )}
    </div>
  );
}
