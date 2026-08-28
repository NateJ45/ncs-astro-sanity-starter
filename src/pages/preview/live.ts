// =============================================================================
// GET /preview/live - server-side SSE proxy for preview auto-refresh
// (ported from presacademy 2026-08-28; original lineage: the WCP site)
// =============================================================================
// The Presentation preview shows DRAFT content, so listening for edits needs
// the Sanity token, which must never reach the browser. This endpoint holds the
// token server-side: it opens ONE long-lived connection to Sanity's listen API
// (SSE mutation events, GROQ-filtered) and forwards a tiny "change" signal to
// the preview overlay, which soft-refetches the page (VisualEditingOverlay).
//
// Cost model (the reason this exists): a listen connection counts as a single
// Sanity API request no matter how long it stays open, and events ride that
// connection for free. Event-driven beats any poll: an idle preview tab costs
// about nothing, and an edit costs one page refetch. NEVER reintroduce an
// interval poll here; that is what burned the WCP Sanity quota.
//
// The GROQ filter: signal when THIS page's doc changes (draft or published id),
// or when any shared / non-`page` doc changes (services, testimonials, process
// steps, settings... all can appear on any page through the auto-populating
// section blocks), but stay silent for edits to some OTHER custom page.
//
// Connection lifecycle: Sanity ends listen connections periodically and the
// Worker can be recycled; either just closes our stream, and the browser's
// EventSource reconnects on its own (`retry:` below).
//
// THREE ROADS OUT, and all three must abort the upstream fetch (2026-08-28).
// Every preview iframe reload opens a fresh listen through here, so an upstream
// that outlives its client is a Worker invocation pinned open for nobody; pile
// enough up and the account starts refusing connections, which is a plausible
// second contributor to the `Error 1102` an editor hit on /preview.
//
//   1. `cancel()` - Workers cancels the response stream when the client goes
//      away. This was the only road that aborted; it is still the usual one.
//   2. `request.signal` - the request is aborted. Wired explicitly rather than
//      trusted to reach us as a cancel: it is the platform's own statement that
//      the client is gone, and it fires even while we are parked in
//      `reader.read()` waiting for a Sanity event that will never come.
//   3. `send()` throwing - the client went away MID-WRITE, so `enqueue` throws
//      instead of `cancel` firing. That case used to set `open = false` and
//      leave the read loop below spinning on a live upstream connection forever.
//      That was the leak. It now closes and aborts like the others.
// =============================================================================
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { perspectiveCookieName } from '@sanity/preview-url-secret/constants';
import {
  projectId,
  dataset,
  apiVersion,
  previewConfig,
  previewUnconfiguredResponse,
} from '@/lib/cms-preview';

const LISTEN_QUERY = '*[_id in [$pageId, $draftId] || !(_type in ["page"])]';

export const GET: APIRoute = async ({ cookies, url, request }) => {
  // Same draft-mode gate as the preview pages themselves: only a browser that
  // went through the Presentation Tool's URL-secret handshake has this cookie.
  // No draft content flows through here, but there is no reason to let
  // anonymous visitors hold open upstream Sanity connections either.
  if (!cookies.has(perspectiveCookieName)) {
    return new Response('Preview only', { status: 403 });
  }

  // The cookie gate comes FIRST on purpose: an anonymous caller learns nothing
  // about this deployment's configuration, only that the route is Studio-only.
  const config = previewConfig();
  if (!config.ok) return previewUnconfiguredResponse(config.missing);

  // Doc id of the page being previewed (a singleton id like "homePage", or a
  // page doc id). Ids are passed to Sanity as JSON-encoded GROQ params, never
  // spliced into the query; the shape check just keeps garbage out.
  const pageId = url.searchParams.get('page') ?? '';
  if (!/^[\w.-]{1,200}$/.test(pageId)) {
    return new Response('Bad page id', { status: 400 });
  }

  const upstream = new URL(
    `https://${projectId}.api.sanity.io/v${apiVersion}/data/listen/${dataset}`,
  );
  upstream.searchParams.set('query', LISTEN_QUERY);
  upstream.searchParams.set('$pageId', JSON.stringify(pageId));
  upstream.searchParams.set('$draftId', JSON.stringify(`drafts.${pageId}`));
  // Signal-only: we tell the overlay THAT something changed, never what.
  upstream.searchParams.set('includeResult', 'false');
  upstream.searchParams.set('includeMutations', 'false');
  // DO NOT change this to "transaction" to make the preview feel faster.
  // "query" means Sanity waits until the change is visible to a QUERY before
  // signalling, which is precisely what the overlay does next: it refetches this
  // page from the server. A "transaction" event fires earlier, and the refetch
  // it triggered would return data that is still stale, re-rendering the page
  // with the OLD words. Worse, the overlay's instant-text path
  // (src/components/preview/overlay/useInstantText.ts) has usually already put
  // the NEW words on the page by then, so the early refresh would visibly undo
  // them. The earlier signal already reaches the frame by a different road: the
  // Studio relays its own transaction-visibility listen over the comlink, and
  // that is what instant text listens to. This one stays slow on purpose.
  upstream.searchParams.set('visibility', 'query');
  upstream.searchParams.set('tag', 'starter.preview-live');

  const encoder = new TextEncoder();
  const abort = new AbortController();
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const close = () => {
        if (!open) return;
        open = false;
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed or cancelled */
        }
      };
      const send = (text: string) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          // Client went away mid-write (road 3 above). Take the upstream with
          // us: the read loop below is otherwise happy to hold a Sanity listen
          // open for a browser that is no longer there.
          close();
          abort.abort();
        }
      };

      // Road 2. The listener is removed by `close()`'s own path going quiet:
      // this stream and this request live and die together, so there is nothing
      // to unregister that outlives them.
      request.signal.addEventListener('abort', () => {
        close();
        abort.abort();
      });

      // Client-side reconnect delay when this stream ends; EventSource handles
      // the retry loop. Each reconnect opens a fresh non-CDN Sanity listen
      // request (metered on the free-plan API quota), so this is deliberately
      // unhurried: 15s turns a dropped connection into an occasional request
      // instead of a reconnect storm. The manual refresh button still works
      // during the gap, and the overlay does a catch-up refetch on reconnect,
      // so no edit is lost. (The connection also only stays open while the
      // preview tab is visible; the overlay closes it when the tab is hidden.)
      send('retry: 15000\n\n');
      // Comment heartbeat so proxies and Cloudflare never see an idle
      // connection long enough to cut it. Comments are invisible to EventSource.
      heartbeat = setInterval(() => send(': hb\n\n'), 25_000);

      try {
        const token = (env as { SANITY_TOKEN?: string }).SANITY_TOKEN;
        const res = await fetch(upstream, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: abort.signal,
        });
        if (!res.ok || !res.body) {
          console.error('[preview-live] upstream refused', res.status);
          close();
          return;
        }

        // Minimal SSE block parser: we only need each event's name. Blocks are
        // separated by a blank line; normalize CRLF on the concatenated buffer
        // so a \r\n split across chunks cannot hide a separator.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf = (buf + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n');
          let sep;
          while ((sep = buf.indexOf('\n\n')) !== -1) {
            const block = buf.slice(0, sep);
            buf = buf.slice(sep + 2);
            const type = block
              .split('\n')
              .find((l) => l.startsWith('event:'))
              ?.slice('event:'.length)
              .trim();
            // A doc matching the filter changed. That is the whole signal.
            // welcome/reconnect and upstream comments are ours to swallow.
            if (type === 'mutation') send('event: change\ndata: {}\n\n');
            // The listen API's "stop and do not reconnect" order (e.g. dataset
            // gone). Obey by ending; a reconnect would just 403/404 anyway.
            if (type === 'disconnect') {
              close();
              abort.abort();
              return;
            }
          }
        }
      } catch {
        // Upstream dropped or the client cancelled us (abort). Either way the
        // browser's EventSource owns the retry.
      } finally {
        close();
      }
    },
    cancel() {
      // Preview tab closed or navigated away: kill the upstream connection.
      clearInterval(heartbeat);
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      // Mirrors the preview pages: this endpoint is Studio plumbing.
      'x-robots-tag': 'noindex',
    },
  });
};
