import type { CollectionItem } from 'src/types/collection.types';
import styles from './ResultsGrid.module.css';
import ResultCard from '../ResultCard';

interface ResultsGridProps {
  results: CollectionItem[];
  getValue: (item: CollectionItem, field: string) => string;
  buildLinkUrl: (item: CollectionItem) => string;
  titleField: string;
  descField: string;
  imageField: string;
  categoryField: string;
  metaField: string;
  readMoreText: string;
}

export default function ResultsGrid({
  results,
  getValue,
  buildLinkUrl,
  titleField,
  descField,
  imageField,
  categoryField,
  metaField,
  readMoreText,
}: ResultsGridProps) {
  return (
    <ul className={styles.searchResultsGrid} role="list">
      {results.map((item) => (
        <li key={item.id}>
          <ResultCard
            item={item}
            getValue={getValue}
            buildLinkUrl={buildLinkUrl}
            titleField={titleField}
            descField={descField}
            imageField={imageField}
            categoryField={categoryField}
            metaField={metaField}
            readMoreText={readMoreText}
          />
        </li>
      ))}
    </ul>
  );
}
