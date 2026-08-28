// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// page-checks - the courtesy "Check this page" pass, as pure functions
// =============================================================================
// WHAT THIS IS. An editor finishes a page and wants a second pair of eyes
// before publishing. This walks the DRAFT document and reports three kinds of
// "worth a look": a photo with no alt text, a section with nothing typed in it,
// and a link to an address no page seems to own.
//
// WHAT THIS IS NOT. It never blocks a publish and it never edits anything.
// Every finding is a suggestion, and every check is a HEURISTIC: it walks
// unknown shapes generically rather than knowing every section type, so it can
// miss things and it can be wrong. The wording in the Studio says so out loud.
//
// THE CONFIG OBJECT is what makes this file canonical. Every repo in the family
// names its page-builder arrays differently (`pageBuilder`, `sections`,
// `flexibleSections`), owns different code-only routes, and has its own list of
// sections that fill themselves from a collection. All of that arrives as a
// `PageCheckConfig` from the repo's own src/sanity/pageBuilderConfig.ts, so
// this module stays byte-identical everywhere.
//
// It lives in src/lib (not src/sanity) and imports nothing, so it is unit
// tested without a Studio, a browser, or a dataset. The Studio side of it is a
// thin shell: src/sanity/actions/checkPage.tsx.
// =============================================================================

/** The three things we look for. */
export type CheckId = 'alt' | 'empty' | 'links';

/** What one repo's pages look like, so the generic walk knows where to go. */
export interface PageCheckConfig {
  /**
   * Array fields that hold page-builder sections, in the order they render.
   * A document that has none of them simply produces no section units.
   */
  sectionArrays: readonly string[];
  /**
   * Fields that make up a banner ABOVE the sections, walked as one extra unit.
   * Some repos model this as a single object field (`hero`), some as loose
   * fields on the document (`heroHeadline`, `heroImage`); either works, because
   * the unit is built from whichever named fields are present.
   */
  header?: {
    /** How a finding names it, e.g. "Hero (top banner)". */
    label: string;
    fields: readonly string[];
    /**
     * Report "nothing typed here" for the header too. Off by default: a header
     * is a fragment of a page, not a section, and a page whose banner is one
     * background photo is a normal page in several repos.
     */
    checkEmpty?: boolean;
  };
  /**
   * Section types that fill THEMSELVES from a list elsewhere in the Studio. A
   * team section with no heading is not an empty section: it is a section that
   * gets its words from the Team collection. A name that drifts off this list
   * only costs a false "worth a look".
   */
  selfFillingSections: readonly string[];
  /**
   * Extra keys that hold a SETTING rather than words, on top of the shared list
   * below. Only needed for a repo that invents its own knob name.
   */
  extraSettingKeys?: readonly string[];
  /**
   * First path segments the SITE CODE owns, not the page builder: a link to
   * /journal or /events is fine even though no `page` document has that slug.
   * Include the built asset folders too.
   */
  codeOwnedPaths: readonly string[];
}

/** One thing worth a look, tied to the part of the page it was found in. */
export interface Finding {
  /** Human location, e.g. "Hero" or "Section 3: Gallery". */
  where: string;
  /** What we noticed, in plain words. */
  detail: string;
}

/** One check's results. Empty `findings` is the good case. */
export interface CheckGroup {
  id: CheckId;
  title: string;
  /** Honest one-liner about what this check can and cannot see. */
  note: string;
  findings: Finding[];
}

/** One walkable piece of a page: the header, then each section in order. */
export interface PageUnit {
  where: string;
  /** Schema type name, e.g. `gallerySection`. Empty for a shapeless value. */
  type: string;
  value: unknown;
  /** True for the header unit unless the config asks for it to be checked. */
  skipEmptyCheck?: boolean;
}

// ---------------------------------------------------------------------------
// Shared walking helpers
// ---------------------------------------------------------------------------

/** Sanity's own bookkeeping keys - never content, never a link. */
const META_KEYS = new Set([
  '_type',
  '_key',
  '_ref',
  '_id',
  '_rev',
  '_createdAt',
  '_updatedAt',
  '_weak',
  '_strengthenOnPublish',
  '_originalId',
  '_system',
  '_dataset',
  '_projectId',
]);

/**
 * Keys that hold a SETTING rather than words: "variant", "tone", "layout" and
 * friends are enum values with an initialValue, so a completely empty section
 * still has several of them. Counting those as content would make the
 * "nothing typed here" check permanently silent.
 */
const SETTING_KEYS = [
  'align',
  'alignment',
  'appearance',
  'aspect',
  'background',
  'color',
  'columns',
  'density',
  'direction',
  'grayscale',
  'icon',
  'kind',
  'layout',
  'level',
  'limit',
  'mediaType',
  'mode',
  'ratio',
  'size',
  'source',
  'style',
  'theme',
  'tone',
  'variant',
  'width',
];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Visit every (key, value) pair in a nested value, arrays included. */
function walk(value: unknown, visit: (key: string, value: unknown) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    visit(key, child);
    walk(child, visit);
  }
}

/**
 * `sectionImageText` and `imageTextSection` both become "Image text". No lookup
 * table to fall out of date, and one rule for both naming conventions in the
 * family (some repos prefix the type name, some suffix it).
 */
export function sectionLabel(type: string): string {
  const bare = type.replace(/^section(?=[A-Z])/, '').replace(/Section$|Object$/, '');
  const words = bare.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The header and every section, in page order, each with the label a finding
 * points at. Sections keep their 1-based position because that is how the
 * Sections list in the Studio counts them, and the count runs on across several
 * arrays (a repo that has both a main builder and an "extra sections" append
 * zone shows them as one list to the editor).
 */
export function pageUnits(doc: unknown, config: PageCheckConfig): PageUnit[] {
  const page = isRecord(doc) ? doc : {};
  const units: PageUnit[] = [];

  const header = config.header;
  if (header) {
    const held: Record<string, unknown> = {};
    for (const field of header.fields) {
      if (page[field] !== undefined && page[field] !== null) held[field] = page[field];
    }
    if (Object.keys(held).length > 0) {
      units.push({
        where: header.label,
        type: 'header',
        value: held,
        skipEmptyCheck: header.checkEmpty !== true,
      });
    }
  }

  let position = 0;
  for (const field of config.sectionArrays) {
    const sections = Array.isArray(page[field]) ? (page[field] as unknown[]) : [];
    for (const section of sections) {
      position += 1;
      const type = isRecord(section) && typeof section._type === 'string' ? section._type : '';
      units.push({
        where: `Section ${position}${type ? `: ${sectionLabel(type)}` : ''}`,
        type,
        value: section,
      });
    }
  }
  return units;
}

// ---------------------------------------------------------------------------
// Check 1 - photos with no alt text
// ---------------------------------------------------------------------------

const nonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

/** An uploaded image value: anything carrying `asset._ref`. */
function isImageValue(v: unknown): v is Record<string, unknown> {
  if (!isRecord(v)) return false;
  const asset = v.asset;
  return isRecord(asset) && typeof asset._ref === 'string';
}

/**
 * Does this image have a description somewhere a renderer would find it?
 *
 * The family models alt text three ways and this covers all of them:
 *  - a figure object: `{ image: <img>, alt }`      -> the parent's `alt`
 *  - a hero:          `{ image: <img>, imageAlt }` -> the parent's `<key>Alt`
 *  - inline:          `{ ..., alt }` on the image  -> the image's own `alt`
 * A parent holding two images and one alt reads as "described", which is the
 * kind of miss this check is allowed to make.
 */
function imageHasAlt(
  image: Record<string, unknown>,
  parent: Record<string, unknown> | null,
  key: string | null,
): boolean {
  const candidates: unknown[] = [image.alt, image.altText];
  if (parent) {
    candidates.push(parent.alt, parent.altText);
    if (key) candidates.push(parent[`${key}Alt`], parent[`${key}AltText`]);
  }
  return candidates.some(nonEmptyString);
}

/** Every image in a value, with the object and key it hangs off. */
function eachImage(
  value: unknown,
  visit: (
    image: Record<string, unknown>,
    parent: Record<string, unknown> | null,
    key: string | null,
  ) => void,
  parent: Record<string, unknown> | null = null,
  key: string | null = null,
): void {
  if (Array.isArray(value)) {
    for (const item of value) eachImage(item, visit, parent, key);
    return;
  }
  if (!isRecord(value)) return;
  if (isImageValue(value)) visit(value, parent, key);
  for (const [childKey, child] of Object.entries(value)) {
    if (META_KEYS.has(childKey)) continue;
    eachImage(child, visit, value, childKey);
  }
}

function checkAltText(units: PageUnit[]): CheckGroup {
  const findings: Finding[] = [];
  for (const unit of units) {
    let missing = 0;
    eachImage(unit.value, (image, parent, key) => {
      if (!imageHasAlt(image, parent, key)) missing += 1;
    });
    if (missing > 0) {
      findings.push({
        where: unit.where,
        detail:
          missing === 1
            ? 'A photo here has no description (alt text).'
            : `${missing} photos here have no description (alt text).`,
      });
    }
  }
  return {
    id: 'alt',
    title: 'Photos without a description',
    note: 'Alt text is the sentence a screen reader says, and what shows if the photo fails to load. Some photos are decoration and genuinely need none, so use your judgement.',
    findings,
  };
}

// ---------------------------------------------------------------------------
// Check 2 - sections with nothing typed in them
// ---------------------------------------------------------------------------

/** Any real words anywhere in this value (settings and ids do not count). */
export function hasTypedContent(value: unknown, config?: PageCheckConfig): boolean {
  const settings = new Set<string>([...SETTING_KEYS, ...(config?.extraSettingKeys ?? [])]);
  let found = false;
  walk(value, (key, child) => {
    if (found) return;
    if (META_KEYS.has(key) || settings.has(key)) return;
    if (nonEmptyString(child)) found = true;
  });
  return found;
}

function checkEmptySections(units: PageUnit[], config: PageCheckConfig): CheckGroup {
  const selfFilling = new Set<string>(config.selfFillingSections);
  const findings: Finding[] = [];
  for (const unit of units) {
    if (unit.skipEmptyCheck) continue;
    if (selfFilling.has(unit.type)) continue;
    if (hasTypedContent(unit.value, config)) continue;
    findings.push({
      where: unit.where,
      detail: 'Nothing is typed in this one yet, so it may show up blank.',
    });
  }
  return {
    id: 'empty',
    title: 'Sections with nothing in them',
    note: 'Sections that fill themselves from a list elsewhere in the Studio are skipped, because their words live there and not here.',
    findings,
  };
}

// ---------------------------------------------------------------------------
// Check 3 - links to addresses no page owns
// ---------------------------------------------------------------------------

/** Trim a written link down to the path we can compare: `/about?x=1#top` -> `/about`. */
export function normalizePath(href: string): string | null {
  const raw = href.trim();
  // Only same-site paths. Full URLs, mailto:, tel:, and bare anchors are
  // somebody else's problem (a link checker covers external links).
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  const path = raw.split(/[?#]/)[0];
  if (path === '/') return '/';
  return path.replace(/\/+$/, '') || '/';
}

/** Every same-site path written anywhere in a value. */
export function internalPaths(value: unknown): string[] {
  const found: string[] = [];
  walk(value, (key, child) => {
    if (META_KEYS.has(key)) return;
    if (typeof child !== 'string') return;
    const path = normalizePath(child);
    if (path) found.push(path);
  });
  return found;
}

/**
 * Compare by FIRST SEGMENT, on purpose. `/journal/spring-refresh` and
 * `/events/harvest-supper` are real addresses built by code from a collection,
 * and no `page` document owns them, so matching the whole path would flag half
 * the site. First-segment matching under-reports and never cries wolf.
 */
function knownFirstSegments(knownSlugs: readonly string[], config: PageCheckConfig): Set<string> {
  const set = new Set<string>(config.codeOwnedPaths);
  for (const slug of knownSlugs) {
    const first = slug.split('/')[0];
    if (first) set.add(first);
  }
  return set;
}

function checkLinks(
  units: PageUnit[],
  knownSlugs: readonly string[],
  config: PageCheckConfig,
): CheckGroup {
  const known = knownFirstSegments(knownSlugs, config);
  const findings: Finding[] = [];
  for (const unit of units) {
    const unknown = new Set<string>();
    for (const path of internalPaths(unit.value)) {
      if (path === '/') continue; // the home page always exists
      const first = path.slice(1).split('/')[0];
      if (!known.has(first)) unknown.add(path);
    }
    for (const path of [...unknown].sort()) {
      findings.push({
        where: unit.where,
        detail: `Links to ${path}, and no page seems to live there.`,
      });
    }
  }
  return {
    id: 'links',
    title: 'Links worth a look',
    note: 'Only links to our own site are checked, and only by their first part, so a link listed here is a question, not a verdict.',
    findings,
  };
}

// ---------------------------------------------------------------------------
// The whole pass
// ---------------------------------------------------------------------------

/**
 * Run all three checks over a page document (the draft, when there is one).
 *
 * `knownSlugs` is every page slug in the dataset, e.g. `['studio-tour',
 * 'press']`. Always returns all three groups, in a fixed order, so the dialog
 * can show an all-clear line for the ones that found nothing.
 */
export function checkPage(
  doc: unknown,
  config: PageCheckConfig,
  knownSlugs: readonly string[] = [],
): CheckGroup[] {
  const units = pageUnits(doc, config);
  return [
    checkAltText(units),
    checkEmptySections(units, config),
    checkLinks(units, knownSlugs, config),
  ];
}

/** How many things the whole pass turned up. Zero is the celebrated case. */
export const countFindings = (groups: CheckGroup[]): number =>
  groups.reduce((n, g) => n + g.findings.length, 0);
