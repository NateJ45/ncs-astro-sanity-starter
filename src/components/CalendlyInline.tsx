// Safe to edit by hand
// Inline Calendly scheduler with click-to-load fallback. The Calendly widget
// is heavy (~250KB JS + iframe), so we DON'T auto-mount it. Visitors see a
// quiet placeholder ("Open the scheduler") that swaps in the iframe when
// they actively engage. Performance-budget-friendly: no payload on visitors
// who just read the contact page and submit the form.
//
// Honors prefers-reduced-motion (skips the swap animation; iframe still loads
// when clicked).

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Full Calendly URL — e.g. https://calendly.com/your-handle/discovery-call */
  url: string;
  /** Optional label override for the load button. */
  loadLabel?: string;
}

function toEmbedUrl(url: string): string {
  // Calendly accepts ?embed_domain & embed_type on its public scheduler URLs.
  try {
    const u = new URL(url);
    if (typeof window !== 'undefined') {
      u.searchParams.set('embed_domain', window.location.host);
    }
    u.searchParams.set('embed_type', 'Inline');
    u.searchParams.set('hide_event_type_details', '0');
    u.searchParams.set('hide_gdpr_banner', '1');
    return u.toString();
  } catch {
    return url;
  }
}

export default function CalendlyInline({
  url,
  loadLabel = 'Open the scheduler',
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // When the user loads the embed, scroll it gently into view so they don't
  // have to hunt for it on mobile. Skipped under reduced-motion.
  useEffect(() => {
    if (!loaded) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    wrapperRef.current?.scrollIntoView({
      block: 'start',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [loaded]);

  if (!url) return null;

  return (
    <div ref={wrapperRef} className="mt-l">
      {!loaded ? (
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="press-tactile w-full rounded-md border border-border-soft bg-muted/60 hover:bg-muted px-l py-section-md text-left transition-colors group"
        >
          <p className="text-xs uppercase tracking-eyebrow text-foreground/80 mb-s">
            Or pick a time directly
          </p>
          <p className="font-display text-h3 text-foreground group-hover:text-primary-dark transition-colors">
            {loadLabel} <span aria-hidden="true" className="ml-xs transition-transform group-hover:translate-x-1 inline-block">→</span>
          </p>
          <p className="mt-xs text-sm text-foreground/80">
            Opens the 20-minute discovery call calendar in place. We don't load it until you ask.
          </p>
        </button>
      ) : (
        <div className="rounded-md overflow-hidden border border-border-soft bg-card">
          <iframe
            src={toEmbedUrl(url)}
            title="Schedule a discovery call"
            className="block w-full"
            style={{ height: 'min(75vh, 720px)', minHeight: '480px' }}
            loading="lazy"
            allow="clipboard-write"
          />
        </div>
      )}
    </div>
  );
}
