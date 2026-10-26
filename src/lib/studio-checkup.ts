// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// Checkup: "What needs attention", as pure rules (Studio kit, 2026-10-17)
// =============================================================================
// Ported in spirit from mas-monograms (src/lib/studio-checkup.ts) and
// stonesteps-50k (CheckupTool). The difference: mas wrote one GROQ query per
// check against its own document types. The kit has to work on any site in
// the family, so it fetches every content document ONCE (sites in this family
// hold a few hundred at most) and each rule is a pure function over that list.
// No rule names a document type unless the site config hands it one, so a
// fork gets the generic checks for free and adds its own in kit.config.ts.
//
// It CHANGES NOTHING. It points, and the editor fixes it in the Studio. Every
// finding has one plain sentence and a "Take me there" target.
//
// Rules for every rule:
//   - Sanity's own records (sanity.*, system.*, media.*) never count: the
//     Presentation tool keeps its preview secret as a draft, and counting it
//     reported "1 unpublished change" on an untouched dataset (Stone Steps).
//   - One rule that throws never takes the others down (runCheckup catches).
//   - Severity is in plain words: Needs doing / Worth a look / For information.
// Unit tests: src/lib/studio-checkup.test.ts.
// =============================================================================

import type { StudioTarget } from './studio-kit.ts';
import { onPageCodePaths, siteCodeFieldsInUse } from './custom-code.ts';

export type Severity = 'Needs doing' | 'Worth a look' | 'For information';

/** One page or thing a finding is about, for Home's Fix-it list (PORTS.md card 115). */
export interface FindingItem {
  name: string;
  target: StudioTarget;
}

export interface Finding {
  severity: Severity;
  label: string;
  detail: string;
  target?: StudioTarget;
  /** Words on the "Take me there" button. */
  targetLabel?: string;
  /**
   * Card 115: each page or thing the finding is about, with its own link, so
   * Home's Fix-it list can name them one by one. Optional: a finding without
   * items shows on Home as one row from its label.
   */
  items?: FindingItem[];
  /** What is wrong with each item, short ("A picture needs a description"). */
  itemLabel?: string;
}

export interface CheckResult extends Finding {
  id: string;
}

/** A Sanity document as the checkup sees it (plain JSON). */
export type Doc = Record<string, unknown> & { _id: string; _type: string; _updatedAt?: string };

export interface CheckupContext {
  /** Every content document, published and drafts (system types already removed). */
  docs: Doc[];
  /** Published copies only. */
  published: Doc[];
  /** Drafts only (ids start with `drafts.`). */
  drafts: Doc[];
  now: number;
  /** A readable name for a document ("the Home page", "Easter service"). */
  nameOf: (doc: Doc) => string;
  /** A readable name for a type ("Announcement"). */
  typeTitle: (type: string) => string;
  /**
   * Reports written by scheduled jobs (REPORT_TYPES, e.g. the weekly link
   * check, card 122). Kept OUT of docs/published/drafts, so a weekly write
   * never reads as "the last change was published today" and no content rule
   * walks a report as if it were a page.
   */
  reports: Doc[];
  /**
   * Files the live site serves that a rule may read (card 123: /llms.txt and
   * /llms-full.txt). Optional: undefined means "not fetched", and a rule that
   * needs it says nothing.
   */
  site?: SiteFiles;
}

/** What the Studio fetched from the site for the Checkup (card 123). Null: the site answered 404. */
export interface SiteFiles {
  llmsTxt?: string | null;
  llmsFull?: string | null;
}

/** Document types that are reports about the site, not content (card 122). */
export const REPORT_TYPES = new Set(['linkReport']);

export interface CheckupRule {
  id: string;
  run: (ctx: CheckupContext) => Finding | null;
}

/** The GROQ that fetches everything the rules read. */
export const CHECKUP_QUERY = `*[!(_type match "sanity.*") && !(_type match "system.*") && !(_type match "media.*") && !(_id in path("versions.**")) && !(_id match "_.**")]`;

const DAY = 24 * 60 * 60 * 1000;

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "a, b and c", with "and N more" past `max`. */
export function listNames(names: string[], max = 4): string {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  if (rest > 0) return `${shown.join(', ')} and ${rest} more`;
  if (shown.length <= 1) return shown.join('');
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}

export const isDraftId = (id: string) => id.startsWith('drafts.');
export const publishedIdOf = (id: string) => (isDraftId(id) ? id.slice('drafts.'.length) : id);

/** One Fix-it item per document (card 115), each opening that document (at `field`). */
export function itemsOf(
  docs: Doc[],
  nameOf: (doc: Doc) => string,
  field?: (doc: Doc) => string | undefined,
): FindingItem[] {
  const seen = new Set<string>();
  const out: FindingItem[] = [];
  for (const doc of docs) {
    const id = publishedIdOf(doc._id);
    if (seen.has(id)) continue;
    seen.add(id);
    const f = field?.(doc);
    out.push({
      name: nameOf(doc),
      target: { doc: id, type: doc._type, ...(f ? { field: f } : {}) },
    });
  }
  return out;
}

/** Open the one document, or say "Open the first one" when there are several. */
export function openFirst(docs: Doc[], field?: string): Pick<Finding, 'target' | 'targetLabel'> {
  const first = docs[0];
  if (!first) return {};
  return {
    target: {
      doc: publishedIdOf(first._id),
      type: first._type,
      ...(field ? { field } : {}),
    },
    targetLabel: docs.length === 1 ? 'Open it' : 'Open the first one',
  };
}

/** Visit every plain object inside a value, with the dotted path to it. */
export function walk(
  value: unknown,
  visit: (obj: Record<string, unknown>, path: string[]) => void,
  path: string[] = [],
): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => {
      const key =
        v && typeof v === 'object' && typeof (v as { _key?: unknown })._key === 'string'
          ? `[_key=="${(v as { _key: string })._key}"]`
          : `[${i}]`;
      walk(v, visit, [...path, key]);
    });
    return;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    visit(obj, path);
    for (const [k, v] of Object.entries(obj)) {
      if (k.startsWith('_') && k !== '_key') continue;
      walk(v, visit, [...path, k]);
    }
  }
}

/** Every string inside a value (Portable Text spans included). */
export function strings(value: unknown): string[] {
  const out: string[] = [];
  const go = (v: unknown) => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(go);
    else if (v && typeof v === 'object') {
      for (const [k, inner] of Object.entries(v as Record<string, unknown>)) {
        if (k.startsWith('_')) continue;
        go(inner);
      }
    }
  };
  go(value);
  return out;
}

/** A Sanity path string from walk()'s segments, for `field` deep links. */
export function pathString(segments: string[]): string {
  return segments.reduce((acc, s) => (s.startsWith('[') ? acc + s : acc ? `${acc}.${s}` : s), '');
}

// -----------------------------------------------------------------------------
// Generic rules (true of every site in the family)
// -----------------------------------------------------------------------------

export interface GenericRuleOptions {
  /** Image fields that never need words (a logo beside the site's name, a favicon). */
  altExemptFields?: string[];
  /** Document types that are pages with SEO fields (seoTitle / seoDescription). */
  seoTypes?: string[];
  /** Drafts older than this many days are "Worth a look". */
  staleDraftDays?: number;
  /** The Trash document type, if the site uses the kit's Trash. */
  trashType?: string;
}

export function genericRules(opts: GenericRuleOptions = {}): CheckupRule[] {
  const altExempt = new Set(opts.altExemptFields ?? ['logo', 'favicon', 'icon', 'logoImage']);
  const seoTypes = new Set(opts.seoTypes ?? []);
  const staleDays = opts.staleDraftDays ?? 14;
  const trashType = opts.trashType ?? 'trashedItem';

  return [
    {
      // A picture with no words cannot be read aloud and tells Google nothing.
      id: 'image-no-description',
      run: ({ published, nameOf }) => {
        const hits: Array<{ doc: Doc; field: string }> = [];
        for (const doc of published) {
          if (doc._type === trashType) continue;
          walk(doc, (obj, path) => {
            const asset = obj.asset as { _ref?: string } | undefined;
            if (!asset?._ref?.startsWith('image-')) return;
            const fieldName = [...path].reverse().find((s) => !s.startsWith('['));
            if (fieldName && altExempt.has(fieldName)) return;
            const alt = obj.alt;
            if (typeof alt === 'string' && alt.trim()) return;
            hits.push({ doc, field: pathString(path) });
          });
        }
        if (!hits.length) return null;
        const docs = [...new Map(hits.map((h) => [h.doc._id, h.doc])).values()];
        return {
          severity: 'Needs doing',
          label: `${plural(hits.length, 'picture')} with no description`,
          detail: `On ${listNames(docs.map(nameOf))}. Each picture needs a few words saying what it shows. They are read aloud to people who cannot see it, and Google reads them too.`,
          ...openFirst([hits[0].doc], hits[0].field),
          items: itemsOf(docs, nameOf, (d) => hits.find((h) => h.doc._id === d._id)?.field),
          itemLabel: 'A picture needs a description',
        };
      },
    },
    {
      // A page with nothing for Google to show under its link.
      id: 'seo-missing',
      run: ({ published, nameOf }) => {
        const missing = published.filter((d) => {
          if (!seoTypes.has(d._type)) return false;
          if (d.hideFromSearch === true) return false;
          const desc = d.seoDescription;
          return typeof desc !== 'string' || !desc.trim();
        });
        if (!missing.length) return null;
        return {
          severity: 'Worth a look',
          label: `${plural(missing.length, 'page')} with no Google description`,
          detail: `${listNames(missing.map(nameOf))}. The description is the line Google shows under the page's name. Without one, Google picks some words itself.`,
          ...openFirst(missing, 'seoDescription'),
          items: itemsOf(missing, nameOf, () => 'seoDescription'),
          itemLabel: 'No Google description',
        };
      },
    },
    {
      // A link to something that is gone, or was never published.
      id: 'link-to-missing',
      run: ({ published, nameOf }) => {
        const ids = new Set(published.map((d) => d._id));
        const broken: Doc[] = [];
        for (const doc of published) {
          if (doc._type === trashType) continue;
          let bad = false;
          walk(doc, (obj) => {
            const ref = obj._ref;
            if (typeof ref !== 'string') return;
            if (/^(image|file)-/.test(ref)) return;
            if (obj._weak === true) return;
            if (!ids.has(ref)) bad = true;
          });
          if (bad) broken.push(doc);
        }
        if (!broken.length) return null;
        return {
          severity: 'Needs doing',
          label: `${plural(broken.length, 'page')} linking to something that is not on the website`,
          detail: `${listNames(broken.map(nameOf))}. A link or a choice on it points at something that was removed or has not been published. Publish that, or change the link.`,
          ...openFirst(broken),
          items: itemsOf(broken, nameOf),
          itemLabel: 'Links to something not on the website',
        };
      },
    },
    {
      // Pasted code switched to run directly on the page (PORTS.md card 121).
      // Not wrong in itself (a giving or booking widget may need it), so it is
      // listed for information: every page where code runs outside its box.
      id: 'code-runs-on-page',
      run: ({ published, nameOf }) => {
        const hits: Array<{ doc: Doc; field: string }> = [];
        for (const doc of published) {
          if (doc._type === trashType) continue;
          for (const path of onPageCodePaths(doc)) {
            hits.push({ doc, field: pathString([...path, 'runsOnPage']) });
          }
        }
        if (!hits.length) return null;
        const docs = [...new Map(hits.map((h) => [h.doc._id, h.doc])).values()];
        return {
          severity: 'For information',
          label: `Code that runs directly on the page: ${plural(docs.length, 'page')}`,
          detail: `On ${listNames(docs.map(nameOf))}. This code is not in its own box, so it can do anything the website can, including reading what a signed-in editor is doing. Keep it only for a provider you trust, such as a giving or booking service. If you are not sure, turn the switch off and check the page still works.`,
          ...openFirst([hits[0].doc], hits[0].field),
          items: itemsOf(docs, nameOf, (d) => hits.find((h) => h.doc._id === d._id)?.field),
          itemLabel: 'Code runs directly on the page',
        };
      },
    },
    {
      // Site settings' "Code on every page" (PORTS.md card 121).
      id: 'code-on-every-page',
      run: ({ published, nameOf }) => {
        const hits = published.filter(
          (d) => d._type !== trashType && siteCodeFieldsInUse(d).length > 0,
        );
        if (!hits.length) return null;
        const where = [...new Set(hits.flatMap((d) => siteCodeFieldsInUse(d)))].map((f) =>
          f === 'headCode' ? 'the page head' : 'the end of every page',
        );
        return {
          severity: 'For information',
          label: 'Code on every page',
          detail: `${listNames(hits.map(nameOf))} adds code to ${listNames(where)} on every page of the website. It runs directly on the page, outside any box. Keep it only if you still need it and trust where it came from.`,
          ...openFirst(hits, siteCodeFieldsInUse(hits[0])[0]),
          items: itemsOf(hits, nameOf, (d) => siteCodeFieldsInUse(d)[0]),
          itemLabel: 'Code on every page',
        };
      },
    },
    {
      // Changes started a while ago and never published.
      id: 'old-drafts',
      run: ({ drafts, now, nameOf }) => {
        const old = drafts.filter((d) => {
          const t = d._updatedAt ? Date.parse(d._updatedAt) : NaN;
          return !Number.isNaN(t) && now - t > staleDays * DAY;
        });
        if (!old.length) return null;
        return {
          severity: 'Worth a look',
          label: `${plural(old.length, 'change')} waiting more than ${staleDays} days`,
          detail: `${listNames(old.map(nameOf))}. You started a change and have not pressed Publish. Publish it, or open it and use "Discard changes" if you no longer want it.`,
          ...openFirst(old),
          items: itemsOf(old, nameOf),
          itemLabel: `Not published for over ${staleDays} days`,
        };
      },
    },
    {
      id: 'unpublished-changes',
      run: ({ drafts, now, nameOf }) => {
        const recent = drafts.filter((d) => {
          const t = d._updatedAt ? Date.parse(d._updatedAt) : NaN;
          return Number.isNaN(t) || now - t <= staleDays * DAY;
        });
        if (!recent.length) return null;
        return {
          severity: 'For information',
          label: `${plural(recent.length, 'change')} not on the website yet`,
          detail: `${listNames(recent.map(nameOf))}. Nobody sees these until you press Publish. Leave them if you are still working on them.`,
          ...openFirst(recent),
        };
      },
    },
    {
      id: 'things-in-trash',
      run: ({ published }) => {
        const n = published.filter((d) => d._type === trashType).length;
        if (!n) return null;
        return {
          severity: 'For information',
          label: `${plural(n, 'thing')} in the Trash`,
          detail: 'They are off the website and can be brought back. Nothing to do.',
          target: { pane: 'trash' },
          targetLabel: 'Open the Trash',
        };
      },
    },
    {
      id: 'last-publish',
      run: ({ published, now }) => {
        const times = published
          .filter((d) => d._type !== trashType)
          .map((d) => (d._updatedAt ? Date.parse(d._updatedAt) : NaN))
          .filter((t) => !Number.isNaN(t));
        if (!times.length) return null;
        const days = Math.max(0, Math.floor((now - Math.max(...times)) / DAY));
        const when = days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
        return {
          severity: 'For information',
          label: `The last change was published ${when}`,
          detail: 'A website that changes now and then looks cared for, and Google notices too.',
        };
      },
    },
  ];
}

/** Is any `confirmed` / `...Confirmed` box anywhere in this value unticked? */
export function hasUnconfirmedFlag(value: unknown): boolean {
  let found = false;
  walk(value, (obj) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v === false && (k === 'confirmed' || k.endsWith('Confirmed'))) found = true;
    }
  });
  return found;
}

/**
 * Text still marked as waiting for someone to confirm it ("to be confirmed",
 * "[confirm]"), or a `confirmed` box left unticked, on the document or on any
 * object inside it (`address.confirmed`, `phoneConfirmed`, a service
 * time's `confirmed`; PORTS.md card 66). Generic, but opt-in: a site that
 * seeds placeholder copy turns it on.
 */
export function unconfirmedRule(
  pattern: RegExp = /\bto be confirmed\b|\[confirm\]/i,
  severity: Severity = 'Worth a look',
): CheckupRule {
  return {
    id: 'unconfirmed-facts',
    run: ({ published, nameOf }) => {
      const hits = published.filter(
        (d) => hasUnconfirmedFlag(d) || strings(d).some((s) => pattern.test(s)),
      );
      if (!hits.length) return null;
      return {
        severity,
        label: `${plural(hits.length, 'page')} with facts still to confirm`,
        detail: `${listNames(hits.map(nameOf))}. Some words on these are marked "to be confirmed" or not yet checked as confirmed. Check them, correct them if needed, and remove the marker.`,
        ...openFirst(hits),
        items: itemsOf(hits, nameOf),
        itemLabel: 'Facts to confirm',
      };
    },
  };
}

const RANK: Record<Severity, number> = {
  'Needs doing': 0,
  'Worth a look': 1,
  'For information': 2,
};

/** Split the fetched documents and run every rule; a rule that throws is skipped. */
export function runCheckup(
  docs: Doc[],
  rules: CheckupRule[],
  opts: Pick<CheckupContext, 'nameOf' | 'typeTitle' | 'site'> & { now?: number },
): CheckResult[] {
  const reports = docs.filter((d) => REPORT_TYPES.has(d._type));
  const content = docs.filter((d) => !REPORT_TYPES.has(d._type));
  const ctx: CheckupContext = {
    docs: content,
    published: content.filter((d) => !isDraftId(d._id)),
    drafts: content.filter((d) => isDraftId(d._id)),
    reports,
    now: opts.now ?? Date.now(),
    nameOf: opts.nameOf,
    typeTitle: opts.typeTitle,
    site: opts.site,
  };
  const out: CheckResult[] = [];
  for (const rule of rules) {
    try {
      const finding = rule.run(ctx);
      if (finding) out.push({ id: rule.id, ...finding });
    } catch {
      // A half-run report is still useful; a blank screen is not.
    }
  }
  return out.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
}

/** "All clear" means nothing to do: For information never spoils it. */
export function isAllClear(results: CheckResult[]): boolean {
  return results.every((r) => r.severity === 'For information');
}

/** Counts for the Home card. */
export function countBySeverity(results: CheckResult[]): Record<Severity, number> {
  const out: Record<Severity, number> = {
    'Needs doing': 0,
    'Worth a look': 0,
    'For information': 0,
  };
  for (const r of results) out[r.severity] += 1;
  return out;
}

/** A readable name for a document, from the usual title fields. */
export function defaultNameOf(typeTitle: (type: string) => string) {
  return (doc: Doc): string => {
    // A singleton (its id is its type, "aboutPage") is named by its type: its
    // SEO title reads "About us | Site name", which is not what it is called.
    if (publishedIdOf(doc._id) === doc._type) return typeTitle(doc._type);
    for (const key of [
      'title',
      'name',
      'heading',
      'question',
      'label',
      'internalTitle',
      'pageTitle',
      'seoTitle',
    ]) {
      const v = doc[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return typeTitle(doc._type);
  };
}
