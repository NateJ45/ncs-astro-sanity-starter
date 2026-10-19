// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// mail-studio - the Studio's two protected mail routes (PORTS.md card 127)
// =============================================================================
//   /api/studio/newsletter/   the list's size, an issue's send status, and the
//                             "Send a test to me" / "Send to everyone" buttons.
//   /api/studio/rsvps/        RSVP counts per event, one event's replies, and
//                             the organiser's CSV download.
//
// FAIL CLOSED, IN THIS ORDER, ON EVERY METHOD: same origin (403), then a
// signed-in member of this Sanity project (401), then the settings (503 with
// configured: false). Nothing is read from D1 and nothing is sent before the
// first two pass. The same checks as the Messages inbox (card 117), from
// src/lib/studio-auth.ts, injected here so the tests can drive them.
// =============================================================================
import type { D1Database } from './mail-db.ts';
import { listCounts } from './mail-subscribe.ts';
import {
  continueSend,
  recentSends,
  sendReady,
  sendStatus,
  sendTest,
  startSend,
  type SendDeps,
} from './mail-newsletter.ts';
import { eventCounts, eventRows, parseEventKey, rsvpCsv } from './mail-rsvp.ts';

export interface MailStudioUser {
  id: string;
  email?: string;
}

export interface StudioGate {
  sameOrigin: (request: Request) => boolean;
  verify: (request: Request) => Promise<MailStudioUser | null>;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

async function gate(request: Request, g: StudioGate): Promise<Response | MailStudioUser> {
  if (!g.sameOrigin(request)) return json({ ok: false, error: 'Not allowed from here.' }, 403);
  const user = await g.verify(request);
  if (!user) return json({ ok: false, error: 'Please sign in to the Studio again.' }, 401);
  return user;
}

const ISSUE_ID = /^[A-Za-z0-9][\w.-]{0,119}$/;

const SEND_ERRORS: Record<string, [number, string]> = {
  'not-configured': [503, 'Email is not set up yet.'],
  'not-published': [409, 'Publish the newsletter first. Only the published version is sent.'],
  'not-started': [409, 'This issue has not been sent yet.'],
  'no-subscribers': [409, 'Nobody has signed up yet, so there is no one to send to.'],
};

export async function handleNewsletterStudio(
  request: Request,
  deps: StudioGate & { send: SendDeps; reason?: string | null },
): Promise<Response> {
  const user = await gate(request, deps);
  if (user instanceof Response) return user;
  const d = deps.send;
  if (!sendReady(d) || !d.db) {
    return json({ ok: false, configured: false, reason: deps.reason ?? null }, 503);
  }
  const db = d.db as D1Database;

  if (request.method === 'GET') {
    const id = new URL(request.url).searchParams.get('id');
    const counts = await listCounts(db);
    if (id && (!ISSUE_ID.test(id) || id.startsWith('drafts.'))) {
      return json({ ok: false, error: 'That is not a newsletter.' }, 400);
    }
    return json({
      ok: true,
      configured: true,
      provider: d.mailer?.provider,
      subscribers: counts.subscribed,
      pending: counts.pending,
      you: user.email ?? null,
      send: id ? await sendStatus(db, id) : null,
      recent: id ? undefined : await recentSends(db, 5),
    });
  }

  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405);
  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    id?: unknown;
  } | null;
  const id = typeof body?.id === 'string' ? body.id.replace(/^drafts\./, '') : '';
  if (!ISSUE_ID.test(id)) return json({ ok: false, error: 'That is not a newsletter.' }, 400);

  if (body?.action === 'test') {
    if (!user.email) {
      return json(
        { ok: false, error: 'Your Studio login has no email address we can send to.' },
        400,
      );
    }
    const r = await sendTest(d, id, user.email);
    if (r.ok) return json({ ok: true, to: user.email });
    const [status, message] = SEND_ERRORS[r.error] ?? [
      502,
      'The test did not send. Try again in a minute.',
    ];
    if (!SEND_ERRORS[r.error]) console.error('[newsletter] test send failed:', r.error);
    return json({ ok: false, error: message }, status);
  }

  if (body?.action === 'start' || body?.action === 'continue') {
    const r = body.action === 'start' ? await startSend(d, id, user.id) : await continueSend(d, id);
    if (r.ok) return json({ ok: true, alreadySent: r.alreadySent ?? false, progress: r.progress });
    const [status, message] = SEND_ERRORS[r.error];
    return json({ ok: false, error: message }, status);
  }

  return json({ ok: false, error: 'Unknown action.' }, 400);
}

export async function handleRsvpStudio(
  request: Request,
  deps: StudioGate & { db: D1Database | null },
): Promise<Response> {
  const user = await gate(request, deps);
  if (user instanceof Response) return user;
  if (!deps.db) return json({ ok: false, configured: false }, 503);
  if (request.method !== 'GET') return json({ ok: false, error: 'Method not allowed.' }, 405);

  const url = new URL(request.url);
  const event = url.searchParams.get('event');
  if (!event) return json({ ok: true, configured: true, events: await eventCounts(deps.db) });

  if (!parseEventKey(event)) return json({ ok: false, error: 'That is not an event.' }, 400);
  const rows = await eventRows(deps.db, event);
  if (url.searchParams.get('format') === 'csv') {
    return new Response(rsvpCsv(rows), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="rsvps.csv"',
        'cache-control': 'no-store',
      },
    });
  }
  const [counts] = await eventCounts(deps.db, event);
  return json({
    ok: true,
    configured: true,
    counts: counts ?? null,
    rows: rows.map((r) => ({
      ...r,
      answers: (() => {
        try {
          return r.answers
            ? (JSON.parse(r.answers) as Array<{ label: string; value: string }>)
            : [];
        } catch {
          return [];
        }
      })(),
    })),
  });
}
