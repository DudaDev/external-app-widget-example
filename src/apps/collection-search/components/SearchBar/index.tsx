import { useState } from 'react';
import styles from './SearchBar.module.css';

const SearchIcon = () => (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const ClearIcon = () => (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

interface SearchBarProps {
  placeholder: string;
  buttonText: string;
  onSearch: (query: string) => void;
  onClear: () => void;
  disabled: boolean;
}

export default function SearchBar({ placeholder, buttonText, onSearch, onClear, disabled }: SearchBarProps) {
  const [value, setValue] = useState('');

  function handleClear() {
    setValue('');
    onClear();
  }

  return (
    <div className={styles.searchBarWrapper}>
      <div className={styles.searchInputGroup}>
        <span className={styles.searchIcon}>
          <SearchIcon />
        </span>
        <input
          type="text"
          className={styles.searchInput}
          placeholder={placeholder}
          aria-label="Search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch(value)}
          disabled={disabled}
        />
        {value.length > 0 && (
          <button type="button" className={styles.searchClearBtn} aria-label="Clear search" onClick={handleClear}>
            <ClearIcon />
          </button>
        )}
      </div>
      <button type="button" className={styles.searchBtn} onClick={() => onSearch(value)} disabled={disabled}>
        {buttonText}
      </button>
    </div>
  );
}
