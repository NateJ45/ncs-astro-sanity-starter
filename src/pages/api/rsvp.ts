// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /api/rsvp/ - replies to an RSVP section (PORTS.md card 127)
// =============================================================================
// GET  ?event=<page id>:<block key>
//        -> { ready, closed, full, seatsLeft, waitlist }  The form asks before it
//           shows itself, and says "full" or "closed" in words.
// POST { event, name, email, partySize, answers, website, renderedAt }
//        -> { ok, status: 'going' | 'waitlist', emailed } | { ok: false, errors | error }
//
// THE ORDER: drop bots silently (hidden box, too fast); load the PUBLISHED
// block from Sanity and check everything against it, never the page; refuse
// after the closing time; store in D1 deciding the seat in the same statement
// (src/lib/mail-rsvp.ts); THEN email the confirmation. A reply that is stored
// but whose email failed is still a reply: the organiser sees it in the Studio.
//
// Only CONTACT_DB is needed to take replies. With no email provider the reply
// is kept and the visitor is told it is booked, without a confirmation email.
// =============================================================================
import type { APIRoute } from 'astro';
import { looksAutomated, type RawSubmission } from '@/lib/contact-submission';
import { mailEnv, workerMailer } from '@/lib/mail-env';
import {
  isClosed,
  normalizeRsvpBlock,
  parseEventKey,
  placeRsvp,
  rsvpConfirmationEmail,
  seatsLeft,
  validateRsvp,
  type RawRsvp,
  type RsvpEvent,
} from '@/lib/mail-rsvp';
import { MAIL_BRAND, TIME_ZONE, mailAddress } from '@/lib/newsletter-content';
import { sanityFetch } from '@/lib/sanity';
import { reportToInbox, type InboxEnv } from '@/lib/site-inbox';
import { FIXTURE_PAGE_ID, FIXTURE_RSVP_BLOCK, fixturesOn } from '@/lib/mail-fixtures';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

/** The published RSVP block, from the page's own sections. */
async function loadEvent(key: unknown): Promise<RsvpEvent | null> {
  const parsed = parseEventKey(key);
  if (!parsed) return null;
  // npm run preview only (MAIL_TEST_FIXTURES=1 in .dev.vars): the made-up event.
  if (parsed.pageId === FIXTURE_PAGE_ID) {
    return fixturesOn(mailEnv().MAIL_TEST_FIXTURES) && parsed.blockKey === FIXTURE_RSVP_BLOCK._key
      ? normalizeRsvpBlock(FIXTURE_RSVP_BLOCK, FIXTURE_PAGE_ID)
      : null;
  }
  const block = await sanityFetch<Record<string, unknown>>(
    `*[_id == $page][0]{ "b": coalesce(pageBuilder[_key == $key][0], additionalSections[_key == $key][0], section[_key == $key][0]) }.b`,
    { page: parsed.pageId, key: parsed.blockKey },
    null,
  ).catch(() => null);
  if (!block || block._type !== 'rsvpSection') return null;
  return normalizeRsvpBlock(block, parsed.pageId);
}

export const GET: APIRoute = async ({ request }) => {
  const db = mailEnv().CONTACT_DB ?? null;
  const ev = await loadEvent(new URL(request.url).searchParams.get('event'));
  if (!ev) return json({ ready: false, missing: true });
  if (!db) return json({ ready: false });
  const left = await seatsLeft(db, ev).catch(() => null);
  return json({
    ready: true,
    closed: isClosed(ev, Date.now()),
    full: left === 0,
    seatsLeft: left,
    waitlist: ev.waitlist,
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const e = mailEnv();
  let raw: RawRsvp & { event?: unknown };
  try {
    raw = (await request.json()) as RawRsvp & { event?: unknown };
  } catch {
    return json({ ok: false, error: 'Could not read that reply.' }, 400);
  }
  if (
    looksAutomated(
      { company: raw.website, renderedAt: raw.renderedAt } as RawSubmission,
      Date.now(),
    ).automated
  ) {
    return json({ ok: true, status: 'going', emailed: false });
  }
  if (!e.CONTACT_DB) {
    console.error('[rsvp] no CONTACT_DB binding');
    return json({ ok: false, unavailable: true, error: 'RSVPs are not switched on yet.' }, 503);
  }
  const ev = await loadEvent(raw.event);
  if (!ev) return json({ ok: false, error: 'That event could not be found.' }, 404);
  const now = Date.now();
  if (isClosed(ev, now))
    return json({ ok: false, closed: true, error: 'RSVPs for this event have closed.' }, 409);

  const { ok, errors, value } = validateRsvp(ev, raw);
  if (!ok || !value) return json({ ok: false, errors }, 422);

  let placed;
  try {
    placed = await placeRsvp(e.CONTACT_DB, ev, value, now);
  } catch (err) {
    console.error('[rsvp] could not store:', err);
    return json({ ok: false, error: 'Sorry, that did not go through. Please try again.' }, 500);
  }
  if (placed.status === 'full') {
    return json({ ok: false, full: true, error: 'Sorry, this event is full.' }, 409);
  }

  // ---- Then the confirmation -------------------------------------------------
  const { mailer, reason } = workerMailer(e);
  let emailed = false;
  let failure: string | null = reason;
  if (mailer) {
    const referer = request.headers.get('referer');
    const pageUrl =
      referer && new URL(referer, request.url).origin === new URL(request.url).origin
        ? referer
        : undefined;
    const mail = rsvpConfirmationEmail(ev, value, placed.status, {
      brand: MAIL_BRAND,
      address: await mailAddress(),
      timeZone: TIME_ZONE,
      pageUrl,
    });
    const r = await mailer.send({
      to: value.email,
      subject:
        placed.status === 'going' ? `You are booked in: ${ev.name}` : `Waiting list: ${ev.name}`,
      replyTo: e.MAIL_REPLY_TO || e.CONTACT_TO || undefined,
      ...mail,
    });
    emailed = r.ok;
    failure = r.ok ? null : (r.error ?? 'send failed');
  }
  await e.CONTACT_DB.prepare(`UPDATE rsvps SET confirmed = ?, notify_error = ? WHERE id = ?`)
    .bind(emailed ? 1 : 0, failure, placed.id)
    .run()
    .catch((err: unknown) => console.error('[rsvp] could not record the email state:', err));
  if (failure) console.error('[rsvp] confirmation not sent:', failure);

  // The dashboard Inbox (card 210): who, which event, and how many. No address.
  reportToInbox(e as unknown as InboxEnv, locals, {
    id: `rsvp-${placed.id}`,
    form: 'rsvp',
    name: value.name,
    subject: ev.name,
    preview: `${placed.status === 'going' ? 'Going' : 'Waiting list'}, party of ${value.partySize}`,
  });

  return json({ ok: true, status: placed.status, emailed });
};

export const ALL: APIRoute = () => json({ ok: false, error: 'Method not allowed.' }, 405);
