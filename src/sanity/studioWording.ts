// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Safe to edit by hand
// =============================================================================
// The site's own words on Sanity's screens (PORTS.md card 120)
// =============================================================================
// Two supported routes, no CSS:
//   - the workspace `subtitle`, which Sanity prints under the site's name on
//     the sign-in card ("Sign in to edit the website");
//   - an `i18n.bundles` entry in Sanity's "studio" namespace that replaces a
//     handful of its strings: the signed-out notice and the user menu.
//
// What CANNOT be reworded in sanity 6.19 (hard-coded English, no i18n key):
// the "Choose login provider" heading, the "Not authorized" dialog and the
// request-access form. Those stay Sanity's, as do its wordmark and the links
// under the sign-in card (Privacy and Terms are Sanity's own auth terms).
//
// Defaults are neutral and built from the brand name; a site changes any of
// them in src/sanity/studioEdges.config.ts. An upgrade that renames a key just
// shows Sanity's own text again, and studio-wording.test.ts fails so we notice:
// it checks every key here against the INSTALLED sanity's English bundle.
//
// No runtime import from 'sanity' on purpose, so the test can load this file
// in plain Node.
// =============================================================================

import type { LocaleResourceBundle } from 'sanity';

/** The keys this file rewords, all in Sanity's "studio" namespace. */
export const STUDIO_WORD_KEYS = [
  'login.logged-out.title',
  'login.logged-out.generic',
  'login.logged-out.session-expired',
  'user-menu.action.manage-project',
  'user-menu.action.manage-project-aria-label',
  'user-menu.action.invite-members',
  'user-menu.action.invite-members-aria-label',
  'help-resources.title',
] as const;

export type StudioWordKey = (typeof STUDIO_WORD_KEYS)[number];

/** The neutral defaults. `{site}` is replaced with the brand name. */
export const STUDIO_WORDS: Record<StudioWordKey, string> = {
  'login.logged-out.title': 'You have been signed out',
  'login.logged-out.generic': 'Please sign in again to keep working on {site}.',
  'login.logged-out.session-expired':
    'You were signed out after a while away. Sign in again to pick up where you left off.',
  // Appearance, Sign out and the colour scheme names stay Sanity's.
  'user-menu.action.manage-project': 'Manage editors and access',
  'user-menu.action.manage-project-aria-label': 'Manage editors and access',
  'user-menu.action.invite-members': 'Invite someone to edit',
  'user-menu.action.invite-members-aria-label': 'Invite someone to edit',
  // Sanity's own help, as distinct from the site's Guide tool.
  'help-resources.title': 'Sanity help and resources',
};

export interface StudioWordingInput {
  /** The line under the site's name on the sign-in card. */
  loginSubtitle?: string;
  /** Replacements for any key in STUDIO_WORDS (other keys are ignored). */
  words?: Partial<Record<StudioWordKey, string>>;
}

export interface StudioWording {
  subtitle: string;
  bundles: LocaleResourceBundle[];
}

/** The workspace subtitle and the i18n bundle for this site. */
export function studioWording(siteName: string, input: StudioWordingInput = {}): StudioWording {
  const site = siteName.trim() || 'the website';
  const resources: Record<string, string> = {};
  for (const key of STUDIO_WORD_KEYS) {
    const given = input.words?.[key];
    const text = typeof given === 'string' && given.trim() ? given : STUDIO_WORDS[key];
    resources[key] = text.replaceAll('{site}', site);
  }
  return {
    subtitle: input.loginSubtitle?.trim() || 'Sign in to edit the website',
    bundles: [{ locale: 'en-US', namespace: 'studio', resources }],
  };
}
