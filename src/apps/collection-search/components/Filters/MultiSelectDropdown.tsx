import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './Filters.module.css';
import { toLabel } from '../../utils/toLabel';

const ChevronIcon = () => (
  <svg className={styles.multiChevron} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

interface MultiSelectDropdownProps {
  field: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}

export default function MultiSelectDropdown({ field, options, value, onChange }: MultiSelectDropdownProps) {
  const label    = toLabel(field);
  const selected = Array.isArray(value) ? value : [];
  const isActive = selected.length > 0;
  const [open,       setOpen]       = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const wrapperRef      = useRef<HTMLDivElement>(null);
  const triggerRef      = useRef<HTMLButtonElement>(null);
  const panelRef        = useRef<HTMLDivElement>(null);
  const focusedIndexRef = useRef(0);

  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPanelStyle({
      position: 'absolute',
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: Math.max(rect.width, 180),
      zIndex: 9999,
    });
  }, []);

  // Panel is portaled to document.body, so both wrapperRef and panelRef must be checked
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current?.contains(e.target as Node) ||
        panelRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', reposition, true); // capture catches nested scrollers
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleToggle() {
    if (!open) reposition();
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (open) {
      focusedIndexRef.current = 0;
      const first = panelRef.current?.querySelectorAll('input[type="checkbox"]')[0];
      (first as HTMLElement | undefined)?.focus();
    }
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const checkboxes = Array.from(
        panelRef.current?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]') ?? []
      );
      if (!checkboxes.length) return;
      const next =
        e.key === 'ArrowDown'
          ? (focusedIndexRef.current + 1) % checkboxes.length
          : (focusedIndexRef.current - 1 + checkboxes.length) % checkboxes.length;
      focusedIndexRef.current = next;
      checkboxes[next]?.focus();
    }
  }

  function toggle(opt: string) {
    if (selected.includes(opt)) {
      onChange(selected.filter((v) => v !== opt));
    } else {
      onChange([...selected, opt]);
    }
  }

  return (
    // keydown handling lives only on the portaled panel below — React
    // bubbles portal events through the component tree (this div is the
    // panel's React parent) even though the panel isn't a DOM descendant,
    // so attaching it here too would fire every keypress twice.
    <div className={styles.filterGroup} ref={wrapperRef}>
      <span className={styles.filterLabel}>{label}</span>
      <div className={`${styles.multiWrapper}${open ? ` ${styles.multiWrapperOpen}` : ''}`}>
        <button
          ref={triggerRef}
          type="button"
          className={`${styles.multiTrigger}${isActive ? ` ${styles.active}` : ''}`}
          onClick={handleToggle}
          aria-expanded={open}
          aria-haspopup="true"
        >
          {isActive ? `${label} (${selected.length})` : `All ${label}`}
          {isActive && <span className={styles.multiBadge}>{selected.length}</span>}
          <ChevronIcon />
        </button>
        {open &&
          createPortal(
            // eslint-disable-next-line jsx-a11y/no-static-element-interactions
            <div
              ref={panelRef}
              className={styles.multiPanel}
              style={panelStyle}
              onKeyDown={handleKeyDown}
            >
              {options.map((opt) => (
                <label key={opt} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={() => toggle(opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>,
            document.body
          )}
      </div>
    </div>
  );
}
