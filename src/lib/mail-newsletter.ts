// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// mail-newsletter - sending an issue to the list (PORTS.md card 121)
// =============================================================================
// The Studio's Newsletter document has two buttons, "Send a test to me" and
// "Send to everyone". Both call /api/studio/newsletter/, which runs this file.
//
// WHAT GOES OUT. The Worker loads the PUBLISHED issue from Sanity itself
// (src/lib/newsletter-content.ts, the site's own picks: sermon, notices,
// events...). The Studio sends only the issue's id, never its words, so what is
// emailed is exactly what was published.
//
// NEVER TWICE. Three locks, from coarse to fine:
//   1. newsletter_sends has one row per issue. "Send to everyone" on an issue
//      that has finished is refused with the date it went.
//   2. Each person is CLAIMED in newsletter_deliveries (primary key issue +
//      subscriber) before their email is handed to the provider. Two batches
//      racing cannot both claim the same person.
//   3. A claim is never retried. A message whose send failed stays "failed" and
//      is counted, because the provider may have sent it anyway; a missed issue
//      is better than a duplicate.
//
// IN BATCHES. A Worker request can only make so many outbound calls, so one
// call sends at most `batchSize` emails and reports progress; the Studio keeps
// calling "continue" until the send says done. Closing the Studio midway is
// safe: pressing "Send to everyone" again picks up where it stopped.
//
// Every email carries its reader's own unsubscribe link (in the footer, and as
// List-Unsubscribe + List-Unsubscribe-Post headers for the one-click button in
// Gmail and Apple Mail) and the church's postal address (CAN-SPAM).
// =============================================================================
import { nowIso, type D1Database } from './mail-db.ts';
import type { Mailer, MailMessage } from './mail-send.ts';
import { renderEmail, type MailBlock, type MailBrand, type MailItem } from './mail-template.ts';
import { unsubscribeToken } from './mail-token.ts';
import { listCounts } from './mail-subscribe.ts';

/** One issue, already resolved from Sanity by the site's newsletter-content.ts. */
export interface IssueContent {
  id: string;
  subject: string;
  /** The line under the subject in the inbox. */
  preheader?: string;
  /** The headline inside the email; defaults to the subject. */
  title?: string;
  intro?: string;
  /** Picked content, in order: "This week's sermon", "Notices", "Coming up"... */
  sections: Array<{ heading: string; items: MailItem[] }>;
  note?: { heading?: string; text: string };
  /** The issue's page on the site, when the archive shows it. */
  webUrl?: string;
}

export const DEFAULT_BATCH = 40;
const UNSUB_SLOT = '__UNSUBSCRIBE_TOKEN__';

export function issueBlocks(issue: IssueContent): MailBlock[] {
  const blocks: MailBlock[] = [];
  if (issue.intro) blocks.push({ kind: 'paragraph', text: issue.intro });
  for (const s of issue.sections) {
    if (s.items.length) blocks.push({ kind: 'items', heading: s.heading, items: s.items });
  }
  if (issue.note?.text)
    blocks.push({ kind: 'note', heading: issue.note.heading, text: issue.note.text });
  return blocks;
}

export interface SendDeps {
  db: D1Database | null;
  mailer: Mailer | null;
  secret: string | null;
  origin: string;
  brand: MailBrand;
  address: string;
  listName: string;
  /** The published issue, or null when it is missing or still a draft. */
  loadIssue: (id: string) => Promise<IssueContent | null>;
  batchSize?: number;
  now?: () => number;
}

export const sendReady = (d: SendDeps) => Boolean(d.db && d.mailer && d.secret);

/** The issue rendered once, with a slot for each reader's unsubscribe token. */
export function renderIssue(
  issue: IssueContent,
  d: Pick<SendDeps, 'brand' | 'address' | 'listName' | 'origin'>,
) {
  return renderEmail({
    brand: d.brand,
    preheader: issue.preheader,
    title: issue.title || issue.subject,
    blocks: issueBlocks(issue),
    footer: {
      address: d.address,
      reason: `You are getting this because you signed up for ${d.listName}.`,
      unsubscribeUrl: `${d.origin}/email/unsubscribe/?t=${UNSUB_SLOT}`,
      webUrl: issue.webUrl,
    },
  });
}

async function messageFor(
  rendered: { html: string; text: string },
  subject: string,
  email: string,
  d: SendDeps,
): Promise<MailMessage> {
  const token = await unsubscribeToken(d.secret as string, email);
  return {
    to: email,
    subject,
    html: rendered.html.split(UNSUB_SLOT).join(token),
    text: rendered.text.split(UNSUB_SLOT).join(token),
    headers: {
      'List-Unsubscribe': `<${d.origin}/api/unsubscribe/?t=${token}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}

export interface SendRow {
  issue_id: string;
  subject: string;
  status: 'sending' | 'done';
  total: number;
  sent: number;
  failed: number;
  started_at: string;
  finished_at: string | null;
}

export interface Progress {
  status: 'sending' | 'done';
  sent: number;
  failed: number;
  remaining: number;
  total: number;
  startedAt: string;
  finishedAt: string | null;
}

const progressOf = (row: SendRow, remaining: number): Progress => ({
  status: row.status,
  sent: row.sent,
  failed: row.failed,
  remaining,
  total: row.status === 'done' ? row.total : row.sent + row.failed + remaining,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
});

async function remainingFor(db: D1Database, issueId: string): Promise<number> {
  const r = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM subscribers s WHERE s.status = 'subscribed'
       AND NOT EXISTS (SELECT 1 FROM newsletter_deliveries d WHERE d.issue_id = ? AND d.subscriber_id = s.id)`,
    )
    .bind(issueId)
    .first<{ n: number }>();
  return Number(r?.n ?? 0);
}

export async function sendRow(db: D1Database, issueId: string): Promise<SendRow | null> {
  return db
    .prepare(`SELECT * FROM newsletter_sends WHERE issue_id = ?`)
    .bind(issueId)
    .first<SendRow>();
}

export async function sendStatus(db: D1Database, issueId: string): Promise<Progress | null> {
  const row = await sendRow(db, issueId);
  return row ? progressOf(row, row.status === 'done' ? 0 : await remainingFor(db, issueId)) : null;
}

/** "Send a test to me": one email, to the signed-in editor, never logged as a send. */
export async function sendTest(d: SendDeps, issueId: string, to: string) {
  if (!sendReady(d)) return { ok: false as const, error: 'not-configured' };
  const issue = await d.loadIssue(issueId);
  if (!issue) return { ok: false as const, error: 'not-published' };
  const rendered = renderIssue(issue, d);
  const msg = await messageFor(rendered, `[Test] ${issue.subject}`, to, d);
  const r = await (d.mailer as Mailer).send(msg);
  return r.ok ? { ok: true as const } : { ok: false as const, error: r.error ?? 'send failed' };
}

/** One batch of the real send. Safe to call again and again; it never sends to anyone twice. */
async function runBatch(d: SendDeps, issue: IssueContent, row: SendRow): Promise<Progress> {
  const db = d.db as D1Database;
  const now = d.now?.() ?? Date.now();
  const size = Math.max(1, Math.min(d.batchSize ?? DEFAULT_BATCH, 100));
  const candidates =
    (
      await db
        .prepare(
          `SELECT s.id, s.email FROM subscribers s WHERE s.status = 'subscribed'
           AND NOT EXISTS (SELECT 1 FROM newsletter_deliveries d WHERE d.issue_id = ? AND d.subscriber_id = s.id)
           ORDER BY s.id LIMIT ?`,
        )
        .bind(issue.id, size)
        .all<{ id: number; email: string }>()
    ).results ?? [];

  // Claim each person BEFORE sending. A claim another batch already made reports 0 changes.
  const mine: Array<{ id: number; email: string }> = [];
  for (const c of candidates) {
    const r = await db
      .prepare(
        `INSERT OR IGNORE INTO newsletter_deliveries (issue_id, subscriber_id, status, at) VALUES (?, ?, 'claimed', ?)`,
      )
      .bind(issue.id, c.id, nowIso(now))
      .run();
    if (Number(r.meta?.changes ?? 0) === 1) mine.push(c);
  }

  if (mine.length) {
    const rendered = renderIssue(issue, d);
    const messages = await Promise.all(
      mine.map((c) => messageFor(rendered, issue.subject, c.email, d)),
    );
    const results = await (d.mailer as Mailer).sendMany(messages);
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < mine.length; i++) {
      const ok = results[i]?.ok === true;
      if (ok) sent++;
      else failed++;
      await db
        .prepare(
          `UPDATE newsletter_deliveries SET status = ?, error = ?, at = ? WHERE issue_id = ? AND subscriber_id = ?`,
        )
        .bind(
          ok ? 'sent' : 'failed',
          ok ? null : (results[i]?.error ?? 'send failed'),
          nowIso(now),
          issue.id,
          mine[i].id,
        )
        .run();
    }
    if (failed)
      console.error(
        `[newsletter] ${failed} of ${mine.length} failed for ${issue.id}:`,
        results.find((r) => !r.ok)?.error,
      );
    await db
      .prepare(
        `UPDATE newsletter_sends SET sent = sent + ?, failed = failed + ? WHERE issue_id = ?`,
      )
      .bind(sent, failed, issue.id)
      .run();
  }

  const remaining = await remainingFor(db, issue.id);
  if (remaining === 0) {
    await db
      .prepare(
        `UPDATE newsletter_sends SET status = 'done', finished_at = ?, total = sent + failed WHERE issue_id = ? AND status = 'sending'`,
      )
      .bind(nowIso(d.now?.() ?? Date.now()), issue.id)
      .run();
  }
  const fresh = (await sendRow(db, issue.id)) ?? row;
  return progressOf(fresh, remaining);
}

export type SendAnswer =
  | { ok: true; progress: Progress; alreadySent?: boolean }
  | { ok: false; error: 'not-configured' | 'not-published' | 'not-started' | 'no-subscribers' };

/** "Send to everyone": start (or resume) the one and only send of this issue. */
export async function startSend(
  d: SendDeps,
  issueId: string,
  startedBy: string | null,
): Promise<SendAnswer> {
  if (!sendReady(d)) return { ok: false, error: 'not-configured' };
  const db = d.db as D1Database;
  const existing = await sendRow(db, issueId);
  if (existing?.status === 'done') {
    return { ok: true, alreadySent: true, progress: progressOf(existing, 0) };
  }
  const issue = await d.loadIssue(issueId);
  if (!issue) return { ok: false, error: 'not-published' };
  if (!existing) {
    const { subscribed } = await listCounts(db);
    if (subscribed === 0) return { ok: false, error: 'no-subscribers' };
    await db
      .prepare(
        `INSERT OR IGNORE INTO newsletter_sends (issue_id, subject, status, total, started_at, started_by) VALUES (?, ?, 'sending', ?, ?, ?)`,
      )
      .bind(
        issueId,
        issue.subject.slice(0, 300),
        subscribed,
        nowIso(d.now?.() ?? Date.now()),
        startedBy,
      )
      .run();
  }
  const row = (await sendRow(db, issueId)) as SendRow;
  if (row.status === 'done') return { ok: true, alreadySent: true, progress: progressOf(row, 0) };
  return { ok: true, progress: await runBatch(d, issue, row) };
}

/** The Studio's loop: the next batch of a send already started. */
export async function continueSend(d: SendDeps, issueId: string): Promise<SendAnswer> {
  if (!sendReady(d)) return { ok: false, error: 'not-configured' };
  const db = d.db as D1Database;
  const row = await sendRow(db, issueId);
  if (!row) return { ok: false, error: 'not-started' };
  if (row.status === 'done') return { ok: true, progress: progressOf(row, 0) };
  const issue = await d.loadIssue(issueId);
  if (!issue) return { ok: false, error: 'not-published' };
  return { ok: true, progress: await runBatch(d, issue, row) };
}

/** The last sends, newest first, for the Studio's send log. */
export async function recentSends(db: D1Database, limit = 10): Promise<SendRow[]> {
  return (
    (
      await db
        .prepare(`SELECT * FROM newsletter_sends ORDER BY started_at DESC LIMIT ?`)
        .bind(limit)
        .all<SendRow>()
    ).results ?? []
  );
}
