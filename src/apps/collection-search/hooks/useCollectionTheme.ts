import { useMemo } from 'react';
import type { CSSProperties } from 'react';

interface UseCollectionThemeParams {
  resultColumns: number | string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  textMutedColor: string;
  cardBorderRadius: string;
}

interface UseCollectionThemeReturn {
  cssVars: CSSProperties;
}

export function useCollectionTheme({
  resultColumns,
  accentColor,
  bgColor,
  borderColor,
  textColor,
  textMutedColor,
  cardBorderRadius,
}: UseCollectionThemeParams): UseCollectionThemeReturn {
  const cssVars = useMemo<CSSProperties>(() => ({
    '--search-result-columns': parseInt(String(resultColumns), 10) || 3,
    ...(accentColor      && { '--search-accent':     accentColor }),
    ...(bgColor          && { '--search-bg':          bgColor }),
    ...(borderColor      && { '--search-border':      borderColor }),
    ...(textColor        && { '--search-text':        textColor }),
    ...(textMutedColor   && { '--search-text-muted':  textMutedColor }),
    ...(cardBorderRadius && { '--search-card-radius': cardBorderRadius }),
  } as CSSProperties), [resultColumns, accentColor, bgColor, borderColor, textColor, textMutedColor, cardBorderRadius]);

  return { cssVars };
}
