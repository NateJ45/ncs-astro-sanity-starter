// Safe to edit by hand
// =============================================================================
// page-guardrails - gentle warnings while an editor builds a page (card 109)
// =============================================================================
// The Studio shows these as yellow WARNINGS beside the sections list, never as
// red errors: a warning never stops Publish, so content that was fine yesterday
// stays publishable today. The point is to catch the easy mistakes while the
// editor is still looking at the page, rather than after a visitor finds them.
//
// Two kinds of rule:
//   - the built-in ones, on every page builder: an empty section, example text
//     left over from a page template, a synced section with nothing picked;
//   - the site's own ones, from `pageRules` in src/sanity/kit.config.ts: which
//     section a page should open with, which sections belong once per page, and
//     how long a page can get before it is worth splitting.
//
// Pure on purpose: src/sanity/guardrails.ts wires this into schema validation,
// and src/lib/page-guardrails.test.ts pins it without a Studio.
// =============================================================================

import { hasTypedContent, sectionLabel, type PageCheckConfig } from './page-checks.ts';
import { hasExampleText, SYNCED_SECTION_TYPE } from './authoring.ts';

/** A site's own page rules. Every one is optional, and every one is a warning. */
export interface PageRules {
  /**
   * Document types the site rules below apply to (for example `['page']` for
   * custom pages only). The built-in warnings apply to every page builder.
   */
  appliesTo: readonly string[];
  /** A page should open with one of these section types. Empty: anything goes. */
  mustStartWith?: readonly string[];
  /** Section types that belong on a page at most once (a second hero, say). */
  atMostOnce?: readonly string[];
  /** Past this many sections, suggest splitting the page. 0 or unset: no limit. */
  maxSections?: number;
}

export interface GuardrailWarning {
  message: string;
  /** Relative to the sections array: `[{ _key }]` for one section, `[]` for the list. */
  path: Array<{ _key: string }>;
}

type Section = { _type?: unknown; _key?: unknown; preset?: unknown; [k: string]: unknown };

const nameOf = (type: string) => sectionLabel(type);

/** "a Hero" / "an Image and text": an article, for warnings that read as speech. */
function withArticle(label: string): string {
  return /^[aeiou]/i.test(label) ? `an ${label}` : `a ${label}`;
}

function listOf(types: readonly string[]): string {
  const names = types.map((t) => `${withArticle(nameOf(t).toLowerCase())} section`);
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

/**
 * Every warning for one sections array.
 *
 * @param sections   the array's value
 * @param docType    the document's `_type`, to decide whether site rules apply
 * @param rules      the site's rules (kit.config.ts)
 * @param checks     the page-check config, for which sections fill themselves
 */
export function pageWarnings(
  sections: unknown,
  docType: string | undefined,
  rules: PageRules,
  checks: Pick<PageCheckConfig, 'selfFillingSections' | 'extraSettingKeys'>,
): GuardrailWarning[] {
  const list = (Array.isArray(sections) ? sections : []).filter(
    (s): s is Section =>
      typeof s === 'object' && s !== null && typeof (s as Section)._type === 'string',
  );
  const out: GuardrailWarning[] = [];
  const at = (s: Section) => (typeof s._key === 'string' ? [{ _key: s._key }] : []);
  const selfFilling = new Set(checks.selfFillingSections);

  // ── Built-in: one look at each section ──────────────────────────────────────
  for (const s of list) {
    const type = String(s._type);
    if (type === SYNCED_SECTION_TYPE) {
      const ref = (s.preset as { _ref?: unknown } | undefined)?._ref;
      if (typeof ref !== 'string' || !ref) {
        out.push({
          message: 'This synced section has no saved section picked yet, so it shows nothing.',
          path: at(s),
        });
      }
      continue;
    }
    if (hasExampleText(s)) {
      out.push({
        message: `This ${nameOf(type).toLowerCase()} section still has example text in it. Replace anything starting "Example:" before you publish.`,
        path: at(s),
      });
      continue;
    }
    if (!selfFilling.has(type) && !hasTypedContent(s, checks as PageCheckConfig)) {
      out.push({
        message: `This ${nameOf(type).toLowerCase()} section is empty, so it may show up blank. Fill it in or remove it.`,
        path: at(s),
      });
    }
  }

  // ── The site's own rules ────────────────────────────────────────────────────
  if (!docType || !rules.appliesTo.includes(docType) || list.length === 0) return out;

  const first = list[0];
  if (rules.mustStartWith?.length && !rules.mustStartWith.includes(String(first._type))) {
    out.push({
      message: `Pages on this site usually open with ${listOf(rules.mustStartWith)}. Drag one to the top, or add one there.`,
      path: [],
    });
  }

  for (const type of rules.atMostOnce ?? []) {
    const hits = list.filter((s) => s._type === type);
    if (hits.length > 1) {
      out.push({
        message: `This page has ${hits.length} ${nameOf(type).toLowerCase()} sections. One is usually enough, so this extra one may be a mistake.`,
        path: at(hits[1]),
      });
    }
  }

  if (rules.maxSections && list.length > rules.maxSections) {
    out.push({
      message: `This page has ${list.length} sections. Past ${rules.maxSections} it gets hard to read; think about splitting it into two pages.`,
      path: [],
    });
  }

  return out;
}
