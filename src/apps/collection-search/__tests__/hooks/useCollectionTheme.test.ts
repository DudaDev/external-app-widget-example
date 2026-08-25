import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type React from 'react';
import { useCollectionTheme } from '../../hooks/useCollectionTheme';

const defaultParams = {
  resultColumns: 3 as number | string,
  accentColor: '',
  bgColor: '',
  borderColor: '',
  textColor: '',
  textMutedColor: '',
  cardBorderRadius: '',
};

// CSSProperties has no index signature for custom properties — cast to access them in tests
function vars(cssVars: React.CSSProperties): Record<string, unknown> {
  return cssVars as Record<string, unknown>;
}

describe('useCollectionTheme', () => {
  it('includes --search-result-columns from resultColumns', () => {
    const { result } = renderHook(() => useCollectionTheme({ ...defaultParams, resultColumns: 4 }));
    expect(vars(result.current.cssVars)['--search-result-columns']).toBe(4);
  });

  it('parses a string resultColumns value', () => {
    const { result } = renderHook(() => useCollectionTheme({ ...defaultParams, resultColumns: '2' }));
    expect(vars(result.current.cssVars)['--search-result-columns']).toBe(2);
  });

  it('falls back to 3 columns when resultColumns is not a valid number', () => {
    const { result } = renderHook(() => useCollectionTheme({ ...defaultParams, resultColumns: 'bad' }));
    expect(vars(result.current.cssVars)['--search-result-columns']).toBe(3);
  });

  it('omits theme CSS vars when values are empty strings', () => {
    const { result } = renderHook(() => useCollectionTheme(defaultParams));
    expect(vars(result.current.cssVars)['--search-accent']).toBeUndefined();
    expect(vars(result.current.cssVars)['--search-bg']).toBeUndefined();
    expect(vars(result.current.cssVars)['--search-border']).toBeUndefined();
    expect(vars(result.current.cssVars)['--search-text']).toBeUndefined();
    expect(vars(result.current.cssVars)['--search-text-muted']).toBeUndefined();
    expect(vars(result.current.cssVars)['--search-card-radius']).toBeUndefined();
  });

  it('includes theme CSS vars when values are provided', () => {
    const { result } = renderHook(() => useCollectionTheme({
      ...defaultParams,
      accentColor: '#FF0000',
      bgColor: '#FFFFFF',
      cardBorderRadius: '8px',
    }));
    expect(vars(result.current.cssVars)['--search-accent']).toBe('#FF0000');
    expect(vars(result.current.cssVars)['--search-bg']).toBe('#FFFFFF');
    expect(vars(result.current.cssVars)['--search-card-radius']).toBe('8px');
  });
});
