import styles from './loading.module.css';

export default function Loading() {
  return (
    <div className={styles.root}>
      <div className={styles.spinner} />
    </div>
  );
}
