import styles from './SearchStates.module.css';

const SearchIcon = () => (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const AlertIcon = () => (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
}

interface ErrorStateProps {
  title?: string;
  subtitle?: string;
}

interface InitialStateProps {
  text?: string;
}

export function SearchEmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <div role="status" className={styles.searchEmptyState}>
      <SearchIcon />
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptySubtitle}>{subtitle}</p>
    </div>
  );
}

export function SearchErrorState({
  title = 'Something went wrong',
  subtitle = 'Please try again.',
}: ErrorStateProps) {
  return (
    <div role="alert" className={styles.searchErrorState}>
      <AlertIcon />
      <p className={styles.errorTitle}>{title}</p>
      <p className={styles.errorSubtitle}>{subtitle}</p>
    </div>
  );
}

export function SearchInitialState({ text }: InitialStateProps) {
  return (
    <div role="status" className={styles.searchInitialState}>
      <SearchIcon />
      <p>{text}</p>
    </div>
  );
}
