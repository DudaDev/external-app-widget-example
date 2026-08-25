import styles from './Pagination.module.css';

const PrevIcon = () => (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const NextIcon = () => (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  prevText: string;
  nextText: string;
}

export default function Pagination({ currentPage, totalPages, onPageChange, prevText, nextText }: PaginationProps) {
  return (
    <nav aria-label="Results pagination">
      <div className={styles.searchPagination}>
        <button
          type="button"
          className={styles.paginationBtn}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <PrevIcon /> {prevText}
        </button>
        <span
          className={styles.paginationInfo}
          aria-live="polite"
          aria-atomic="true"
        >
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          className={styles.paginationBtn}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          {nextText} <NextIcon />
        </button>
      </div>
    </nav>
  );
}
