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
import type { SanityClient } from 'sanity';
import type { CheckGroup } from '../../lib/page-checks';
import type { CheckupRule } from '../../lib/studio-checkup';
import type { QuickFieldKind, StudioTarget } from '../../lib/studio-kit';

/**
 * One recurring job on Home's "This week" card. It is ticked one of three ways
 * (card 111): by a GROQ check (`query`), by the Checkup being clear
 * (`check: 'checkup'`), or by hand (`manual: true`, or no check at all). Hand
 * ticks are kept on one small document per week, so a new week starts fresh.
 */
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
  query?: string;
  /** 'checkup': done when the Checkup has nothing in "Needs doing" (card 111). */
  check?: 'checkup';
  /** Ticked by hand on Home (card 111). Implied when there is no query or check. */
  manual?: boolean;
  /** Where the "Do it" button goes. Optional for hand jobs done outside the Studio. */
  target?: StudioTarget;
  targetLabel?: string;
}

/** One field of a Quick update form (card 111). Plain inputs only; no page builder. */
export interface QuickField {
  /** The key in the values handed to `build`. */
  name: string;
  title: string;
  kind: QuickFieldKind;
  description?: string;
  required?: boolean;
  /** For 'string' and 'text': the most characters allowed. */
  max?: number;
  /** A starting value ("2026-10-18"), worked out when the form opens. */
  initial?: (now: Date) => string;
}

/** What a Quick update form saves: a whole document, without its id. */
export type QuickDoc = { _type: string } & Record<string, unknown>;

/**
 * One big button on the Quick update tool, and the short form behind it
 * (card 111). `build` turns the answers into a whole document; the kit adds the
 * id and publishes it straight away, so build must return a document that is
 * complete and valid for its type (slugs, required fields, defaults).
 */
export interface QuickForm {
  id: string;
  /** "Put up a notice", in the editor's words. */
  title: string;
  detail?: string;
  icon?: ComponentType;
  fields: QuickField[];
  /** The button at the bottom of the form ("Put it on the website"). */
  submitLabel?: string;
  /**
   * The answers (trimmed; a datetime as ISO) to a whole document. May be async, to look
   * something up with the client (the pastor's person id, say).
   */
  build: (
    values: Record<string, string>,
    ctx: { now: Date; client: SanityClient },
  ) => QuickDoc | Promise<QuickDoc>;
  /** One sentence after it is saved ("The notice shows until the day you picked."). */
  doneMessage?: string;
}

/** One large button on Home for a job this site does often (PORTS.md card 110). */
export interface QuickAction {
  /** "Post an announcement", in the editor's words. */
  title: string;
  /** Optional one line under the title. */
  detail?: string;
  /** Where it goes: an intent link (edit a document, create one, open a tool). */
  target: StudioTarget;
  /** An @sanity/icons icon. No emoji. */
  icon?: ComponentType;
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

  /** The card's heading. Default "This week" (card 111). */
  thisWeekTitle?: string;

  /**
   * The Quick update tool's forms (card 111), for the jobs an editor does from a
   * phone. Missing or empty: no tool.
   */
  quickUpdate?: QuickForm[];

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
    /**
     * Guide slugs per document type, for the "Help for this page" panel
     * (card 110). The key '*' is the fallback for any type not listed.
     */
    forType?: Record<string, string[]>;
  };

  /** Home's quick actions, in order. Empty or missing shows the two plain buttons. */
  quickActions?: QuickAction[];

  /** The "Help for this page" panel's page check (card 110). Missing: Checkup findings only. */
  pageCheck?: {
    /** Document types the check reads (the page-builder types). */
    types: string[];
    /** Runs the check over one document (draft first). */
    run: (doc: unknown, client: SanityClient) => Promise<CheckGroup[]>;
  };

  /** How long a rebuild usually takes, for the navbar countdown. Default 3. */
  typicalUpdateMinutes?: number;

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
    /** The status line under the top bar (card 110). Missing counts as on. */
    navbarStatus?: boolean;
    /** The "Help for this page" document panel (card 110). Missing counts as on. */
    helpPanel?: boolean;
    /**
     * Plain words in an empty desk list, and emptyAwareList() (card 111).
     * Missing counts as on.
     */
    emptyStates?: boolean;
  };
}
