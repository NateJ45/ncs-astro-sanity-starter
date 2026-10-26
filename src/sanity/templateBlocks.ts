// Safe to edit by hand
// =============================================================================
// templateBlocks - small builders the page templates and patterns are written in
// =============================================================================
// pageTemplates.ts (start a page) and sectionPatterns.ts (drop a few sections
// into a page that already exists) both describe pages as lists of sections.
// Written as raw objects they run long; with these builders a template reads
// like an outline of the page (PORTS.md card 173, building on card 109).
//
// Every builder returns plain data in the shape the schema stores
// (src/sanity/schemaTypes/sections.ts and builderSections.ts). Keys are not set
// here: the callers run the result through freshKeys() (src/lib/authoring.ts),
// so every new page or inserted pattern gets its own.
//
// One habit keeps the output honest: anything the site must supply (a name, a
// date, a place, a claim about the business) goes through `example()`, so it
// starts "Example:" and the page builder warns until it is replaced.
//
// No links inside Portable Text on purpose: freshKeys() renews a link's markDef
// `_key` but not the span's `marks` that point at it, so a link would come out
// broken. Links go in buttons (ctaBlock) instead.
//
// A FORK adds builders for its own blocks below (or in a file of its own), in
// the same shape. No `sanity` import here on purpose: node --test loads this
// file directly.
// =============================================================================

import { example } from '../lib/authoring.ts';

type Rec = Record<string, unknown>;

export { example };

// ── Text ─────────────────────────────────────────────────────────────────────

/** One Portable Text paragraph (or heading, with a style). */
export const para = (text: string, style = 'normal'): Rec => ({
  _type: 'block',
  style,
  markDefs: [],
  children: [{ _type: 'span', marks: [], text }],
});

/** Several paragraphs at once. */
export const paras = (...texts: string[]): Rec[] => texts.map((t) => para(t));

/** Portable Text bullet points, one block per item. */
export const bullets = (...items: string[]): Rec[] =>
  items.map((text) => ({ ...para(text), listItem: 'bullet', level: 1 }));

// ── Buttons ──────────────────────────────────────────────────────────────────

/** A button the editor points at a page of their choice (no page picked yet). */
export const button = (label: string): Rec => ({ _type: 'ctaBlock', label, linkType: 'internal' });

// ── Dates ────────────────────────────────────────────────────────────────────

/**
 * A calendar day `days` from today, as YYYY-MM-DD. Templates use it so a new
 * event page opens with dates in the future (an event or countdown whose dates
 * have passed draws nothing), and the editor changes them to the real ones.
 */
export const daysFromNow = (days: number, from = new Date()): string => {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + days));
  return d.toISOString().slice(0, 10);
};

// ── General blocks (sections.ts) ─────────────────────────────────────────────

export const hero = (o: {
  headline: string;
  subhead?: string;
  eyebrow?: string;
  primary?: Rec;
  secondary?: Rec;
}): Rec => ({
  _type: 'heroSection',
  ...(o.eyebrow ? { eyebrow: o.eyebrow } : {}),
  headline: o.headline,
  ...(o.subhead ? { subhead: o.subhead } : {}),
  ...(o.primary ? { primaryCta: o.primary } : {}),
  ...(o.secondary ? { secondaryCta: o.secondary } : {}),
  size: 'short',
});

export const richText = (heading: string, body: Rec[]): Rec => ({
  _type: 'richTextSection',
  ...(heading ? { heading } : {}),
  body,
});

/** Picture beside text. The editor adds the photo. */
export const imageText = (o: {
  heading: string;
  body: Rec[];
  side?: 'left' | 'right';
  cta?: Rec;
}): Rec => ({
  _type: 'imageTextSection',
  imageSide: o.side ?? 'right',
  heading: o.heading,
  body: o.body,
  ...(o.cta ? { cta: o.cta } : {}),
});

export const stat = (number: number, label: string, suffix?: string): Rec => ({
  _type: 'statItem',
  number,
  label,
  ...(suffix ? { suffix } : {}),
});

export const stats = (heading: string, items: Rec[]): Rec => ({
  _type: 'statSection',
  heading,
  stats: items,
});

export const quote = (text: string, attribution: string): Rec => ({
  _type: 'quoteSection',
  quote: text,
  attribution,
});

/** The band at the foot of a page: one line and one button. */
export const ctaBand = (headline: string, subhead: string, cta: Rec): Rec => ({
  _type: 'ctaBandSection',
  headline,
  subhead,
  cta,
});

// ── The builder kit (builderSections.ts, card 173) ───────────────────────────

export const column = (heading: string, ...body: string[]): Rec => ({
  _type: 'textColumn',
  heading,
  body: paras(...body),
});

export const columns = (heading: string, cols: Rec[], intro?: string): Rec => ({
  _type: 'columnsSection',
  ...(heading ? { heading } : {}),
  ...(intro ? { intro } : {}),
  textColumns: cols,
});

export const link = (cta: Rec, note?: string): Rec => ({
  _type: 'quickLink',
  link: cta,
  ...(note ? { note } : {}),
});

export const buttonRow = (
  heading: string,
  links: Rec[],
  o: { intro?: string; layout?: 'buttons' | 'cards' } = {},
): Rec => ({
  _type: 'buttonRowSection',
  ...(heading ? { heading } : {}),
  ...(o.intro ? { intro: o.intro } : {}),
  layout: o.layout ?? 'buttons',
  links,
});

export const qa = (question: string, ...answer: string[]): Rec => ({
  _type: 'accordionItem',
  question,
  answer: paras(...answer),
});

export const accordion = (heading: string, items: Rec[], intro?: string): Rec => ({
  _type: 'accordionSection',
  ...(heading ? { heading } : {}),
  ...(intro ? { intro } : {}),
  items,
});

export const tab = (label: string, ...body: string[]): Rec => ({
  _type: 'tabPanel',
  label,
  body: paras(...body),
});

export const tabs = (heading: string, panels: Rec[], intro?: string): Rec => ({
  _type: 'tabsSection',
  ...(heading ? { heading } : {}),
  ...(intro ? { intro } : {}),
  tabs: panels,
});

export const countdown = (o: {
  eventName: string;
  startDate: string;
  endDate?: string;
  intro?: string;
  duringText?: string;
  afterText?: string;
  link?: Rec;
}): Rec => ({
  _type: 'countdownSection',
  eventName: o.eventName,
  startDate: o.startDate,
  ...(o.endDate ? { endDate: o.endDate } : {}),
  ...(o.intro ? { intro: o.intro } : {}),
  duringText: o.duringText ?? 'It is happening now. Come and join us!',
  afterText: o.afterText ?? 'Thank you to everyone who came!',
  ...(o.link ? { link: o.link } : {}),
});

export const notice = (
  message: string,
  o: { urgency?: 'info' | 'urgent'; startDate?: string; endDate?: string } = {},
): Rec => ({
  _type: 'noticeSection',
  message,
  urgency: o.urgency ?? 'info',
  ...(o.startDate ? { startDate: o.startDate } : {}),
  ...(o.endDate ? { endDate: o.endDate } : {}),
});

export const moment = (year: string, title: string, text: string): Rec => ({
  _type: 'timelineEntry',
  year,
  title,
  text,
});

export const timeline = (heading: string, entries: Rec[], intro?: string): Rec => ({
  _type: 'timelineSection',
  ...(heading ? { heading } : {}),
  ...(intro ? { intro } : {}),
  entries,
});

export const letter = (o: {
  eyebrow?: string;
  greeting?: string;
  body: string[];
  signOff?: string;
  name: string;
  role?: string;
}): Rec => ({
  _type: 'letterSection',
  ...(o.eyebrow ? { eyebrow: o.eyebrow } : {}),
  greeting: o.greeting ?? 'Dear friends,',
  body: paras(...o.body),
  signOff: o.signOff ?? 'With thanks,',
  name: o.name,
  ...(o.role ? { role: o.role } : {}),
});

export const eventDate = (
  date: string,
  o: { startTime?: string; endTime?: string; label?: string } = {},
): Rec => ({
  _type: 'eventDate',
  date,
  ...(o.startTime ? { startTime: o.startTime } : {}),
  ...(o.endTime ? { endTime: o.endTime } : {}),
  ...(o.label ? { label: o.label } : {}),
});

export const eventDetails = (o: {
  eyebrow?: string;
  title: string;
  dates: Rec[];
  place: string;
  note?: string;
  button?: Rec;
}): Rec => ({
  _type: 'eventDetailsSection',
  ...(o.eyebrow ? { eyebrow: o.eyebrow } : {}),
  title: o.title,
  occurrences: o.dates,
  place: o.place,
  ...(o.note ? { note: o.note } : {}),
  ...(o.button ? { button: o.button } : {}),
  showCalendar: true,
});

export const slot = (startTime: string, title: string, note?: string): Rec => ({
  _type: 'scheduleItem',
  ...(startTime ? { startTime } : {}),
  title,
  ...(note ? { note } : {}),
});

export const scheduleDay = (title: string, items: Rec[]): Rec => ({
  _type: 'scheduleDay',
  ...(title ? { title } : {}),
  items,
});

export const schedule = (heading: string, days: Rec[], intro?: string): Rec => ({
  _type: 'scheduleSection',
  ...(heading ? { heading } : {}),
  ...(intro ? { intro } : {}),
  days,
});

/** A card with photos. The editor adds the photo. */
export const photoCard = (title: string, body?: string, cta?: Rec): Rec => ({
  _type: 'photoCard',
  title,
  ...(body ? { body } : {}),
  ...(cta ? { link: cta } : {}),
});

export const photoCards = (heading: string, cards: Rec[], intro?: string): Rec => ({
  _type: 'photoCardsSection',
  ...(heading ? { heading } : {}),
  ...(intro ? { intro } : {}),
  cards,
});
