// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// mail-env - the Worker's mail settings, read in one place (PORTS.md card 121)
// =============================================================================
// Every mail route builds its dependencies here, so the setting names live in
// one file and OPERATIONS.md "Email" can list them once:
//
//   CONTACT_DB        D1 binding: forms, Messages, subscribers, sends, RSVPs.
//   EMAIL             Cloudflare Email Sending binding (provider "cloudflare").
//   RESEND_API_KEY    secret, Resend's API key (provider "resend").
//   MAIL_PROVIDER     var, "cloudflare" or "resend"; unset = whichever is set up.
//   MAIL_FROM         var, the sending address (falls back to CONTACT_FROM).
//   MAIL_FROM_NAME    var, the sender's name (falls back to the site's name).
//   MAIL_REPLY_TO     var, where replies to RSVP confirmations go (falls back
//                     to CONTACT_TO).
//   MAIL_SECRET       secret, 32+ random characters: signs the confirm and
//                     unsubscribe links. Changing it breaks every old link.
//
// Only the routes import this (it reads `cloudflare:workers`); the logic files
// take plain arguments so the unit tests never need a Worker.
// =============================================================================
import { env } from 'cloudflare:workers';
import { site } from '@/data/site';
import type { D1Database } from '@/lib/mail-db';
import { pickMailer, type EmailBindingLike, type MailEnv, type Mailer } from '@/lib/mail-send';
import { secretUsable } from '@/lib/mail-token';
import type { ListDeps } from '@/lib/mail-subscribe';
import type { SendDeps } from '@/lib/mail-newsletter';
import { LIST_NAME, MAIL_BRAND, loadIssue, mailAddress } from '@/lib/newsletter-content';
import { FIXTURE_ISSUE, fixturesOn } from '@/lib/mail-fixtures';

export interface MailWorkerEnv {
  CONTACT_DB?: D1Database;
  EMAIL?: EmailBindingLike;
  RESEND_API_KEY?: string;
  MAIL_PROVIDER?: string;
  MAIL_FROM?: string;
  MAIL_FROM_NAME?: string;
  MAIL_REPLY_TO?: string;
  MAIL_SECRET?: string;
  CONTACT_FROM?: string;
  CONTACT_TO?: string;
  /** "1" lets the made-up fixture-* issue and event through: npm run preview ONLY. */
  MAIL_TEST_FIXTURES?: string;
}

export const mailEnv = () => env as unknown as MailWorkerEnv;

/** The configured sender, or null plus the reason (for the log, never a visitor). */
export function workerMailer(e: MailEnv = mailEnv()): {
  mailer: Mailer | null;
  reason: string | null;
} {
  const choice = pickMailer(e, site.name);
  return { mailer: choice.mailer, reason: choice.mailer ? null : choice.reason };
}

/** The origin links in emails point at: the site's own address, as the request saw it. */
export const originOf = (request: Request) => new URL(request.url).origin;

export async function listDeps(request: Request): Promise<ListDeps & { reason: string | null }> {
  const e = mailEnv();
  const { mailer, reason } = workerMailer(e);
  return {
    db: e.CONTACT_DB ?? null,
    mailer,
    secret: secretUsable(e.MAIL_SECRET) ? e.MAIL_SECRET : null,
    origin: originOf(request),
    brand: MAIL_BRAND,
    address: await mailAddress(),
    listName: LIST_NAME,
    reason: !e.CONTACT_DB
      ? 'no CONTACT_DB binding'
      : !secretUsable(e.MAIL_SECRET)
        ? 'MAIL_SECRET missing or shorter than 32 characters'
        : reason,
  };
}

export async function sendDeps(request: Request): Promise<SendDeps & { reason: string | null }> {
  const l = await listDeps(request);
  const origin = originOf(request);
  const fixtures = fixturesOn(mailEnv().MAIL_TEST_FIXTURES);
  return {
    ...l,
    loadIssue: async (id: string) =>
      id === FIXTURE_ISSUE.id ? (fixtures ? FIXTURE_ISSUE : null) : loadIssue(id, origin),
  };
}
