import styles from './fetchError.module.css';

interface FetchErrorProps {
  message?: string;
  onRetry?: () => void;
}

export default function FetchError({ message = 'Something went wrong. Please try again.', onRetry }: FetchErrorProps) {
  return (
    <div className={styles.root} role="alert">
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button type="button" className={styles.retryBtn} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
