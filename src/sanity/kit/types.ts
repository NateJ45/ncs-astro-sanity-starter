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
import type { BrandIconKey } from '../../lib/studio-icons';
import type { GallerySpec } from '../../lib/photo-post';

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
  /** Card 131: the site's art for the tile (its stone icon); the icon is the fallback. */
  meaning?: BrandIconKey;
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

/**
 * "Post a photo" on the Quick update tool (card 125): a photo from the phone's
 * camera or gallery, with a required description, added to a gallery on a page
 * or to a new post. Always a DRAFT: the editor presses Publish.
 */
export interface PostPhotoConfig {
  /** Document types whose page builder can hold a gallery ([...PAGE_BUILDER_TYPES]). */
  galleryTypes: string[];
  /** Where a gallery and its photos live. Default: pageBuilder / gallerySection / images / alt / caption. */
  gallery?: Partial<GallerySpec>;
  /** A new post made from the photo, saved as a draft. Missing: galleries only. */
  post?: {
    /** "A new journal post", as the choice reads. */
    label: string;
    /** The document type ("journalEntry"). */
    type: string;
    /**
     * The new post's fields (the kit adds the draft id). `image` is a complete
     * image value with its description; put it in the post's cover image field.
     */
    build: (input: {
      title: string;
      alt: string;
      caption: string;
      image: Record<string, unknown>;
      now: Date;
    }) => QuickDoc;
  };
  /** One line above the picker, for a site rule ("Only post children with a parent's permission."). */
  note?: string;
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

/** One link on Home's "Your pages" card (PORTS.md card 115). */
export interface PageMapLink {
  /** The page's name as the editor knows it ("Plan your visit"). */
  title: string;
  /** Where it goes: usually { doc, type }; a field path (`field`) opens that part. */
  target: StudioTarget;
  /** Optional one line under the name. */
  detail?: string;
  /** An @sanity/icons icon. No emoji. */
  icon?: ComponentType;
}

/** One group on Home's "Your pages" card (PORTS.md card 115). */
export interface PageMapGroup {
  /** "Main pages", "Collections", "Site-wide settings". */
  title: string;
  /** Optional one line under the group's title. */
  detail?: string;
  links?: PageMapLink[];
  /**
   * Also list every document of this type by name, after `links` ('page' for
   * custom pages), so a page built tomorrow shows up without a config change.
   * Pages already linked anywhere on the card are skipped.
   */
  listType?: string;
}

/** One stop of the first-run tour. */
export interface TourStep {
  title: string;
  body: string;
}

/** What the kit hands a site's GuideView (card 128). */
export interface GuideViewProps {
  /** 'panel' in the narrow "Help for this page" inspector. */
  variant?: 'page' | 'panel';
  /** Opens another guide in place (See also). Without it the view decides. */
  onOpen?: (slug: string) => void;
}

/** The help guides, as the site's Help & Guide data already holds them. */
export interface KitGuide {
  slug: string;
  category: string;
  title: string;
  lead: string;
  body: unknown[];
  /**
   * The guide's art (card 128): a name from GUIDE_ICON_MEANINGS in
   * src/lib/studio-look.ts ('clock') or a meaning in the icon registry
   * ('times'). Anything else (an old emoji) draws the guide icon.
   */
  icon?: string;
  /** Who does this job (card 41): drawn as a stone tag under the title. */
  diy?: 'self' | 'ask' | 'mixed';
  /**
   * A short clip showing the job (PORTS.md card 115): a file in public/
   * ("/guides/post-a-notice.mp4"), a YouTube or Vimeo link, or any https
   * address (opens in a new tab). Guides with one show in "Watch how it is
   * done" on Home and in the Site Guide; with none, the row hides itself.
   */
  video?: string;
}

/**
 * Home's banner (card 118): the welcome at the top of Home, on the navbar's deep
 * brand colour. Every field is optional; with none the banner is the date, the
 * greeting, the site's name and "View the website". All paths are files in
 * public/, served from the site itself (the Studio runs at /studio on it).
 */
export interface HomeBannerConfig {
  /** The site's full-colour mark ("/favicon.svg"), drawn on a light disc so it reads on the dark banner. */
  mark?: string;
  /** A light or reversed mark made for dark grounds. When set it is drawn bare instead of `mark`. */
  markOnDark?: string;
  /**
   * A decorative strip along the banner's foot: an SVG in public/, drawn full width at
   * its own proportions (so make it wide and short, about 1000 by 60). Hidden from
   * screen readers.
   */
  motif?: string;
  /** The same strip drawn for a phone (about 390 by 56), used under 600px. Optional. */
  motifNarrow?: string;
  /**
   * The colour of the editor's name in the greeting (a hex). The greeting is set at
   * 24px, so it needs 3:1 on the banner; a colour under that is ignored.
   */
  accent?: string;
  /**
   * Part of the site's name set in the site's own display lettering, as the site
   * sets its headings. The font file is the site's own, in public/. Colours cycle
   * letter by letter, as on the site; any under 3:1 on the banner are left out.
   */
  lettering?: { text: string; family: string; src: string; colors?: string[] };
  /** Where "View the website" goes. Default: the address the Studio is open on. */
  siteUrl?: string;
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

  /** "Post a photo" on the Quick update tool (card 125). Missing: no photo action. */
  postPhoto?: PostPhotoConfig;

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
    /**
     * Renders one guide by slug (the site's GuideView), for the desk and the
     * "Help for this page" panel, which passes variant 'panel' (card 128).
     */
    view: (slug: string) => ComponentType<GuideViewProps>;
    /**
     * Guide slugs per document type, for the "Help for this page" panel
     * (card 110). The key '*' is the fallback for any type not listed.
     */
    forType?: Record<string, string[]>;
  };

  /**
   * Home's "Your pages" card (card 115): every page the editor can change, in
   * groups, each a one-click link. Missing or empty hides the card.
   */
  pages?: PageMapGroup[];

  /**
   * Types Home's "Recent edits" and "Pick up" skip, on top of `checkup.ignoreTypes`
   * (card 129). For documents a script writes (nightly imports) that are not an
   * editor's work but should still be checked. Missing: only the Checkup list.
   */
  recentIgnoreTypes?: string[];

  /** Home's quick actions, in order. Empty or missing shows the two plain buttons. */
  quickActions?: QuickAction[];

  /** Home's banner: the mark, the motif and the lettering (card 118). Missing: the plain banner. */
  homeBanner?: HomeBannerConfig;

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
    /**
     * Visitors card. True asks /api/studio/visitors/ (card 115), which says
     * "not set up yet" itself until the Worker has its Cloudflare settings.
     * False shows that sentence without asking.
     */
    visitors: boolean;
    /**
     * Home's "Coming up" card (card 115): drafts with a "Publish automatically
     * at" time. Missing counts as on; it shows only when some type has publishAt.
     */
    comingUp?: boolean;
    /**
     * The email backbone (card 127): Home's Newsletter card and the RSVP rows in
     * "Coming up". Needs ncsMailTools registered. Missing counts as off.
     */
    mail?: boolean;
    /** The status line under the top bar (card 110). Missing counts as on. */
    navbarStatus?: boolean;
    /** The "Help for this page" document panel (card 110). Missing counts as on. */
    helpPanel?: boolean;
    /**
     * The "Before you publish" document panel (card 123): the Checkup's
     * findings for the open document. Missing counts as on.
     */
    publishPanel?: boolean;
    /**
     * The "Earlier versions" document panel (card 125): the nightly backups,
     * through /api/studio/earlier-versions/. Without the Worker's GitHub
     * settings it offers "Ask <helper> to restore this". Missing counts as on.
     */
    earlierVersions?: boolean;
    /**
     * Plain words in an empty desk list, and emptyAwareList() (card 111).
     * Missing counts as on.
     */
    emptyStates?: boolean;
  };
}
