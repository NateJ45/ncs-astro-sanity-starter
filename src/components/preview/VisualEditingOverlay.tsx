// Foundation, edit with care
import { VisualEditing } from '@sanity/visual-editing/react';
import type { HistoryAdapter, HistoryRefresh } from '@sanity/visual-editing';
import { useCallback, useEffect, useRef } from 'react';
import { SOFT_REFRESH_EVENT, useInstantText } from './overlay/useInstantText.ts';
import { startTiming } from './overlay/timing.ts';
import { inCanvasControls } from './overlay/index.ts';
import {
  createRefreshState,
  onChange as onRefreshChange,
  onKnownChange,
  onSettled,
  onStart,
  shouldStart,
} from '../../lib/preview-refresh.ts';
import { isRedundantRender, morph } from '../../lib/preview-morph.ts';
import {
  POSTED_DRAFT_HEADER,
  localChannelCovers,
  parseChangeSignal,
  parseLiveDraft,
  type LiveDraftDocument,
} from '../../lib/preview-live-draft.ts';
import { sameContent } from '../../lib/preview-text-diff.ts';

// Studio-driven navigation (the navigator side panel, document locations, the
// preview URL bar) reaches the iframe through this adapter. The DEFAULT is
// SPA-style: history.pushState and assume the app re-renders. But every preview
// page here is its own server-rendered document, so the URL would change while
// the page never did. An MPA adapter instead: any push/replace to a different
// URL is a REAL load. Module-level so the overlay never resubscribes on
// re-render. (Ported from presacademy 2026-08-28.)
//
// TWO NOTES ON THE HOST, both read out of the pinned sources (2026-08-28):
//
//  - `subscribe` REPORTS. The host's History.tsx posts whatever we hand the
//    callback as `visual-editing/navigate`, and Presentation treats a reported
//    url that differs from its own bookkeeping as "the frame moved here" and
//    rewrites `params.preview` to match. So this report is not decorative: it is
//    the frame's authoritative statement of where it is, and it must be exact.
//  - Presentation DROPS a navigation asked for while its overlay channel is not
//    connected, while still recording the target as though it had been made.
//    Nothing in the frame can recover that; the Studio side has to ask again.
//    See src/lib/preview-navigation.ts, which is where that retry lives.
const locationNow = () => window.location.pathname + window.location.search;

const mpaHistory: HistoryAdapter = {
  subscribe: (navigate) => {
    navigate({ type: 'replace', url: locationNow() });
    return () => {};
  },
  update: (update) => {
    if (update.type === 'pop') {
      window.history.back();
      return;
    }
    if (update.type !== 'push' && update.type !== 'replace') return;
    // Compare like for like. Presentation normally sends a root-relative path,
    // but it sends an absolute URL when its param holds one, and a bare string
    // comparison against pathname+search would then load the page we are on.
    let next = update.url;
    try {
      const target = new URL(update.url, window.location.href);
      if (target.origin !== window.location.origin) return;
      next = target.pathname + target.search;
    } catch {
      // Not parseable as a URL at all: fall through and compare the raw string.
    }
    if (next === locationNow()) return;
    window.location.assign(update.url);
  },
};

// =============================================================================
// VisualEditingOverlay - click-to-edit overlay + refresh for the preview
// =============================================================================
// Three jobs, all only ever active in the Studio's Presentation preview (this is
// rendered from PreviewLayout with client:only when draftMode is true, so it
// never ships to a public page):
//
//  1. <VisualEditing> draws the click-to-edit overlay and opens the comlink to
//     the parent Studio window. It is also what turns the `data-sanity`
//     attributes from src/lib/preview-edit-attr.ts into in-canvas section
//     controls (insert / duplicate / remove / drag), with no extra props. The
//     `components` prop adds THIS repo's own floating controls on top of that
//     (PORTS.md card 28): the click-a-word heading accent and the "Edit here"
//     text card. See ./overlay/index.ts for the four host facts they rely on.
//  2. Refresh: the content is server-rendered Astro, so we soft-refetch THIS
//     preview URL and RECONCILE the fresh <main> into the live one. No full
//     reload, no scroll jump, and click-to-edit keeps working because the
//     refetched HTML is draft-fetched with stega too. Triggers:
//     a. AUTO: an EventSource on /preview/live (the Worker proxies Sanity's
//        listen API into tiny "change" signals). Event-driven on purpose;
//        never reintroduce an interval poll here.
//     b. MANUAL: the comlink `refresh` handler, i.e. the preview's refresh
//        button, kept as the fallback if the stream is down. Its `mutation`
//        calls only mark a running render stale (card 182a).
//     c. LOCAL (card 184): the Studio's own copy of the draft, posted into the
//        frame as the editor types. The refresh POSTs it and the server
//        renders it, so this is the trigger that shows an edit; while it is
//        live, (a) and (b) ignore changes to this page's own document.
//     Both triggers go through the SCHEDULER in src/lib/preview-refresh.ts:
//     single-flight, stale-response discard, and a floor on the interval between
//     renders. Read that file before touching anything below; it is where the
//     six-concurrent-renders 1102 and the reverting-text bug are written up.
//     HOW the fresh HTML lands is src/lib/preview-morph.ts: an in-place morph,
//     never a wholesale swap. That file has the measurements; the short version
//     is that replacing <main> re-decoded fourteen images and blocked the main
//     thread for about a second, twice per keystroke.
//  3. INSTANT TEXT (`useInstantText`, 2026-08-28): the refresh above is the
//     COMPLETE answer, and it is not the FAST one. Plain strings are swapped
//     into the page the moment the edit reaches the frame, which is well before
//     the server can re-render it. See ./overlay/useInstantText.ts for what it
//     will and will not touch, and why it re-applies itself after each refresh.
//     It is ALSO a change event for the scheduler above (`noteInstantChange`):
//     the document it just applied is the newest one anybody knows about, so any
//     render started before it is stale even though no SSE signal has arrived
//     for it yet.
//
// TIMING. Set `localStorage.previewTiming = '1'` in the preview frame to have
// both paths log how long they took. See ./overlay/timing.ts.
// =============================================================================

interface Props {
  /** The doc id this preview renders (a singleton id like "homePage", or a page
      doc id), for the live listen filter. */
  pageId: string;
}

export default function VisualEditingOverlay({ pageId }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** The scheduler's state. A ref, not React state: no render depends on it. */
  const schedule = useRef(createRefreshState());
  /** Callers whose change no started refresh covers yet. */
  const waiting = useRef<Array<() => void>>([]);
  /** Callers the in-flight refresh covers, resolved only if it is accepted. */
  const covered = useRef<Array<() => void>>([]);
  /**
   * The markup of the last render that was accepted, morphed or skipped.
   *
   * Half of the fast path: when the server hands back bytes it has already
   * handed back, it has not caught up with the edit yet, and applying them would
   * undo instant text for a task and then redo it. Serialized from the PARSED
   * element rather than kept as the raw response, so it is comparable with the
   * live tree's own `outerHTML`.
   */
  const lastMarkup = useRef<string | null>(null);
  /**
   * The newest draft of THIS page the Studio's local channel has posted, or
   * null when it has none (never spoke, or said "no draft"). Card 184: the soft
   * refresh POSTs it, so the server renders the Studio's own copy instead of
   * waiting for the autosave and the query index.
   */
  const localDraft = useRef<LiveDraftDocument | null>(null);
  /** When that draft arrived, for `localChannelCovers`. */
  const lastLocalAt = useRef<number | null>(null);

  // `tick` and `runRefresh` call each other (a refresh that settles asks whether
  // another is owed). A ref breaks the cycle without either one changing
  // identity, which matters: `softRefresh` is a dependency of the SSE effect,
  // and a new identity there would tear down and reopen the listen connection.
  const tickRef = useRef<() => void>(() => {});

  // INSTANT TEXT IS ALSO A CHANGE EVENT (2026-08-28). The scheduler decides a
  // completed render is stale by comparing the sequence it was stamped with
  // against the newest one known, and until this callback existed, "known" meant
  // only what the SSE stream had reported, which runs at Sanity's transaction
  // visibility, about a second behind the keystroke. So a render that started
  // before the words below were typed still looked current when it landed, and
  // the morph wrote the server's half-finished sentence over the finished one:
  // the editor's "half my text disappears, then comes back".
  //
  // Bumping here makes staleness a property of the newest DOCUMENT rather than
  // of the slowest channel. It does NOT start a render (2026-10-26, card 182):
  // this channel is a second ahead of what Sanity can serve to a query, so a
  // render started now reads the old data and is thrown away. Measured: one
  // keystroke cost three renders 1.2s apart, the edit showing at about 3.4s.
  // The SSE `change` below fires at query visibility and starts the one render
  // that carries the edit; a render already in flight is discarded and
  // `onSettled` re-arms its follow-up, so nothing is ever left unrendered.
  //
  // No resolver is registered: nobody is awaiting a promise for this, unlike
  // `softRefresh`, which serves the comlink's refresh button.
  const noteInstantChange = useCallback(() => {
    schedule.current = onKnownChange(schedule.current);
  }, []);

  // Job 3: swap changed plain strings in as the edit arrives, without waiting
  // for the refetch below. Safe to call here rather than inside <VisualEditing>:
  // the optimistic actor it reads is module state in @sanity/visual-editing, not
  // React context, so sibling order does not matter.
  useInstantText(pageId, noteInstantChange);

  // ONE refresh: fetch this preview URL, and swap in the fresh <main> unless the
  // scheduler says the sequence moved while we were out, in which case this HTML
  // is older than what the page already shows and swapping it in is the
  // reverting-text bug. Discarded responses cost a render and change nothing;
  // the follow-up the scheduler arms renders the truth.
  const runRefresh = useCallback(async () => {
    const stop = startTiming('soft-refresh');
    let html: string | null = null;
    // Card 184: with a local draft in hand, the server renders THAT (it checks
    // it is this page's draft and falls back to the stored one otherwise).
    // Read once, here: the scheduler stamped this start with the sequence the
    // draft belongs to, so a newer post makes this render stale, as it should.
    const draft = localDraft.current;
    try {
      const res = await fetch(
        window.location.href,
        draft
          ? {
              method: 'POST',
              headers: {
                'x-preview-soft-refresh': '1',
                [POSTED_DRAFT_HEADER]: '1',
                'content-type': 'application/json',
              },
              body: JSON.stringify({ document: draft }),
            }
          : { headers: { 'x-preview-soft-refresh': '1' } },
      );
      html = await res.text();
    } catch {
      // The fetch itself failed. Settle the scheduler first so the state cannot
      // be left with a phantom refresh in flight, then fall back to a reload.
      schedule.current = onSettled(schedule.current, Date.now()).state;
      // A reload answers everyone, covered and waiting alike, but resolve them
      // rather than leaving promises the refresh button would spin on until it
      // lands.
      [...covered.current, ...waiting.current].forEach((resolve) => resolve());
      covered.current = [];
      waiting.current = [];
      window.location.reload();
      return;
    }

    const settled = onSettled(schedule.current, Date.now());
    schedule.current = settled.state;
    if (!settled.accepted) {
      stop('discarded (stale)');
      // This refresh covered nobody. Its callers roll into the follow-up, which
      // the scheduler has already marked dirty for.
      waiting.current = [...covered.current, ...waiting.current];
      covered.current = [];
      tickRef.current();
      return;
    }

    const resolvers = covered.current;
    covered.current = [];
    try {
      const next = new DOMParser().parseFromString(html, 'text/html').querySelector('#main');
      const current = document.getElementById('main');
      const markup = next ? next.outerHTML : '';
      if (!next || !current) {
        window.location.reload();
      } else if (isRedundantRender(markup, current.outerHTML, lastMarkup.current)) {
        // NOTHING TO DO, and deliberately nothing announced either. Both ways of
        // being redundant are in preview-morph.ts; what matters here is that a
        // skip must NOT fire SOFT_REFRESH_EVENT:
        //   - the index is still valid, because no text node was detached, so
        //     rebuilding it would be pure cost;
        //   - the event is also the pending-swap memory's "the server now
        //     agrees" signal, and on the `fetched === lastAccepted` branch the
        //     server demonstrably does NOT agree - it re-rendered the same bytes
        //     as last time. Firing would retire swaps that have not landed and
        //     re-open the revert this whole loop exists to prevent. On the other
        //     branch the swaps HAVE landed, and retiring them one refresh later
        //     costs one map entry and one no-op re-apply.
        // The callers still resolve below: we asked the server and it had
        // nothing new, which is a completed refresh, not a skipped one.
        lastMarkup.current = markup;
        stop('unchanged (skipped)');
      } else if (morph(current, next)) {
        lastMarkup.current = markup;
        // The instant-text path indexes the old text nodes and may be holding
        // swaps this HTML predates. Tell it to rebuild and re-apply. Belt and
        // braces now that every instant-text document bumps the sequence too: a
        // render begun after the newest document we know of should be carrying
        // its words, but it read the QUERY INDEX, which the local channel does
        // not wait for, so it can still be a version behind.
        window.dispatchEvent(new CustomEvent(SOFT_REFRESH_EVENT));
        stop('main morphed');
      } else {
        // The morph bailed (a cap, or a DOM call that threw). It may have moved
        // part of `next` into the page on its way out, so `next` is no longer a
        // whole <main>: re-parse and do exactly what this code did before the
        // morph existed. Slow, correct, and unreachable in normal operation.
        const fresh = new DOMParser().parseFromString(html, 'text/html').querySelector('#main');
        if (fresh) {
          lastMarkup.current = markup;
          current.replaceWith(fresh);
          window.dispatchEvent(new CustomEvent(SOFT_REFRESH_EVENT));
          stop('main replaced (morph bailed)');
        } else window.location.reload();
      }
    } finally {
      resolvers.forEach((resolve) => resolve());
    }
    tickRef.current();
  }, []);

  // Ask the scheduler what to do, and do exactly that: start now, arm one timer
  // for the instant a gate opens, or nothing. Never more than one timer.
  const tick = useCallback(() => {
    const now = Date.now();
    const decision = shouldStart(schedule.current, now);
    clearTimeout(timer.current);
    if (decision.start) {
      schedule.current = onStart(schedule.current, now);
      covered.current = [...covered.current, ...waiting.current];
      waiting.current = [];
      void runRefresh();
      return;
    }
    if (decision.waitMs > 0) timer.current = setTimeout(() => tickRef.current(), decision.waitMs);
  }, [runRefresh]);
  tickRef.current = tick;

  // A change arrived. Register the caller, advance the sequence (which is what
  // makes any in-flight response stale), and let the scheduler decide the rest.
  const softRefresh = useCallback(
    () =>
      new Promise<void>((resolve) => {
        waiting.current.push(resolve);
        schedule.current = onRefreshChange(schedule.current, Date.now());
        tick();
      }),
    [tick],
  );

  // Never leave a timer behind on unmount.
  useEffect(() => () => clearTimeout(timer.current), []);

  // THE LOCAL CHANNEL STARTS THE RENDER (2026-10-26, card 184). The Studio posts
  // its own copy of the draft (src/sanity/components/LiveDraftBridge.tsx), and
  // the soft refresh now sends that copy to the server, so a render started on
  // it already carries the edit: no waiting for the autosave and the query
  // index, which is what the SSE `change` used to stand for. Same scheduler,
  // same 80ms debounce, 1200ms floor, single flight and stale discard; one
  // render per burst, started a second sooner.
  //
  // `useInstantText` hears the same message and calls `onKnownChange`, which
  // only bumps the sequence. The tick is deferred a task so that bump can never
  // land AFTER this render starts and mark it stale: listener order is not
  // something to lean on. `document: null` (no draft: published or discarded)
  // hands the page back to the SSE, which then renders the stored document.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const message = parseLiveDraft(event.data);
      if (!message) return;
      const doc = message.document;
      if (!doc) {
        localDraft.current = null;
        lastLocalAt.current = null;
        return;
      }
      // A post for the page the frame was on a moment ago is not this page.
      if (doc._id !== `drafts.${pageId}`) return;
      lastLocalAt.current = Date.now();
      const previous = localDraft.current;
      localDraft.current = doc;
      // An autosave re-sends the same words under a new `_rev`: not an edit.
      if (previous && sameContent(previous, doc)) return;
      schedule.current = onRefreshChange(schedule.current, Date.now());
      clearTimeout(timer.current);
      timer.current = setTimeout(() => tickRef.current(), 0);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [pageId]);

  /** A change to this page that the local channel has already rendered. */
  const coveredLocally = useCallback(
    (changedId: string | null) =>
      localChannelCovers(changedId, pageId, lastLocalAt.current, Date.now()),
    [pageId],
  );

  // Auto-refresh: subscribe to the Worker's change stream WHILE THIS PREVIEW TAB
  // IS VISIBLE. Relevance filtering already happened server-side in the GROQ
  // listen filter, so every "change" event means "refetch now". The Page
  // Visibility gate matters for cost: a Studio tab left open in the background
  // would otherwise hold the listen connection open and keep reconnecting, each
  // reconnect a fresh non-CDN Sanity request on the free-plan quota.
  // Hidden closes it; visible again reopens and does ONE catch-up refetch.
  //
  // AND THE BFCACHE (2026-08-28). A standalone /preview tab that navigates away
  // can be frozen rather than unloaded, and a frozen page's EventSource is NOT
  // guaranteed to be torn down; the upstream Sanity listen behind it would keep
  // its Worker invocation alive for a page nobody is looking at. Chrome fires
  // `visibilitychange` before `pagehide` and the close above covers it, but
  // Safari has shipped versions that go straight to `pagehide`, so it gets its
  // own handler; `pageshow` restores the connection with the same catch-up a
  // tab-switch gets. Cheap, and the failure it prevents is invisible until the
  // Worker starts refusing connections.
  useEffect(() => {
    let es: EventSource | null = null;
    let wasHidden = false;
    // The event names the changed document (card 184). This page's own
    // document, while the local channel is live, was rendered from the Studio's
    // copy a second ago: skip it entirely, because even marking the running
    // render stale would throw away the render that HAS the edit. Every other
    // document (site settings, a synced section), an event that names nothing,
    // and a channel gone quiet all render as before.
    const onChange = (event: Event) => {
      if (coveredLocally(parseChangeSignal((event as MessageEvent).data))) return;
      void softRefresh();
    };

    const open = () => {
      if (es) return;
      es = new EventSource(`/preview/live/?page=${encodeURIComponent(pageId)}`);
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

    // Frozen or unloading: drop the connection, and remember that we did so the
    // restore below takes the catch-up path rather than assuming nothing moved.
    const onPageHide = () => {
      wasHidden = true;
      close();
    };

    sync();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', sync);
      close();
    };
  }, [coveredLocally, pageId, softRefresh]);

  const refresh = useCallback(
    (payload: HistoryRefresh): false | Promise<void> => {
      // The "Refresh" button in Presentation.
      if (payload.source === 'manual') return softRefresh();
      // A document was edited and autosaved. Refetch when THIS page changed, or
      // when a shared or referenced doc changed (services, testimonials,
      // process steps, settings: anything that is not some OTHER custom page),
      // since those can appear on this page through the auto-populating blocks.
      //
      // But a mutation only MARKS a running render stale; it never starts one
      // (card 182a, 2026-10-26). @sanity/visual-editing calls this twice per
      // autosave, at once and again 1000ms later, and both arrive before the
      // edit is visible to a query, so each started a render of the old data.
      // Measured on the deployed Studio after card 182: still three renders per
      // keystroke, 1.2s apart. The SSE `change` (query visibility) starts the one
      // render that carries the edit. Returning false tells the library we did
      // nothing, so it posts no "refreshing" state to the Studio.
      const id = payload.document._id.replace(/^drafts\./, '');
      const isThisPage = id === pageId;
      const isSharedDoc = payload.document._type !== 'page';
      // This page, while the local channel is live: the render it would mark
      // stale is the one carrying the edit (card 184). Leave it alone.
      if (isThisPage && coveredLocally(id)) return false;
      if (isThisPage || isSharedDoc) schedule.current = onKnownChange(schedule.current);
      return false;
    },
    [coveredLocally, pageId, softRefresh],
  );

  return (
    <VisualEditing portal refresh={refresh} history={mpaHistory} components={inCanvasControls} />
  );
}
