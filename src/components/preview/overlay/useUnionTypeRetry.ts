// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// useUnionTypeRetry - make the overlay ask the Studio again about new sections
// (2026-10-27)
// =============================================================================
// Why: see src/lib/preview-union-retry.ts. In one line: a section added in the
// Studio shows in the frame before the Studio can read it, the overlay asks
// "what type is this item?" exactly once, gets no answer, and never asks again,
// so the layout card and instant typing never mount on that section until the
// frame is reloaded.
//
// What: watch the page for `data-sanity` targets inside array items that were
// not there before. When one appears, add a HIDDEN element with a throwaway
// keyed path on the same document, twice (a commit can take a few seconds to
// become readable), each time for one second. A path the library has not seen
// makes it re-ask about every keyed path on the page; the throwaway one resolves
// to nothing and is ignored.
//
// Never on the live site: this runs inside VisualEditingOverlay, which only
// renders in the Studio's Presentation preview.
// =============================================================================
import { useEffect } from 'react';
import { newKeyedAttrs, retryAttrFor } from '../../../lib/preview-union-retry.ts';

/** When to nudge after a new section appears: soon, then once more for a slow commit. */
const NUDGE_AT_MS = [1500, 4500];
/** How long the hidden element stays (long enough for the library to see it). */
const NUDGE_HOLD_MS = 1000;
/** Marker so this hook's own element is never mistaken for page content. */
const NUDGE_ATTRIBUTE = 'data-ncs-type-retry';

function editAttrs(root: ParentNode): string[] {
  const out: string[] = [];
  for (const el of root.querySelectorAll('[data-sanity]')) {
    if (el.hasAttribute(NUDGE_ATTRIBUTE)) continue;
    const attr = el.getAttribute('data-sanity');
    if (attr) out.push(attr);
  }
  return out;
}

export function useUnionTypeRetry(): void {
  useEffect(() => {
    // Everything already on the page was asked about when the overlay started.
    const seen = new Set(editAttrs(document));
    let n = 0;
    let latest: string | null = null;
    let timers: number[] = [];
    let debounce = 0;

    const nudge = () => {
      if (!latest) return;
      n += 1;
      const attr = retryAttrFor(latest, n);
      if (!attr) return;
      const el = document.createElement('div');
      el.hidden = true;
      el.setAttribute(NUDGE_ATTRIBUTE, '');
      el.setAttribute('data-sanity', attr);
      document.body.appendChild(el);
      timers.push(window.setTimeout(() => el.remove(), NUDGE_HOLD_MS));
    };

    const check = () => {
      const fresh = newKeyedAttrs(seen, editAttrs(document));
      if (!fresh.length) return;
      for (const attr of fresh) seen.add(attr);
      latest = fresh[fresh.length - 1];
      // A newer addition restarts the schedule; leftover hidden elements are
      // removed by their own timers below, so none is ever stranded.
      for (const t of timers) clearTimeout(t);
      timers = NUDGE_AT_MS.map((ms) => window.setTimeout(nudge, ms));
      document.querySelectorAll(`[${NUDGE_ATTRIBUTE}]`).forEach((el) => el.remove());
    };

    const observer = new MutationObserver((mutations) => {
      // Ignore our own element coming and going.
      const ours = mutations.every((m) => {
        const nodes = [...m.addedNodes, ...m.removedNodes];
        return (
          m.type === 'childList' &&
          nodes.length > 0 &&
          nodes.every((node) => node instanceof Element && node.hasAttribute(NUDGE_ATTRIBUTE))
        );
      });
      if (ours) return;
      clearTimeout(debounce);
      debounce = window.setTimeout(check, 200);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-sanity'],
    });

    return () => {
      observer.disconnect();
      clearTimeout(debounce);
      for (const t of timers) clearTimeout(t);
      document.querySelectorAll(`[${NUDGE_ATTRIBUTE}]`).forEach((el) => el.remove());
    };
  }, []);
}
