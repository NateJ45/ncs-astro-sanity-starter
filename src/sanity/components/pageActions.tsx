// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// pageActions - "Duplicate", "Archive", and "Restore" in the publish menu
// =============================================================================
// Three verbs a page-builder CMS needs and Sanity does not ship in a usable
// form. Registered in sanity.config.ts, they appear in the publish menu of the
// `page` document type and nowhere else.
//
// WHY NOT SANITY'S OWN "Duplicate"? It copies the slug too, so the copy is a
// second document claiming an address that is already taken. The build can only
// emit one of them and which one wins is arbitrary. `duplicatePage()` in
// ../pageOps.ts gives the copy a free address ("about" -> "about-copy") and a
// "... copy" title, so the copy is complete and obviously a copy. The config
// filters the stock action out for `page` and puts this one in its place.
//
// WHY NOT "Delete"? Delete is refused while any other document links to the
// page, and it throws the words away. Archive sets a flag the live-site queries
// skip, so the page leaves the site and stays here in full. Restore is the same
// patch in reverse. Delete is still available for a page that really should go.
//
// BOTH ARCHIVE AND RESTORE NEED A PUBLISH to reach the live site: they patch the
// documents, and the site is rebuilt from published content. The toasts say so.
//
// The logic lives in ../pageOps.ts so the Presentation page navigator (in the
// repos that have one) offers the same verbs from its rows without a second
// implementation.
// =============================================================================
import { useState } from 'react';
import { useClient, type DocumentActionComponent, type DocumentActionDescription } from 'sanity';
import { useToast } from '@sanity/ui';
import { useRouter } from 'sanity/router';
import { CopyIcon, ArchiveIcon, RestoreIcon } from '@sanity/icons';
import { duplicatePage, setPageArchived, type PageOpsClient } from '../pageOps';

const API = { apiVersion: '2026-05-01' } as const;

/** The document types these actions are offered on. `page` is the multi-instance
 *  builder page in every repo in this family; singletons are one-per-site and
 *  must never be duplicated or archived. */
export const PAGE_OPS_TYPES = new Set<string>(['page']);

/** Strip the `drafts.` prefix: every mutation here is keyed by the base id. */
function baseId(id: string): string {
  return id.replace(/^drafts\./, '');
}

/** Duplicate: copy this page into a new draft and open it. */
export const duplicatePageAction: DocumentActionComponent = (props) => {
  const client = useClient(API) as unknown as PageOpsClient;
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (!PAGE_OPS_TYPES.has(props.type)) return null;
  const doc = props.draft ?? props.published;
  if (!doc) return null;

  return {
    label: busy ? 'Copying...' : 'Duplicate',
    icon: CopyIcon,
    disabled: busy,
    title: 'Make a copy of this page as a new draft, at a new web address.',
    onHandle: async () => {
      setBusy(true);
      try {
        const title = (doc as { title?: string }).title || 'Page';
        const newId = await duplicatePage(client, props.type, baseId(props.id), title);
        toast.push({
          status: 'success',
          title: `Copied "${title}"`,
          description: 'The copy is a draft. Change what you need, then Publish it.',
          duration: 8000,
        });
        try {
          router.navigateIntent('edit', { id: newId, type: props.type });
        } catch {
          // Opening the copy is a convenience. The copy exists either way and
          // is at the top of the page list.
        }
      } catch (err) {
        console.error('[pageActions] duplicate failed', err);
        toast.push({ status: 'error', title: 'Could not copy that page. Please try again.' });
      } finally {
        setBusy(false);
        props.onComplete?.();
      }
    },
  } satisfies DocumentActionDescription;
};

/** Archive / Restore: one action that shows whichever verb applies. */
export const archivePageAction: DocumentActionComponent = (props) => {
  const client = useClient(API) as unknown as PageOpsClient;
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (!PAGE_OPS_TYPES.has(props.type)) return null;
  const doc = props.draft ?? props.published;
  if (!doc) return null;

  const archived = (doc as { archived?: boolean }).archived === true;
  const title = (doc as { title?: string }).title || 'this page';

  return {
    label: busy ? 'Working...' : archived ? 'Restore' : 'Archive',
    icon: archived ? RestoreIcon : ArchiveIcon,
    disabled: busy,
    tone: archived ? 'positive' : 'caution',
    title: archived
      ? 'Put this page back on the site. Publish afterwards to make it live.'
      : 'Take this page off the site but keep it here. Publish afterwards to make it live.',
    onHandle: async () => {
      setBusy(true);
      try {
        await setPageArchived(client, baseId(props.id), !archived);
        toast.push({
          status: 'success',
          title: archived ? `Restored "${title}"` : `Archived "${title}"`,
          description: archived
            ? 'It is back on the site. Publish to make that live.'
            : 'It is off the site and kept here. Publish to make that live.',
          duration: 8000,
        });
      } catch (err) {
        console.error('[pageActions] archive failed', err);
        toast.push({ status: 'error', title: 'Could not do that. Please try again.' });
      } finally {
        setBusy(false);
        props.onComplete?.();
      }
    },
  } satisfies DocumentActionDescription;
};
