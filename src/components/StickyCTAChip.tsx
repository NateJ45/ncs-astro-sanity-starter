// Safe to edit by hand
// Contextual CTA chip that appears at 50% scroll on long pages. Bottom-right,
// above the BackToTop button. Hides on scroll-up so it never blocks reading.
// Honors prefers-reduced-motion. Dismissible via the X — dismissal persists
// for the session via sessionStorage so a single page-view doesn't re-prompt.
//
// Opt-in: only mount on long pages (portfolio detail, services, journal post)
// where a contextual nudge is genuinely useful. NOT on home, where the hero
// CTA is already enough.

import { useEffect, useState } from 'react';

interface Props {
  /** Visible label. Should read as conversational, not pushy. */
  label: string;
  /** Where the chip leads. Defaults to /contact. */
  href?: string;
  /** Scroll-percent threshold (0-1) at which the chip first appears. */
  threshold?: number;
}

const SESSION_KEY = 'sticky-cta-dismissed';

export default function StickyCTAChip({
  label,
  href = '/contact',
  threshold = 0.5,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Respect session-level dismissal so re-visiting the page in the same
    // session doesn't re-prompt. Reset on a new tab/session.
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') {
        setDismissed(true);
        return;
      }
    } catch {
      /* sessionStorage unavailable — fall through */
    }

    // Simple show/hide: visible whenever scroll progress is past the
    // threshold, hidden when above it. A small 2% hysteresis band prevents
    // jitter right at the line (would otherwise toggle on every micro-scroll).
    //
    // The earlier "hide on scroll-down, reveal on scroll-up" behavior was
    // ported from the sticky-header pattern, but it doesn't translate to a
    // small bottom-right chip — the chip isn't blocking reading the way a
    // full-width header is, and any scroll-direction toggle produced a
    // distracting flicker every time the visitor paused-then-resumed
    // scrolling. Once revealed, the chip just stays put until dismissed
    // or scrolled back above threshold.
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? y / docHeight : 0;

        setVisible((current) => {
          // Hysteresis: require crossing slightly above the threshold to hide,
          // so a hover right at 50% doesn't flicker.
          if (current) {
            return progress >= threshold - 0.02;
          }
          return progress >= threshold;
        });
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  function dismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div
      // A11y note: keep pointer-events on ONE state path only — never include
      // both `pointer-events-none` and `pointer-events-auto` in the same
      // className string. Tailwind v4 sorts utilities alphabetically so
      // `pointer-events-none` wins the cascade and the chip becomes visible
      // but unclickable (audit caught this regression).
      //
      // Sizing note: the inner pill carries the max-width + min-w-0 + truncate
      // so a long label can't push the dismiss button off-screen on mobile.
      //
      // Positioning:
      //   - Always sit at bottom-[5.5rem] so it clears the BackToTop button
      //     (which lives at bottom-6 right-6, so its top edge is ~68px from
      //     the bottom — bottom-[5.5rem] = 88px gives ~20px breathing room).
      //   - Mobile: center horizontally via left-1/2 + -translate-x-1/2 so
      //     the chip becomes a "look at this" centered element instead of
      //     colliding with the BackToTop button in the bottom-right corner.
      //   - Desktop (sm+): right-aligned so it doesn't dominate the
      //     reading column.
      // Tailwind composes translate-x + translate-y utilities into a single
      // transform, so combining -translate-x-1/2 with the show/hide
      // translate-y states works correctly.
      className={[
        'fixed z-40 bottom-[5.5rem]',
        'left-1/2 -translate-x-1/2',
        'sm:left-auto sm:translate-x-0 sm:right-m',
        'transition-all duration-300 ease-out',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none',
      ].join(' ')}
      aria-hidden={!visible}
    >
      {/* Width sizing:
           - mobile: cap at 92vw so the chip never blows past the viewport
             (the previous 90vw + pl-l was so tight it truncated common labels)
           - desktop: 28rem cap, enough for ~30-character uppercase tracking
             labels. Past that, truncate kicks in as a safety net.
          Left padding reduced from pl-l to pl-m so more room goes to the
          label text instead of the bronze gutter. */}
      <div className="relative flex items-center gap-1 bg-primary-dark text-white pl-m pr-s py-s rounded-full shadow-lg shadow-foreground/15 max-w-[min(92vw,28rem)]">
        <a
          href={href}
          tabIndex={visible ? 0 : -1}
          className="press-tactile flex items-center gap-2 min-w-0 text-xs font-semibold uppercase tracking-eyebrow"
        >
          <span className="truncate">{label}</span>
          <span aria-hidden="true" className="shrink-0 text-base leading-none">→</span>
        </a>
        <button
          type="button"
          onClick={dismiss}
          tabIndex={visible ? 0 : -1}
          aria-label="Dismiss"
          className="shrink-0 inline-flex items-center justify-center w-11 h-11 -mr-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
