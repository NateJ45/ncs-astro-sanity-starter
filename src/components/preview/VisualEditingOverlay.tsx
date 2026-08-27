// Foundation, edit with care
import { VisualEditing } from '@sanity/visual-editing/react';
import type { HistoryAdapter, HistoryRefresh } from '@sanity/visual-editing';
import { useCallback, useEffect, useRef } from 'react';

// Studio-driven navigation (the navigator side panel, document locations, the
// preview URL bar) reaches the iframe through this adapter. The DEFAULT is
// SPA-style: history.pushState and assume the app re-renders. But every preview
// page here is its own server-rendered document, so the URL would change while
// the page never did. An MPA adapter instead: any push/replace to a different
// URL is a REAL load. Module-level so the overlay never resubscribes on
// re-render. (Ported from presacademy 2026-08-28.)
const mpaHistory: HistoryAdapter = {
  subscribe: (navigate) => {
    navigate({ type: 'replace', url: window.location.pathname + window.location.search });
    return () => {};
  },
  update: (update) => {
    const current = window.location.pathname + window.location.search;
    if (update.type === 'push' || update.type === 'replace') {
      if (update.url !== current) window.location.assign(update.url);
    } else if (update.type === 'pop') {
      window.history.back();
    }
  },
};

// =============================================================================
// VisualEditingOverlay - click-to-edit overlay + refresh for the preview
// =============================================================================
// Two jobs, both only ever active in the Studio's Presentation preview (this is
// rendered from PreviewLayout with client:only when draftMode is true, so it
// never ships to a public page):
//
//  1. <VisualEditing> draws the click-to-edit overlay and opens the comlink to
//     the parent Studio window. It is also what turns the `data-sanity`
//     attributes from src/lib/preview-edit-attr.ts into in-canvas section
//     controls (insert / duplicate / remove / drag), with no extra props.
//  2. Refresh: the content is server-rendered Astro, so we soft-refetch THIS
//     preview URL and swap in the fresh <main>. No full reload, no scroll jump,
//     and click-to-edit keeps working because the swapped-in HTML is
//     draft-fetched with stega too. Triggers:
//     a. AUTO: an EventSource on /preview/live (the Worker proxies Sanity's
//        listen API into tiny "change" signals). Event-driven on purpose;
//        never reintroduce an interval poll here.
//     b. MANUAL: the comlink `refresh` handler, i.e. the preview's refresh
//        button, kept as the fallback if the stream is down.
// =============================================================================

interface Props {
  /** The doc id this preview renders (a singleton id like "homePage", or a page
      doc id), for the live listen filter. */
  pageId: string;
}

export default function VisualEditingOverlay({ pageId }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<Array<() => void>>([]);

  // Coalesce a burst of mutations (autosave fires several in quick succession)
  // into a single refetch, and resolve every awaiting refresh when it lands.
  const softRefresh = useCallback(
    () =>
      new Promise<void>((resolve) => {
        pending.current.push(resolve);
        clearTimeout(timer.current);
        timer.current = setTimeout(async () => {
          const resolvers = pending.current;
          pending.current = [];
          try {
            const res = await fetch(window.location.href, {
              headers: { 'x-preview-soft-refresh': '1' },
            });
            const html = await res.text();
            const next = new DOMParser().parseFromString(html, 'text/html').querySelector('#main');
            const current = document.getElementById('main');
            if (next && current) current.replaceWith(next);
            else window.location.reload();
          } catch {
            window.location.reload();
          } finally {
            resolvers.forEach((r) => r());
          }
        }, 250);
      }),
    [],
  );

  // Auto-refresh: subscribe to the Worker's change stream WHILE THIS PREVIEW TAB
  // IS VISIBLE. Relevance filtering already happened server-side in the GROQ
  // listen filter, so every "change" event means "refetch now". The Page
  // Visibility gate matters for cost: a Studio tab left open in the background
  // would otherwise hold the listen connection open and keep reconnecting, each
  // reconnect a fresh non-CDN Sanity request on the free-plan quota.
  // Hidden closes it; visible again reopens and does ONE catch-up refetch.
  useEffect(() => {
    let es: EventSource | null = null;
    let wasHidden = false;
    const onChange = () => void softRefresh();

    const open = () => {
      if (es) return;
      es = new EventSource(`/preview/live?page=${encodeURIComponent(pageId)}`);
      es.addEventListener('change', onChange);
    };
    const close = () => {
      if (!es) return;
      es.removeEventListener('change', onChange);
      es.close();
      es = null;
    };

    const sync = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden = true;
        close();
        return;
      }
      // Skip the catch-up on the very first mount (the page was just SSR'd).
      const reopening = !es && wasHidden;
      open();
      if (reopening) void softRefresh();
    };

    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      close();
    };
  }, [pageId, softRefresh]);

  const refresh = useCallback(
    (payload: HistoryRefresh): false | Promise<void> => {
      // The "Refresh" button in Presentation.
      if (payload.source === 'manual') return softRefresh();
      // A document was edited and autosaved. Refetch when THIS page changed, or
      // when a shared or referenced doc changed (services, testimonials,
      // process steps, settings: anything that is not some OTHER custom page),
      // since those can appear on this page through the auto-populating blocks.
      const id = payload.document._id.replace(/^drafts\./, '');
      const isThisPage = id === pageId;
      const isSharedDoc = payload.document._type !== 'page';
      return isThisPage || isSharedDoc ? softRefresh() : false;
    },
    [pageId, softRefresh],
  );

  return <VisualEditing portal refresh={refresh} history={mpaHistory} />;
}
