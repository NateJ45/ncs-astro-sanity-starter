// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// shareDraftLink - "Copy share link": show an outside reviewer the DRAFT
// =============================================================================
// The problem this solves. An editor has a page half-rewritten and wants the
// board chair to read it before it goes live. Today the only honest answers are
// "publish it and hope" or "make them a Sanity account". Neither is what they
// asked for.
//
// The mechanism is the one the Presentation tool already uses. Its preview
// iframe reaches /api/draft-mode/enable carrying a one-time secret minted by
// @sanity/preview-url-secret; the endpoint validates the secret against the
// dataset and, only then, sets the perspective cookie that makes every
// /preview/* route render drafts. Nothing about that handshake requires the
// visitor to be logged in to Sanity: it requires the SECRET, which only the
// Studio can mint. So a share link is simply the same URL, minted on demand and
// handed to a human instead of to an iframe.
//
//   /api/draft-mode/enable
//     ?sanity-preview-secret=<minted>
//     &sanity-preview-pathname=/preview/<page>
//
// The endpoint is untouched by this feature and still fails closed: an invalid,
// tampered, or expired secret gets a bare 401 and no cookie.
//
// THE TTL IS ONE HOUR AND CANNOT BE EXTENDED.
// createPreviewSecret() stamps the secret document, and validateSecret() only
// accepts one whose _updatedAt is within SECRET_TTL of now. SECRET_TTL is a
// hard-coded `60 * 60` in @sanity/preview-url-secret/constants; there is no ttl
// option on the create call and no way to widen the validating query, which
// lives inside the package. So the UI says "about an hour" out loud rather than
// letting a reviewer discover it as a 401 tomorrow morning. Minting a fresh
// link is one click, which is the intended answer to an expired one.
//
// (The package also carries a "shared access" singleton with a non-expiring
// secret, toggled by toggle-preview-access-sharing. It is deliberately NOT used
// here: it turns draft preview on for anyone who ever saw any link, forever,
// with no per-link revocation. A one-hour link that an editor re-mints is the
// safer default for a volunteer-run site.)
//
// HTTPS ONLY, on purpose. The enable endpoint sets its cookie with
// `secure: true; sameSite: none` because Presentation loads it cross-context.
// A browser will not store that cookie over plain http, so a share link works
// on the deployed site and not against `http://localhost:4321`. Test share
// links on the deployed origin.
//
// Two surfaces use this module. The document action below is registered in
// sanity.config.ts in every repo, so the link is one click from the edit panel
// and from the desk. Repos that also ship a Presentation page navigator
// (PreviewNavigator.tsx) put a per-row button on it through the same hook.
// =============================================================================
import { useCallback, useState } from 'react';
import { useClient, type DocumentActionComponent, type DocumentActionDescription } from 'sanity';
import { useToast } from '@sanity/ui';
import { ShareIcon } from '@sanity/icons';
import { createPreviewSecret } from '@sanity/preview-url-secret/create-secret';
import {
  urlSearchParamPreviewPathname,
  urlSearchParamPreviewSecret,
} from '@sanity/preview-url-secret/constants';
import { pathForDoc } from '../urls';

/** The API version the secret package itself uses. Matching it avoids a second
 *  client config just to write one document. */
const SECRET_API_VERSION = '2025-02-19';

/** SECRET_TTL in @sanity/preview-url-secret/constants, in minutes. Stated in the
 *  UI copy so nobody has to find out the hard way. */
export const SHARE_LINK_TTL_MINUTES = 60;

/** Human phrase used in every toast and tooltip. One sentence, no jargon. */
export const SHARE_LINK_TTL_PHRASE = 'The link works for about an hour, then it stops.';

/**
 * Live-site path -> draft-preview path. `/` is the one special case: the home
 * preview route is `/preview`, not `/preview/`.
 */
export function previewPathFor(schemaType: string, doc: unknown): string | null {
  const path = pathForDoc(schemaType, doc);
  if (path === null) return null;
  return path === '/' ? '/preview' : `/preview${path}`;
}

/**
 * Mint + copy, with the toast reporting. Returns a `share(previewPathname)`
 * callback and a `sharing` flag for disabling the control while it works.
 *
 * Failure modes are all reported as toasts rather than thrown: this runs behind
 * a button an editor pressed, and a silent no-op is the worst outcome.
 */
export function useShareDraftLink() {
  const client = useClient({ apiVersion: SECRET_API_VERSION });
  const toast = useToast();
  const [sharing, setSharing] = useState(false);

  const share = useCallback(
    async (previewPathname: string, label?: string) => {
      setSharing(true);
      try {
        // Same call Presentation makes. `source` is free-form and shows up on
        // the secret document, which makes a share-minted secret tellable from
        // an iframe-minted one when auditing the dataset. `studioUrl` must be
        // an absolute URL: validatePreviewUrl parses its origin.
        const studioUrl = `${window.location.origin}/studio`;
        const { secret } = await createPreviewSecret(client, 'share-link', studioUrl);

        const url = new URL('/api/draft-mode/enable', window.location.origin);
        url.searchParams.set(urlSearchParamPreviewSecret, secret);
        url.searchParams.set(urlSearchParamPreviewPathname, previewPathname);
        const link = url.toString();

        try {
          await navigator.clipboard.writeText(link);
          toast.push({
            status: 'success',
            title: label ? `Share link copied for ${label}` : 'Share link copied',
            description: `Anyone with this link sees the current draft, no login needed. ${SHARE_LINK_TTL_PHRASE}`,
            duration: 8000,
          });
        } catch {
          // Clipboard permission can be refused, and some browsers drop the
          // "user gesture" that allows a write once an await has happened. The
          // link still exists, so show it instead of losing it.
          toast.push({
            status: 'warning',
            title: 'Could not copy automatically',
            description: `Copy this link by hand: ${link}`,
            duration: 60000,
          });
        }
      } catch (err) {
        toast.push({
          status: 'error',
          title: 'Could not make a share link',
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setSharing(false);
      }
    },
    [client, toast],
  );

  return { share, sharing };
}

/**
 * Document action: "Copy share link". Registered in sanity.config.ts so it sits
 * in the publish menu of every document that has a page of its own. Documents
 * with no public page (site settings, reusable blocks) get no action at all.
 */
export const shareDraftLinkAction: DocumentActionComponent = (props) => {
  const { share, sharing } = useShareDraftLink();
  const doc = props.draft ?? props.published;
  const pathname = previewPathFor(props.type, doc);

  if (!pathname) return null;

  return {
    label: sharing ? 'Making link...' : 'Copy share link',
    icon: ShareIcon,
    disabled: sharing,
    title: `Copy a link that shows this page's draft to someone without a Sanity login. ${SHARE_LINK_TTL_PHRASE}`,
    onHandle: () => {
      void share(pathname);
      props.onComplete?.();
    },
  } satisfies DocumentActionDescription;
};
