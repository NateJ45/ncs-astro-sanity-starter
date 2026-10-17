// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Move to Trash / Bring it back / Delete forever (Studio kit, 2026-10-17)
// =============================================================================
// Ported from mas-monograms src/sanity/actions/trash.tsx onto @sanity/ui 4.
// Sanity's own Delete is immediate and permanent; the only undo is a dataset
// restore. For everyday lists (kit.config.ts trashTypes) Delete becomes "Move
// to Trash": the item is copied into a `trashedItem` and removed, in ONE
// transaction, and the Trash list on the desk puts it back with one click.
// Only "Delete forever", inside the Trash, for administrators, is final.
//
// The pure rules (what is copied, how it comes back) are in
// src/lib/studio-trash.ts, with tests. Restore uses `create`, never
// `createOrReplace`, so it can never overwrite something made since.
// =============================================================================

import { useState } from 'react';
import {
  defineField,
  defineType,
  useClient,
  type DocumentActionComponent,
  type DocumentActionProps,
} from 'sanity';
import { useToast } from '@sanity/ui/toast';
import { useRouter } from 'sanity/router';
import { RestoreIcon } from '@sanity/icons/Restore';
import { TrashIcon } from '@sanity/icons/Trash';
import {
  REFERRERS_QUERY,
  TRASH_TYPE,
  buildTrashRecord,
  parseTrashPayload,
  publishedId,
  referrersMessage,
  restoreDocs,
} from '../../lib/studio-trash';
import { API_VERSION } from './shared';

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

export function makeMoveToTrashAction(
  kinds: Record<string, string>,
  helperName: string,
): DocumentActionComponent {
  const MoveToTrashAction: DocumentActionComponent = (props: DocumentActionProps) => {
    const { id, type, draft, published, onComplete } = props;
    const client = useClient({ apiVersion: API_VERSION });
    const toast = useToast();
    const [stage, setStage] = useState<'idle' | 'confirm' | 'blocked' | 'busy'>('idle');
    const [blockedBy, setBlockedBy] = useState('');
    const close = () => setStage('idle');

    const moveIt = async () => {
      setStage('busy');
      const pub = publishedId(id);
      try {
        const record = buildTrashRecord(
          type,
          pub,
          published,
          draft,
          new Date().toISOString(),
          kinds[type],
        );
        await client
          .transaction()
          .create(record as { _type: string })
          .delete(pub)
          .delete(`drafts.${pub}`)
          .commit();
        toast.push({
          status: 'success',
          title: 'Moved to Trash',
          description:
            'It comes off the website at the next update. To bring it back, open "Trash (bring things back)" in Content.',
          duration: 12000,
          closable: true,
        });
        onComplete();
      } catch (err) {
        toast.push({
          status: 'error',
          title: 'It could not be moved to Trash',
          description: `Nothing was changed. Please try again, or ask ${helperName}. (${errText(err)})`,
          closable: true,
        });
      } finally {
        setStage('idle');
      }
    };

    return {
      label: stage === 'busy' ? 'Moving to Trash...' : 'Move to Trash',
      icon: TrashIcon,
      tone: 'critical',
      disabled: stage === 'busy' || !(draft || published),
      onHandle: async () => {
        // Check first whether anything still uses it, so removing it does not
        // leave a page pointing at nothing.
        setStage('busy');
        try {
          const pub = publishedId(id);
          const rows = await client.fetch(REFERRERS_QUERY, { id: pub, draftId: `drafts.${pub}` });
          const message = referrersMessage(Array.isArray(rows) ? rows : []);
          if (message) {
            setBlockedBy(message);
            setStage('blocked');
            return;
          }
        } catch {
          // The transaction itself refuses to delete anything still referenced,
          // so going on is safe.
        }
        setStage('confirm');
      },
      dialog:
        stage === 'confirm'
          ? {
              type: 'confirm',
              tone: 'critical',
              message:
                'Move this to Trash? It comes off the website, and you can bring it back from Trash if you change your mind.',
              confirmButtonText: 'Yes, move it to Trash',
              cancelButtonText: 'No, keep it',
              onCancel: close,
              onConfirm: () => void moveIt(),
            }
          : stage === 'blocked'
            ? {
                type: 'dialog',
                header: 'This cannot go in the Trash yet',
                content: (
                  <p style={{ fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>{blockedBy}</p>
                ),
                onClose: close,
              }
            : null,
    };
  };
  MoveToTrashAction.displayName = 'MoveToTrashAction';
  return MoveToTrashAction;
}

export const RestoreAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const { draft, published, onComplete } = props;
  const client = useClient({ apiVersion: API_VERSION });
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const doc = (draft || published) as Record<string, any> | null;

  return {
    label: busy ? 'Bringing it back...' : 'Bring it back',
    icon: RestoreIcon,
    tone: 'primary',
    disabled: busy || !doc?.payload || !doc?.originalId,
    onHandle: async () => {
      if (!doc?.payload || !doc?.originalId) return;
      setBusy(true);
      try {
        const docs = restoreDocs(parseTrashPayload(doc.payload, doc.originalId));
        let tx = client.transaction();
        for (const d of docs) tx = tx.create(d as { _type: string });
        await tx
          .delete(publishedId(doc._id))
          .delete(`drafts.${publishedId(doc._id)}`)
          .commit();
        toast.push({
          status: 'success',
          title: 'It is back',
          description:
            doc.wasPublished === false
              ? 'It is back where it was. It was never on the website, so it still needs Publish.'
              : 'It is back where it was, and on the website again at the next update.',
          duration: 12000,
          closable: true,
        });
        onComplete();
        // Open what came back, rather than leaving the pane on a Trash record
        // that no longer exists.
        if (doc.originalType) {
          router.navigateIntent('edit', { id: doc.originalId, type: doc.originalType });
        }
      } catch (err) {
        toast.push({
          status: 'error',
          title: 'It could not be brought back',
          description: `Nothing was changed. (${errText(err)})`,
          closable: true,
        });
      } finally {
        setBusy(false);
      }
    },
  };
};
RestoreAction.displayName = 'RestoreAction';

export const DeleteForeverAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const { id, onComplete } = props;
  const client = useClient({ apiVersion: API_VERSION });
  const toast = useToast();
  const [stage, setStage] = useState<'idle' | 'first' | 'second' | 'busy'>('idle');
  const close = () => setStage('idle');

  return {
    label: stage === 'busy' ? 'Deleting...' : 'Delete forever',
    icon: TrashIcon,
    tone: 'critical',
    disabled: stage === 'busy',
    onHandle: () => setStage('first'),
    dialog:
      stage === 'first'
        ? {
            type: 'confirm',
            tone: 'critical',
            message: 'Delete this forever? After this it cannot be brought back.',
            confirmButtonText: 'Yes, delete it forever',
            cancelButtonText: 'No, keep it in the Trash',
            onCancel: close,
            onConfirm: () => setStage('second'),
          }
        : stage === 'second'
          ? {
              type: 'confirm',
              tone: 'critical',
              message: 'Are you sure? This is the last question. It will be gone for good.',
              confirmButtonText: 'Delete it forever',
              cancelButtonText: 'Keep it',
              onCancel: close,
              onConfirm: async () => {
                setStage('busy');
                try {
                  const pub = publishedId(id);
                  await client.transaction().delete(pub).delete(`drafts.${pub}`).commit();
                  onComplete();
                } catch (err) {
                  toast.push({
                    status: 'error',
                    title: 'It could not be deleted',
                    description: errText(err),
                    closable: true,
                  });
                } finally {
                  setStage('idle');
                }
              },
            }
          : null,
  };
};
DeleteForeverAction.displayName = 'DeleteForeverAction';

/** What the Trash keeps. The site never reads it; only the Studio does. */
export const trashedItemType = defineType({
  name: TRASH_TYPE,
  title: 'Trash',
  type: 'document',
  icon: TrashIcon,
  readOnly: true,
  fields: [
    defineField({ name: 'title', title: 'Name', type: 'string' }),
    defineField({ name: 'kind', title: 'What it was', type: 'string' }),
    defineField({ name: 'deletedAt', title: 'Moved to Trash', type: 'datetime' }),
    defineField({ name: 'wasPublished', title: 'Was on the website', type: 'boolean' }),
    defineField({ name: 'originalType', title: 'Original type', type: 'string', hidden: true }),
    defineField({ name: 'originalId', title: 'Original id', type: 'string', hidden: true }),
    defineField({ name: 'payload', title: 'Saved copy', type: 'text', hidden: true }),
  ],
  orderings: [
    {
      title: 'Most recent first',
      name: 'deletedAtDesc',
      by: [{ field: 'deletedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title', kind: 'kind', deletedAt: 'deletedAt' },
    prepare: ({ title, kind, deletedAt }) => ({
      title: title || 'Something with no name',
      subtitle: [kind, deletedAt ? new Date(deletedAt).toLocaleDateString() : '']
        .filter(Boolean)
        .join(', '),
    }),
  },
});
