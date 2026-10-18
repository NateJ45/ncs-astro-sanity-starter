// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// "Before you publish", and two more Checkup rules (PORTS.md card 122)
// =============================================================================
// THE PANEL. The kit's "Before you publish" panel (src/sanity/kit/
// PublishPanel.tsx) shows the Checkup's findings for ONE document, the one
// open beside it, as the editor's changes would leave it once published. It
// reuses the Checkup's own rules (kit.config.ts `checkup.rules`, whatever a
// site has added), so the panel and the Checkup can never disagree.
// forDocument() is the trick: it swaps the document's draft in as if it were
// already published, runs every rule over the whole site, and keeps only the
// Fix-it items (card 115) that point at this document, each with its field.
// It blocks nothing and writes nothing.
//
// THE RULES.
//   exampleTextRule  words still starting "Example:" from a page template
//                    (src/lib/authoring.ts), so a template's placeholder
//                    cannot go live unnoticed.
//   llmsRules        the files the site offers AI assistants (/llms.txt, the
//                    link map, and /llms-full.txt, the full text) still carry
//                    the starter's words, miss a page, or are old. They read
//                    CheckupContext.site, which the Studio fills by fetching
//                    the two files from the live site.
// Unit tests: src/lib/studio-prepublish.test.ts.
// =============================================================================

import { EXAMPLE_PREFIX } from './authoring.ts';
import {
  isDraftId,
  itemsOf,
  listNames,
  openFirst,
  pathString,
  plural,
  publishedIdOf,
  runCheckup,
  walk,
  type CheckupContext,
  type CheckupRule,
  type Doc,
  type Severity,
  type SiteFiles,
} from './studio-checkup.ts';

const DAY = 24 * 60 * 60 * 1000;

// -----------------------------------------------------------------------------
// Example text left from a template
// -----------------------------------------------------------------------------

/** The first string in a value that still starts with "Example:", with its path. */
export function exampleTextIn(value: unknown): string | null {
  let found: string | null = null;
  walk(value, (obj, path) => {
    if (found) return;
    for (const [k, v] of Object.entries(obj)) {
      if (k.startsWith('_') || typeof v !== 'string') continue;
      if (v.trimStart().startsWith(EXAMPLE_PREFIX)) {
        // A Portable Text span's text belongs to its block, which the form shows.
        found = pathString(obj._type === 'span' ? path.slice(0, -2) : [...path, k]);
        return;
      }
    }
  });
  return found;
}

export function exampleTextRule(severity: Severity = 'Needs doing'): CheckupRule {
  return {
    id: 'example-text',
    run: ({ published, nameOf }) => {
      const hits = published
        .map((doc) => ({ doc, field: exampleTextIn(doc) }))
        .filter((h): h is { doc: Doc; field: string } => h.field !== null);
      if (!hits.length) return null;
      const docs = hits.map((h) => h.doc);
      return {
        severity,
        label: `${plural(hits.length, 'page')} still showing example text`,
        detail: `${listNames(docs.map(nameOf))}. Some words still start "Example:", from the template the page was made with. Write your own words there, or remove that part.`,
        ...openFirst([hits[0].doc], hits[0].field || undefined),
        items: itemsOf(
          docs,
          nameOf,
          (d) => hits.find((h) => h.doc._id === d._id)?.field || undefined,
        ),
        itemLabel: 'Example text from the template',
      };
    },
  };
}

// -----------------------------------------------------------------------------
// The files for AI assistants (/llms.txt, /llms-full.txt)
// -----------------------------------------------------------------------------

export interface LlmsRuleOptions {
  /** Document types that are pages with their own address at /<slug>/. */
  pageTypes?: string[];
  /** The full-text file is "old" past this many days AND after a later publish. */
  maxAgeDays?: number;
}

/** The starter's own words, which a fork has to replace. */
const TEMPLATE_WORDS = /example\.com|Replace this description|Studio Starter/i;

/** "Last updated: 2026-10-18" from llms-full.txt (scripts/generate-llms-full.mjs). */
export function llmsUpdatedAt(text: string | null | undefined): number | null {
  const m = /^Last updated: (\d{4}-\d{2}-\d{2})\s*$/m.exec(text ?? '');
  const t = m ? Date.parse(`${m[1]}T00:00:00Z`) : NaN;
  return Number.isNaN(t) ? null : t;
}

const slugOf = (doc: Doc): string | null => {
  const s = doc.slug as { current?: unknown } | string | undefined;
  const v = typeof s === 'string' ? s : s?.current;
  return typeof v === 'string' && v.trim() ? v.trim().replace(/^\/+|\/+$/g, '') : null;
};

/** A page that is meant to be found: not archived, hidden or private. */
const isListedPage = (doc: Doc) =>
  doc.archived !== true &&
  doc.hideFromSearch !== true &&
  doc.noindex !== true &&
  doc.private !== true &&
  doc.isPrivate !== true &&
  doc.visibility !== 'private' &&
  !publishedIdOf(doc._id).startsWith('private.');

export function llmsRules(opts: LlmsRuleOptions = {}): CheckupRule[] {
  const pageTypes = new Set(opts.pageTypes ?? ['page']);
  const maxAge = (opts.maxAgeDays ?? 60) * DAY;
  const fix = 'Ask your web designer to update it; it is a file, not something the Studio edits.';

  return [
    {
      id: 'llms-template',
      run: ({ site }) => {
        const files: Array<[string, string | null | undefined]> = [
          ['/llms.txt', site?.llmsTxt],
          ['/llms-full.txt', site?.llmsFull],
        ];
        const stale = files.filter(
          ([, text]) => typeof text === 'string' && TEMPLATE_WORDS.test(text),
        );
        if (!stale.length) return null;
        return {
          severity: 'Worth a look',
          label: 'The summary for AI assistants still has the template’s words',
          detail: `${listNames(stale.map(([f]) => f))} tells assistants like ChatGPT about the site, and it still describes the starter template. ${fix}`,
        };
      },
    },
    {
      id: 'llms-pages-missing',
      run: ({ published, site, nameOf }) => {
        const text = site?.llmsTxt;
        if (typeof text !== 'string' || TEMPLATE_WORDS.test(text)) return null;
        const missing = published.filter((d) => {
          if (!pageTypes.has(d._type) || !isListedPage(d)) return false;
          const slug = slugOf(d);
          return slug !== null && !text.includes(`/${slug}/`) && !text.includes(`/${slug})`);
        });
        if (!missing.length) return null;
        return {
          severity: 'For information',
          label: `${plural(missing.length, 'page')} not in the summary for AI assistants`,
          detail: `${listNames(missing.map(nameOf))}. /llms.txt lists the pages assistants like ChatGPT should know about, and these are not on it. ${fix}`,
          ...openFirst(missing),
          items: itemsOf(missing, nameOf),
          itemLabel: 'Not in /llms.txt',
        };
      },
    },
    {
      id: 'llms-stale',
      run: ({ published, site, now }) => {
        const text = site?.llmsFull;
        if (typeof text !== 'string' || TEMPLATE_WORDS.test(text)) return null;
        const made = llmsUpdatedAt(text);
        const newest = Math.max(
          0,
          ...published
            .map((d) => (d._updatedAt ? Date.parse(d._updatedAt) : 0))
            .filter((t) => t > 0),
        );
        // Fresh: made recently, or nothing has been published since it was made.
        if (made !== null && (now - made <= maxAge || newest <= made + DAY)) return null;
        const age = made === null ? null : Math.floor((now - made) / DAY);
        return {
          severity: 'For information',
          label:
            age === null
              ? 'The full text for AI assistants has no date'
              : `The full text for AI assistants is ${age} days old`,
          detail: `/llms-full.txt gives assistants like ChatGPT the site's words in one place, and the site has changed since it was made. ${fix}`,
        };
      },
    },
  ];
}

// -----------------------------------------------------------------------------
// One document's findings, for "Before you publish"
// -----------------------------------------------------------------------------

/** Site-wide notes that say nothing about one document. */
export const SITE_WIDE_RULES = new Set([
  'old-drafts',
  'unpublished-changes',
  'things-in-trash',
  'last-publish',
  'llms-template',
  'llms-stale',
  'dead-external-links',
]);

export interface DocFinding {
  ruleId: string;
  severity: Severity;
  /** Short: what is wrong here ("A picture needs a description"). */
  label: string;
  /** The Checkup's plain-words explanation. */
  detail: string;
  /** The field to open, when the rule knows it. */
  field?: string;
}

/**
 * The Checkup's findings for one document, as it will be once published.
 * `docs` is everything the Checkup fetched (drafts too); `current` is the
 * editor's copy now (the draft if there is one). Rules that only speak about
 * the whole site are left out; so are findings about other documents.
 */
export function forDocument(
  docs: Doc[],
  rules: CheckupRule[],
  current: Doc | null | undefined,
  opts: Pick<CheckupContext, 'nameOf' | 'typeTitle' | 'site'> & { now?: number },
): DocFinding[] {
  if (!current) return [];
  const id = publishedIdOf(current._id);
  const asPublished: Doc = { ...current, _id: id };
  const others = docs.filter((d) => publishedIdOf(d._id) !== id);
  const results = runCheckup([...others, asPublished], rules, opts);

  const out: DocFinding[] = [];
  for (const r of results) {
    if (SITE_WIDE_RULES.has(r.id)) continue;
    const mine = (r.items ?? []).filter((i) => 'doc' in i.target && i.target.doc === id);
    if (mine.length) {
      for (const item of mine) {
        out.push({
          ruleId: r.id,
          severity: r.severity,
          label: r.itemLabel ?? r.label,
          detail: r.detail,
          field: 'field' in item.target ? item.target.field : undefined,
        });
      }
    } else if (!r.items?.length && r.target && 'doc' in r.target && r.target.doc === id) {
      out.push({
        ruleId: r.id,
        severity: r.severity,
        label: r.label,
        detail: r.detail,
        field: 'field' in r.target ? r.target.field : undefined,
      });
    }
  }
  return out;
}

/** Is this the editor's draft copy? (Re-exported for the panel.) */
export { isDraftId };
export type { SiteFiles };
