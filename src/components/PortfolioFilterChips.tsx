// Safe to edit by hand
// Filter chips for /portfolio. Two filter axes — room type + design style —
// each rendered as a horizontal row of quiet pill chips. Active chip gets a
// bronze fill; resting state is taupe-bordered.
//
// Filtering is DOM-based: each project list item carries data-roomtype and
// data-designstyle attributes set by the .astro page. The chip handlers
// toggle classes that fade-and-scale non-matching items.
//
// Persisted in URL hash so direct links keep the filter state ("/portfolio#kitchen").
// Resets when both filter axes are empty.

import { useEffect, useMemo, useState } from 'react';

interface Props {
  /** Unique room-type values present in the portfolio, with display labels. */
  rooms: Array<{ value: string; label: string }>;
  /** Unique design-style values present in the portfolio, with display labels. */
  styles: Array<{ value: string; label: string }>;
}

export default function PortfolioFilterChips({ rooms, styles }: Props) {
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [activeStyle, setActiveStyle] = useState<string | null>(null);

  // Restore from URL hash on mount.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const r = params.get('room');
    const s = params.get('style');
    if (r) setActiveRoom(r);
    if (s) setActiveStyle(s);
  }, []);

  // Apply DOM-side filtering whenever filters change.
  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>('[data-project-item]');
    let visibleCount = 0;
    items.forEach((item) => {
      const r = item.getAttribute('data-roomtype') ?? '';
      const s = item.getAttribute('data-designstyle') ?? '';
      const roomOk = !activeRoom || r === activeRoom;
      const styleOk = !activeStyle || s === activeStyle;
      const visible = roomOk && styleOk;
      if (visible) visibleCount++;
      item.classList.toggle('is-filtered-out', !visible);
    });

    // Update empty-state hint visibility.
    const emptyHint = document.querySelector('[data-portfolio-empty-filter]');
    if (emptyHint) {
      (emptyHint as HTMLElement).style.display = visibleCount === 0 ? 'block' : 'none';
    }

    // Sync hash without disrupting scroll.
    const params = new URLSearchParams();
    if (activeRoom) params.set('room', activeRoom);
    if (activeStyle) params.set('style', activeStyle);
    const next = params.toString();
    const nextHash = next ? `#${next}` : '';
    if (window.location.hash !== nextHash) {
      history.replaceState(null, '', window.location.pathname + window.location.search + nextHash);
    }
  }, [activeRoom, activeStyle]);

  const hasAnyFilter = activeRoom !== null || activeStyle !== null;

  if (rooms.length < 2 && styles.length < 2) {
    // Filtering isn't meaningful with fewer than 2 of each axis. Don't render
    // chips that can't actually narrow anything down — that would just be
    // visual noise.
    return null;
  }

  return (
    // Lighter framing — single top rule + bottom padding, no bracketing
    // border-y. Audit feedback: the original border-y read as a cage around
    // the chips; a single hairline above gives "section start" without
    // boxing the filter row in.
    <div className="border-t border-border-soft pt-l pb-s space-y-m">
      {rooms.length >= 2 && (
        <FilterRow
          eyebrow="Room"
          options={rooms}
          active={activeRoom}
          onSelect={setActiveRoom}
        />
      )}
      {styles.length >= 2 && (
        <FilterRow
          eyebrow="Style"
          options={styles}
          active={activeStyle}
          onSelect={setActiveStyle}
        />
      )}
      {hasAnyFilter && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              setActiveRoom(null);
              setActiveStyle(null);
            }}
            className="press-tactile text-xs uppercase tracking-eyebrow text-link underline underline-offset-4 hover:text-primary-dark"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

interface FilterRowProps {
  eyebrow: string;
  options: Array<{ value: string; label: string }>;
  active: string | null;
  onSelect: (next: string | null) => void;
}

function FilterRow({ eyebrow, options, active, onSelect }: FilterRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-m gap-y-s justify-center">
      <p className="text-xs uppercase tracking-eyebrow text-foreground/80 w-full text-center sm:w-auto sm:text-left">
        {eyebrow}
      </p>
      <ul className="flex flex-wrap justify-center gap-xs list-none p-0">
        {options.map((opt) => {
          const isActive = active === opt.value;
          return (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => onSelect(isActive ? null : opt.value)}
                aria-pressed={isActive}
                className={[
                  // 44px min-height per CLAUDE.md tap-target rule (WCAG 2.5.5 / target audit fix).
                  'press-tactile inline-flex items-center min-h-[44px] px-m py-s text-xs font-medium rounded-full transition-colors',
                  isActive
                    ? 'bg-primary-dark text-white border border-primary-dark'
                    : 'border border-border-soft text-foreground/85 hover:border-primary hover:text-link',
                ].join(' ')}
              >
                {opt.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
