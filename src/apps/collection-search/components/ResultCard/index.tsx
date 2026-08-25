import { useState } from 'react';
import type { CollectionItem } from 'src/types/collection.types';
import styles from './ResultCard.module.css';

function isSafeUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url, window.location.href);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

interface ResultCardProps {
  item: CollectionItem;
  getValue: (item: CollectionItem, field: string) => string;
  buildLinkUrl: (item: CollectionItem) => string;
  titleField: string;
  descField: string;
  imageField: string;
  categoryField: string;
  metaField: string;
  readMoreText: string;
}

export default function ResultCard({
  item,
  getValue,
  buildLinkUrl,
  titleField,
  descField,
  imageField,
  categoryField,
  metaField,
  readMoreText,
}: ResultCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const rawImgUrl = getValue(item, imageField);
  const imgUrl    = imgFailed || !isSafeUrl(rawImgUrl) ? null : rawImgUrl;
  const title     = getValue(item, titleField);
  const desc      = getValue(item, descField);
  const cat       = getValue(item, categoryField);
  const meta      = getValue(item, metaField);
  const linkUrl  = buildLinkUrl(item);
  const safeLink = isSafeUrl(linkUrl) ? linkUrl : '';

  return (
    <article className={styles.resultCard}>
      <div className={styles.resultImageWrap} data-has-image={imgUrl ? 'true' : 'false'}>
        {imgUrl && (
          <img
            className={styles.resultImage}
            src={imgUrl}
            alt={title}
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>
      <div className={styles.resultBody}>
        {cat && <span className={styles.resultCategory}>{cat}</span>}
        <h3 className={styles.resultTitle}>{title}</h3>
        <p className={styles.resultDescription}>{desc}</p>
        {meta && <div className={styles.resultMeta}>{meta}</div>}
        {safeLink && readMoreText && (
          <a className={styles.resultLink} href={safeLink} target="_top" rel="noopener noreferrer" aria-label={title}>
            {readMoreText}
          </a>
        )}
      </div>
    </article>
  );
}
