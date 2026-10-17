// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Studio kit: the shape of a site's kit.config.ts
// =============================================================================
// Everything site-specific lives in ONE file per site, src/sanity/kit.config.ts,
// typed by KitConfig below. The kit itself (this folder) names no site, no
// person and no document type, so it can go back to the starter unchanged.
// =============================================================================

import type { ComponentType } from 'react';
import type { CheckupRule } from '../../lib/studio-checkup';
import type { StudioTarget } from '../../lib/studio-kit';

/** One recurring job on Home's "This week" card, ticked by a GROQ check. */
export interface ThisWeekTask {
  id: string;
  /** "Post this week's news", in the editor's words. */
  title: string;
  /** One sentence on how, or why it matters. */
  detail: string;
  /**
   * GROQ answering "is it done?": true or a positive number counts as done.
   * Receives $weekStart (ISO, start of this week) and $now (ISO).
   */
  query: string;
  /** Where the "Do it" button goes. */
  target: StudioTarget;
  targetLabel?: string;
}

/** One stop of the first-run tour. */
export interface TourStep {
  title: string;
  body: string;
}

/** The help guides, as the site's Help & Guide data already holds them. */
export interface KitGuide {
  slug: string;
  category: string;
  title: string;
  lead: string;
  body: unknown[];
}

export interface KitConfig {
  /** The site's name as the editor says it ("the website"). */
  siteName: string;

  /** Who the editor asks for help, and how. */
  helper: {
    name: string;
    /** Optional address for the "Ask" card's email button. Not committed: read from env. */
    email?: string;
  };

  /**
   * Accounts that see the staff view: Sanity user ids (preferred, safe in a
   * public repo) or email addresses. Empty means "anyone who is not a Sanity
   * administrator".
   */
  staff: string[];

  /** Tool names staff see, in order. Everything else is hidden in the staff view. */
  staffTools: string[];

  /** Plain names for tools ({ structure: 'Content' }). */
  toolTitles: Record<string, string>;

  /** Tool order for everyone; unlisted tools keep their place after these. */
  toolOrder: string[];

  /** Desk item ids hidden in the staff view (developer-only lists). */
  staffHiddenPanes: string[];

  /** Document types whose Delete becomes "Move to Trash", with their plain name. */
  trashTypes: Record<string, string>;

  /** The "This week" jobs on Home. Empty hides the card. */
  thisWeek: ThisWeekTask[];

  /** First day of the week for "This week": 0 Sunday, 1 Monday. */
  weekStartsOn: 0 | 1;

  checkup: {
    rules: CheckupRule[];
    /** Types the checkup never looks at (saved presets, notes to self). */
    ignoreTypes: string[];
  };

  guide: {
    guides: KitGuide[];
    categories: readonly string[];
    /** Renders one guide by slug (the site's GuideView). */
    view: (slug: string) => ComponentType;
  };

  tourSteps: TourStep[];

  /** After this many minutes, "on its way" becomes "taking longer than usual". */
  liveSlowAfterMinutes: number;

  /** Per-feature switches. Off means the tool or card is not there at all. */
  features: {
    home: boolean;
    guide: boolean;
    checkup: boolean;
    tour: boolean;
    trash: boolean;
    publishNote: boolean;
    /** Visitors card. False shows a calm "not set up yet" until the route exists. */
    visitors: boolean;
  };
}
