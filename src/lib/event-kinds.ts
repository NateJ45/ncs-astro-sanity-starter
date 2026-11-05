// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// event-kinds.ts - the kinds of GA4 events a site sends, in plain words
// =============================================================================
// PORTS.md card 217, on the same footing as analytics-config.ts (card 54): the
// privacy page's analytics paragraph is derived from the configuration, never
// retyped, so it cannot fall behind what the site really sends. The page asks
// this module "what kinds of action are counted here?" and gets back phrases
// worked out from the site's events map (src/config/events.ts) minus the events
// it has switched off. Add an event to the map and the privacy page names it on
// the next build; switch one off and it drops out.
//
// Callers show the sentence only when GA4 is on (hasGa in analytics-config.ts):
// the events travel through the same tag and nowhere else.
//
// Kept apart from track.ts so a page's frontmatter can import it without
// pulling the browser sender along.
// =============================================================================

import type { EventsConfig } from './track.ts';

/** Kinds with a built-in rule or sender, in reading order. Named while any of their events is sent. */
const BUILT_IN: Array<[events: string[], words: string]> = [
  [['watch_click'], 'video links'],
  [['directions_click'], 'map and directions links'],
  [['contact_click'], 'email and phone links (the kind of link only, never the address)'],
  [['download_click'], 'file downloads'],
  [['outbound_click'], 'links to other sites'],
  [
    ['form_view', 'embed_interact', 'generate_lead'],
    'whether a form is seen, used or sent (never what is typed into it)',
  ],
  [
    ['site_search', 'search_no_results'],
    'the words typed into the site search (left out if they look like an email address or phone number)',
  ],
  [['article_progress', 'article_read'], 'how far down an article is read and for how long'],
  [['page_not_found'], 'pages that could not be found'],
  [['js_error'], 'errors in the site’s own scripts'],
];

/** Words for an event a site's map may name without a describe line. */
const MAP_WORDS: Record<string, string> = {
  give_click: 'giving links',
  register_click: 'registration links',
  ...Object.fromEntries(BUILT_IN.flatMap(([events, words]) => events.map((e) => [e, words]))),
};

/**
 * The kinds of action this site counts, as short phrases in reading order: the
 * site's own rules first (giving, registering, its apps), then the built-in
 * kinds. A rule with a describe line uses its own words; a rule for an event the
 * page does not know and with no describe line still counts, as "other links the
 * site marks", so a new event can never be sent unmentioned.
 */
export function eventKinds(config: EventsConfig = {}): string[] {
  const off = new Set(config.off ?? []);
  const phrases: string[] = [];
  const add = (p: string) => {
    if (!phrases.includes(p)) phrases.push(p);
  };

  let other = false;
  for (const rule of config.links ?? []) {
    if (off.has(rule.event)) continue;
    const words = rule.describe ?? MAP_WORDS[rule.event];
    if (words) add(words);
    else other = true;
  }
  if (other) add('other links the site marks');
  for (const [events, words] of BUILT_IN) {
    if (events.some((e) => !off.has(e))) add(words);
  }
  return phrases;
}

/** "a, b and c". */
function listWords(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * One plain sentence for the privacy page, or '' when nothing is counted.
 * "It also records what visitors do on the site: giving links, ..., and pages that could not be found."
 */
export function eventsSentence(config: EventsConfig = {}): string {
  const kinds = eventKinds(config);
  if (kinds.length === 0) return '';
  return `It also records what visitors do on the site: ${listWords(kinds)}.`;
}
