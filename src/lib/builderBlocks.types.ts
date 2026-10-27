// Safe to edit by hand
// The projected shapes of the builder kit's blocks (builderSections.ts, PORTS.md
// card 173), as SectionRenderer receives them from sectionsProjection() in
// queries.ts: images with their asset resolved and buttons with their page
// resolved. Hand-written like the rest of pageBuilder.types.ts because the
// projection reshapes those fields.

import type { ProjectedCtaBlock, ProjectedImage } from './pageBuilder.types';
import type { RawBusinessFacts } from './business-facts';

/** Portable text as stored; rendered by PortableText. */
type Blocks = unknown[];

interface Base {
  _key: string;
  heading?: string;
  intro?: string;
  look?: string;
}

export interface ProjectedColumnsSection extends Base {
  _type: 'columnsSection';
  textColumns?: { _key: string; heading?: string; body?: Blocks }[];
}

export interface ProjectedButtonRowSection extends Base {
  _type: 'buttonRowSection';
  layout?: string;
  links?: { _key: string; link?: ProjectedCtaBlock | null; note?: string }[];
}

export interface ProjectedPhotoSection {
  _type: 'photoSection';
  _key: string;
  image?: ProjectedImage | null;
  caption?: string;
  look?: string;
}

export interface ProjectedAccordionSection extends Base {
  _type: 'accordionSection';
  items?: { _key: string; question?: string; answer?: Blocks }[];
}

export interface ProjectedTabsSection extends Base {
  _type: 'tabsSection';
  tabs?: { _key: string; label?: string; body?: Blocks }[];
}

/** Opening hours (card 196). `facts` is set only by the styleguide wall's fixture. */
export interface ProjectedHoursSection {
  _type: 'hoursSection';
  _key: string;
  heading?: string;
  intro?: string;
  layout?: 'card' | 'band';
  showAddress?: boolean;
  showChanges?: boolean;
  look?: string;
  facts?: RawBusinessFacts | null;
}

/** Map and directions (card 196). `facts` is set only by the styleguide wall's fixture. */
export interface ProjectedMapSection {
  _type: 'mapSection';
  _key: string;
  heading?: string;
  intro?: string;
  showHours?: boolean;
  look?: string;
  facts?: RawBusinessFacts | null;
}

export interface ProjectedCountdownSection {
  _type: 'countdownSection';
  _key: string;
  eventName?: string;
  startDate?: string;
  endDate?: string;
  intro?: string;
  duringText?: string;
  afterText?: string;
  link?: ProjectedCtaBlock | null;
  look?: string;
}

export interface ProjectedNoticeSection {
  _type: 'noticeSection';
  _key: string;
  message?: string;
  urgency?: string;
  label?: string;
  link?: ProjectedCtaBlock | null;
  startDate?: string;
  endDate?: string;
}

export interface ProjectedTimelineSection extends Base {
  _type: 'timelineSection';
  entries?: {
    _key: string;
    year?: string;
    title?: string;
    text?: string;
    image?: ProjectedImage | null;
  }[];
}

export interface ProjectedLetterSection {
  _type: 'letterSection';
  _key: string;
  eyebrow?: string;
  greeting?: string;
  body?: Blocks;
  signOff?: string;
  signature?: ProjectedImage | null;
  name?: string;
  role?: string;
  link?: ProjectedCtaBlock | null;
  look?: string;
}

export interface ProjectedEventDetailsSection {
  _type: 'eventDetailsSection';
  _key: string;
  eyebrow?: string;
  title?: string;
  occurrences?: {
    _key?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    label?: string;
  }[];
  place?: string;
  note?: string;
  image?: ProjectedImage | null;
  button?: ProjectedCtaBlock | null;
  showCalendar?: boolean;
  look?: string;
}

export interface ProjectedScheduleSection extends Base {
  _type: 'scheduleSection';
  days?: {
    _key: string;
    title?: string;
    items?: { _key: string; startTime?: string; title?: string; note?: string }[];
  }[];
}

export interface ProjectedPhotoCardsSection extends Base {
  _type: 'photoCardsSection';
  cards?: {
    _key: string;
    image?: ProjectedImage | null;
    title?: string;
    body?: string;
    link?: ProjectedCtaBlock | null;
  }[];
}

// ── Card 193 ────────────────────────────────────────────────────────────────

export interface ProjectedContactCardSection extends Base {
  _type: 'contactCardSection';
  callButtons?: boolean;
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
}

export interface ProjectedProgressSection extends Base {
  _type: 'progressSection';
  unit?: string;
  goal?: number;
  raised?: number;
  asOf?: string;
  link?: ProjectedCtaBlock | null;
}

export interface ProjectedNewsletterSection extends Base {
  _type: 'newsletterSection';
  signupUrl?: string;
}

export interface ProjectedCalendarSubscribeSection extends Base {
  _type: 'calendarSubscribeSection';
  feed?: string;
}

export interface ProjectedIconCardsSection extends Base {
  _type: 'iconCardsSection';
  cards?: {
    _key: string;
    icon?: string;
    image?: ProjectedImage | null;
    title?: string;
    body?: string;
    note?: string;
    link?: ProjectedCtaBlock | null;
  }[];
}

export interface ProjectedStepsRailSection extends Base {
  _type: 'stepsRailSection';
  steps?: {
    _key: string;
    icon?: string;
    title?: string;
    body?: string;
    link?: ProjectedCtaBlock | null;
  }[];
  firstStepCard?: boolean;
  endHeading?: string;
  link?: ProjectedCtaBlock | null;
}

export interface ProjectedHubSection extends Base {
  _type: 'hubSection';
  groups?: {
    _key: string;
    title?: string;
    line?: string;
    cards?: {
      _key: string;
      image?: ProjectedImage | null;
      icon?: string;
      title?: string;
      label?: string;
      when?: string;
      place?: string;
      body?: string;
      link?: ProjectedCtaBlock | null;
    }[];
  }[];
}

/** Every builder-kit block, as BuilderBlock.astro receives it. */
export type BuilderPageBlock =
  | ProjectedColumnsSection
  | ProjectedButtonRowSection
  | ProjectedPhotoSection
  | ProjectedAccordionSection
  | ProjectedTabsSection
  | ProjectedCountdownSection
  | ProjectedNoticeSection
  | ProjectedTimelineSection
  | ProjectedLetterSection
  | ProjectedEventDetailsSection
  | ProjectedScheduleSection
  | ProjectedPhotoCardsSection
  | ProjectedHoursSection
  | ProjectedMapSection
  | ProjectedContactCardSection
  | ProjectedProgressSection
  | ProjectedNewsletterSection
  | ProjectedCalendarSubscribeSection
  | ProjectedIconCardsSection
  | ProjectedStepsRailSection
  | ProjectedHubSection;

/** The `_type` of every builder-kit block, for SectionRenderer's one branch. */
export const BUILDER_BLOCK_TYPES: ReadonlySet<string> = new Set<BuilderPageBlock['_type']>([
  'columnsSection',
  'buttonRowSection',
  'photoSection',
  'accordionSection',
  'tabsSection',
  'countdownSection',
  'noticeSection',
  'timelineSection',
  'letterSection',
  'eventDetailsSection',
  'scheduleSection',
  'photoCardsSection',
  'hoursSection',
  'mapSection',
  'contactCardSection',
  'progressSection',
  'newsletterSection',
  'calendarSubscribeSection',
  'iconCardsSection',
  'stepsRailSection',
  'hubSection',
]);

export const isBuilderBlock = (b: { _type: string }): b is BuilderPageBlock =>
  BUILDER_BLOCK_TYPES.has(b._type);
