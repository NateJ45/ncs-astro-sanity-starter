// Safe to edit by hand
// =============================================================================
// newsletter-content - THIS SITE's newsletter: what an issue holds, the brand,
// the footer address (the email backbone, PORTS.md card 127)
// =============================================================================
// The send engine (src/lib/mail-newsletter.ts, PORTABLE) knows nothing about
// sermons, posts or events. This file is where a site says what its issue
// is made of: loadIssue() reads the PUBLISHED newsletter document and turns its
// picks into plain sections the email template draws. A fork rewrites the
// query and the mapping for its own content (FBC Auburn's picks the week's
// sermon, notices and Church Trac events); the rest stays.
//
// Runs in the Worker at send time AND at build time for the archive pages
// (src/pages/newsletter/), so it only uses sanityFetch and pure helpers.
// =============================================================================
import brandConfig from '../../brand/brand.config.json';
import { site } from '@/data/site';
import { sanityFetch } from '@/lib/sanity';
import { brandFromConfig, type MailItem } from '@/lib/mail-template';
import type { IssueContent } from '@/lib/mail-newsletter';

/** The list's name in sentences: "signed up for <LIST_NAME>". */
export const LIST_NAME = `the ${site.name} newsletter`;

/** Dates in emails (RSVP confirmations) are shown in this time zone (site.timeZone). */
export const TIME_ZONE = site.timeZone;

export const MAIL_BRAND = brandFromConfig(brandConfig, site.name, site.url);

/**
 * The postal address every list email must carry (CAN-SPAM). The starter takes
 * brand.config.json's contact.address; a site with a facts document reads that
 * instead (FBC Auburn: Church facts).
 */
export async function mailAddress(): Promise<string> {
  const fromConfig = (brandConfig as { contact?: { address?: string } }).contact?.address ?? '';
  return fromConfig.trim() || site.name;
}

/** The archive's address for an issue, when the archive shows it. */
export const issuePath = (slug: string) => `/newsletter/${slug}/`;

export const ISSUE_PROJECTION = `{
  _id, subject, preheader, intro, "slug": slug.current, showOnWebsite, date,
  // scaffold: journal
  "posts": posts[]->{ title, "slug": slug.current, excerpt, publishedAt },
  // scaffold:end
  notices[]{ title, text, link },
  note
}`;

interface RawIssue {
  _id: string;
  subject?: string;
  preheader?: string;
  intro?: string;
  slug?: string;
  showOnWebsite?: boolean;
  date?: string;
  posts?: Array<{ title?: string; slug?: string; excerpt?: string; publishedAt?: string }> | null;
  notices?: Array<{ title?: string; text?: string; link?: string }> | null;
  note?: { heading?: string; text?: string } | null;
}

export function issueFromRaw(raw: RawIssue | null, origin: string = site.url): IssueContent | null {
  if (!raw?._id || !raw.subject) return null;
  const sections: IssueContent['sections'] = [];
  const posts: MailItem[] = (raw.posts ?? [])
    .filter((p) => p?.title && p.slug)
    .map((p) => ({
      title: p.title as string,
      text: p.excerpt,
      url: `${origin}/journal/${p.slug}/`,
      linkLabel: 'Read it',
    }));
  if (posts.length) sections.push({ heading: 'From the journal', items: posts });
  const notices: MailItem[] = (raw.notices ?? [])
    .filter((n) => n?.title)
    .map((n) => ({
      title: n.title as string,
      text: n.text,
      url: n.link,
      linkLabel: n.link ? 'Find out more' : undefined,
    }));
  if (notices.length) sections.push({ heading: 'Notices', items: notices });
  return {
    id: raw._id,
    subject: raw.subject,
    preheader: raw.preheader,
    intro: raw.intro,
    sections,
    note: raw.note?.text ? { heading: raw.note.heading, text: raw.note.text } : undefined,
    webUrl: raw.showOnWebsite !== false && raw.slug ? `${origin}${issuePath(raw.slug)}` : undefined,
  };
}

/** The published issue (never a draft), ready for the template. */
export async function loadIssue(id: string, origin?: string): Promise<IssueContent | null> {
  if (id.startsWith('drafts.')) return null;
  const raw = await sanityFetch<RawIssue>(
    `*[_type == "newsletter" && _id == $id][0]${ISSUE_PROJECTION}`,
    { id },
    null,
  ).catch(() => null);
  return issueFromRaw(raw, origin);
}

/** Every issue the archive shows, newest first (build time). */
export async function archiveIssues(): Promise<Array<RawIssue & { slug: string }>> {
  const rows = await sanityFetch<RawIssue>(
    `*[_type == "newsletter" && showOnWebsite != false && defined(slug.current) && defined(date) && date <= now()] | order(date desc)${ISSUE_PROJECTION}`,
    {},
    [],
  );
  return rows.filter((r): r is RawIssue & { slug: string } => Boolean(r.slug));
}
