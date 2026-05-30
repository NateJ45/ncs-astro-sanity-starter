// Foundation, edit with care
// Sticky sidebar table of contents for case studies. Auto-generated from the
// h2/h3/h4 headings in the project's introStory Portable Text. Uses
// IntersectionObserver for scroll-spy active-state highlighting.
//
// Hidden below lg breakpoint (mobile/tablet readers don't need it competing
// with content for screen space).

import { useEffect, useState, type MouseEvent } from 'react';
import type { Heading } from '@/lib/portable-text-headings';

interface Props {
  headings: Heading[];
}

// Smooth-scroll the TOC link through Lenis instead of letting the browser snap
// instantly to the anchor. Lenis honors the `scroll-mt-24` on the headings, so
// the target clears the sticky header without a manual offset — matching where
// a native anchor jump lands. Falls back to scrollIntoView (which also honors
// scroll-mt-24) when Lenis hasn't loaded yet or the reader prefers reduced motion.
function handleTocClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const target = document.getElementById(id);
  if (!target) return;

  event.preventDefault();

  const lenis = (window as Window & { lenis?: { scrollTo: (t: HTMLElement) => void } }).lenis;

  if (lenis) {
    lenis.scrollTo(target);
  } else {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  history.pushState(null, '', `#${id}`);
}

export default function CaseStudyTOC({ headings }: Props) {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? '');

  useEffect(() => {
    if (headings.length === 0) return;

    const targets = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);

    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost heading currently in view
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        // Trigger when a heading enters the top 1/3 of the viewport
        rootMargin: '-10% 0px -70% 0px',
        threshold: 0,
      },
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="hidden lg:block sticky top-24 self-start">
      <p className="text-xs uppercase tracking-widest text-foreground/80 mb-s">On this page</p>
      <ul className="space-y-1 text-sm border-l border-border-soft">
        {headings.map((h) => {
          const isActive = h.id === activeId;
          const indent = h.level === 3 ? 'pl-m' : h.level === 4 ? 'pl-l' : 'pl-s';
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={(e) => handleTocClick(e, h.id)}
                className={[
                  'block py-1 pr-s -ml-px border-l-2 transition-colors',
                  indent,
                  isActive
                    ? 'border-primary text-link font-semibold'
                    : 'border-transparent text-foreground/85 hover:text-foreground',
                ].join(' ')}
                aria-current={isActive ? 'location' : undefined}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
