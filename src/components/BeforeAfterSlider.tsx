// Foundation, edit with care
// Drag-to-reveal before/after image slider. Both images stack at the same
// position; the after-image is clipped horizontally based on slider position.
//
// Accessibility:
//   - Slider handle is a focusable element with role="slider"
//   - aria-valuemin/max/now and aria-valuetext describe the current position
//   - Arrow keys move the divider 5% at a time; Home/End jump to 0/100%
//   - Falls back to a tap-to-toggle behavior under prefers-reduced-motion
//     (the global CSS rule kills the slider transition; clicks still work)

import { useCallback, useEffect, useRef, useState } from 'react';
import { urlFor } from '@/lib/sanity';

interface SanityImage {
  asset?: { _ref?: string; _id?: string };
  alt?: string;
}

interface Props {
  beforeImage: SanityImage;
  afterImage: SanityImage;
  caption?: string;
  /** Initial divider position 0–100, default 50. */
  initialPosition?: number;
  /** Render width target for the image (Sanity transform). Default 1600. */
  width?: number;
}

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  caption,
  initialPosition = 50,
  width = 1600,
}: Props) {
  const [pos, setPos] = useState(initialPosition);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const beforeUrl = beforeImage.asset
    ? urlFor(beforeImage).width(width).quality(75).format('webp').url()
    : '';
  const afterUrl = afterImage.asset
    ? urlFor(afterImage).width(width).quality(75).format('webp').url()
    : '';

  const move = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const next = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPos(next);
  }, []);

  // Pointer events cover mouse + touch + stylus
  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    move(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    move(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 5;
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        setPos((p) => Math.max(0, p - step));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setPos((p) => Math.min(100, p + step));
        break;
      case 'Home':
        e.preventDefault();
        setPos(0);
        break;
      case 'End':
        e.preventDefault();
        setPos(100);
        break;
    }
  };

  if (!beforeUrl || !afterUrl) return null;

  // Pill opacities track the slider so the "Before" label fades as the After
  // image takes over (and vice versa). Keeps the affordance readable without
  // shouting once the user is engaged with the drag.
  const beforeOpacity = Math.max(0.25, 1 - pos / 100);
  const afterOpacity = Math.max(0.25, pos / 100);

  return (
    <figure className="my-section-md">
      {/* Cream-toned mat frames the slider, separating it from the body type
          and signaling "this is a deliberate visual moment." Padding scales
          fluid; on mobile the mat collapses to a thin border to save space. */}
      <div className="rounded-md border border-border-soft bg-muted p-s sm:p-m md:p-l">
        <div
          ref={containerRef}
          className="relative w-full cursor-ew-resize touch-none overflow-hidden rounded-sm select-none"
          style={{ aspectRatio: '3 / 2', backgroundColor: 'var(--card)' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Before image — full underneath */}
          <img
            src={beforeUrl}
            alt={beforeImage.alt ?? 'Before'}
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />

          {/* After image — clipped to pos% from the left */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
            aria-hidden="true"
          >
            <img
              src={afterUrl}
              alt={afterImage.alt ?? 'After'}
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          </div>

          {/* Divider line + handle */}
          <div
            className="absolute top-0 bottom-0 w-px bg-white/95 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
            style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
            aria-hidden="true"
          />
          <button
            type="button"
            role="slider"
            aria-label={`${beforeImage.alt ?? 'Before'} / ${afterImage.alt ?? 'After'} reveal slider`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pos)}
            aria-valuetext={`Showing ${Math.round(pos)}% of the after image`}
            tabIndex={0}
            onKeyDown={onKeyDown}
            className="absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary bg-white text-primary shadow-lg transition-transform hover:scale-105 focus:ring-4 focus:ring-ring/40 focus:outline-none"
            style={{ left: `${pos}%` }}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 8h10M3 8l3-3M3 8l3 3M13 8l-3-3M13 8l-3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Editorial pill labels — opacity tracks the slider position so the
              dominant image's label fades back. Subtle, not shouty. */}
          <span
            className="absolute top-s left-s rounded-full bg-white/85 px-2.5 py-1 text-[0.65rem] font-semibold tracking-eyebrow text-primary-dark uppercase backdrop-blur-sm transition-opacity"
            style={{ opacity: beforeOpacity }}
          >
            Before
          </span>
          <span
            className="absolute top-s right-s rounded-full bg-primary-dark/95 px-2.5 py-1 text-[0.65rem] font-semibold tracking-eyebrow text-white uppercase backdrop-blur-sm transition-opacity"
            style={{ opacity: afterOpacity }}
          >
            After
          </span>
        </div>
      </div>
      {caption ? (
        <figcaption className="mx-auto mt-s max-w-prose text-center text-sm text-foreground/75 italic md:text-base">
          {caption}
        </figcaption>
      ) : (
        // No caption set — gentle prompt so editors know what's missing.
        // Kept in muted color so it doesn't loud in production.
        <figcaption className="mt-s text-center text-xs text-muted-foreground/60 italic">
          {/* deliberately empty: encourages adding context without yelling */}
        </figcaption>
      )}
    </figure>
  );
}
