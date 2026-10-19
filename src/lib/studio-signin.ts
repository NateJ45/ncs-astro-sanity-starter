// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Safe to edit by hand (the words); keep the two exports
// =============================================================================
// What the Studio says when the website's own routes cannot tell who is asking
// (PORTS.md card 129). The kit's routes (/api/studio/*) check a Bearer session
// token. A Studio signed in by cookie (Sanity's old default) sends none, so the
// route answers 401. The fix is one sign-out and sign-in, after which the
// Studio holds a token (sanity.config.ts: auth.loginMethod 'token').
// Pure and free of browser code so a unit test can pin the wording.
// =============================================================================

/** Shown when this browser has no session token to send. Plain words, no jargon. */
export const SIGN_IN_ONCE_NOTE =
  'This browser needs a one-time fresh sign-in for this to work. Sign out from the menu at the top right, then sign in again. You will only have to do it once.';

/**
 * The words for a failed call. `hadToken` is whether a Bearer token went with
 * the request; `status` and `serverMessage` are the route's answer. A 401 with
 * no token is the one-time switch; anything else keeps the route's own words.
 */
export function signInNote(
  hadToken: boolean,
  status: number,
  serverMessage: string | undefined,
  fallback: string,
): string {
  if (status === 401 && !hadToken) return SIGN_IN_ONCE_NOTE;
  return serverMessage ?? fallback;
}

/**
 * Types Home's "Recent edits" skips: the Checkup's ignore list plus any types
 * that are bookkeeping, not edits (nightly imports, the kit's weekly ticks).
 * Separate from the Checkup so a type can stay checked yet stay off Home.
 */
export function recentEditsIgnore(
  checkupIgnore: readonly string[],
  recentIgnore: readonly string[] | undefined,
  ...extra: string[]
): string[] {
  return [...new Set([...checkupIgnore, ...(recentIgnore ?? []), ...extra])];
}
