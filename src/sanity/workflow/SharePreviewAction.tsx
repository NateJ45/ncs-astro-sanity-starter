// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// "Share a preview" - a private link to a page's draft that expires
// (PORTS.md card 117)
// =============================================================================
// The editor picks how long the link should work (1, 3, 7 or 14 days) and gets
// a link someone with no login can open. It shows only THIS page's draft,
// noindex, and the editor can stop it at any time from the same dialog.
//
// How it works, in three steps:
//   1. The dialog writes a share record (previewShare.<random id>) with the
//      page, its preview path and the expiry. The editor's own Studio session
//      writes it; the record holds no secret.
//   2. It asks /api/studio/share-preview/ to sign a link for that record. The
//      Worker checks the editor is a signed-in member, re-reads the record and
//      signs { record, document, path, expiry } with SHARE_PREVIEW_SECRET.
//   3. The link is shown once, to copy. It is never stored. "Stop this link"
//      marks the record stopped, which ends the link on its next page load.
//
// The older "Copy share link" (shareDraftLink.tsx) still exists for a quick
// one-hour look; this is the one to use for "can the board read it this week".
// Only types whose own page the /preview route renders get the action (the
// `shareTypes` option of ncsWorkflowTools in sanity.config.ts).
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import {
  useClient,
  useCurrentUser,
  type DocumentActionComponent,
  type DocumentActionDescription,
} from 'sanity';
import { Box, Button, Card, Flex, Spinner, Stack, Text, TextInput } from '@sanity/ui';
import { ShareIcon } from '@sanity/icons/Share';
import { CopyIcon } from '@sanity/icons/Copy';
import { previewPathFor } from '../components/shareDraftLink';
import {
  expiryFor,
  normaliseSharePath,
  SHARE_DAYS,
  SHARE_RECORD_TYPE,
  shareRecordId,
} from '../../lib/preview-share';
import { studioApi, WORKFLOW_API_VERSION } from './studioApi';

const SHARE_API = '/api/studio/share-preview/';

interface ActiveLink {
  _id: string;
  days?: number;
  expiresAt: string;
  _createdAt: string;
}

const longDate = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso));

function newNonce(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function SharePreviewDialog({
  docId,
  docType,
  title,
  path,
}: {
  docId: string;
  docType: string;
  title: string;
  path: string;
}) {
  const client = useClient({ apiVersion: WORKFLOW_API_VERSION });
  const user = useCurrentUser();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [days, setDays] = useState<number>(7);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [active, setActive] = useState<ActiveLink[] | null>(null);

  const loadActive = useCallback(async () => {
    const rows = await client
      .fetch<ActiveLink[]>(
        `*[_type == $type && docId == $id && revoked != true && expiresAt > now()] | order(expiresAt desc){ _id, days, expiresAt, _createdAt }`,
        { type: SHARE_RECORD_TYPE, id: docId },
        { perspective: 'raw' },
      )
      .catch(() => []);
    setActive(rows);
  }, [client, docId]);

  useEffect(() => {
    void studioApi<{ configured?: boolean }>(client, SHARE_API).then((r) =>
      setConfigured(Boolean(r.body.configured)),
    );
    void loadActive();
  }, [client, loadActive]);

  const make = async () => {
    setBusy(true);
    setNote(null);
    setLink(null);
    setCopied(false);
    const nonce = newNonce();
    const id = shareRecordId(nonce);
    const exp = expiryFor(days, Date.now());
    try {
      await client.create({
        _id: id,
        _type: SHARE_RECORD_TYPE,
        title,
        docId,
        docType,
        path,
        days,
        expiresAt: new Date(exp ?? Date.now()).toISOString(),
        createdBy: user?.id ?? '',
        revoked: false,
      });
    } catch (err) {
      setNote(`Could not make the link: ${err instanceof Error ? err.message : 'unknown error'}`);
      setBusy(false);
      return;
    }
    const r = await studioApi<{ url?: string; expiresAt?: string }>(client, SHARE_API, {
      method: 'POST',
      body: { nonce },
    });
    if (r.body.ok && r.body.url && r.body.expiresAt) {
      setLink({ url: r.body.url, expiresAt: r.body.expiresAt });
    } else {
      // The record is harmless without a signed link, but stop it so the list
      // below never shows a link nobody has.
      await client
        .patch(id)
        .set({ revoked: true })
        .commit()
        .catch(() => undefined);
      setNote(r.body.error ?? 'The website could not sign the link. Try again in a minute.');
    }
    await loadActive();
    setBusy(false);
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
    } catch {
      setNote('Could not copy automatically. Select the link above and copy it by hand.');
    }
  };

  const stop = async (recordId: string) => {
    await client
      .patch(recordId)
      .set({ revoked: true })
      .commit()
      .catch(() => undefined);
    if (link) setLink(null);
    await loadActive();
  };

  if (configured === null) {
    return (
      <Flex justify="center" padding={4}>
        <Spinner muted />
      </Flex>
    );
  }

  if (!configured) {
    return (
      <Card padding={4} tone="caution" radius={2}>
        <Text size={2}>
          Private preview links are not set up on this website yet. Ask for help to switch them on.
          Until then, "Copy share link" makes a link that works for about an hour.
        </Text>
      </Card>
    );
  }

  return (
    <Stack gap={4} padding={4}>
      <Text size={2}>
        Make a link that shows this page's unpublished changes to someone without a Studio login.
        They see only this page, and search engines never see it.
      </Text>

      <Stack gap={2}>
        <Text size={1} weight="semibold">
          How long should it work?
        </Text>
        <Flex gap={2} wrap="wrap" role="radiogroup" aria-label="How long the link works">
          {SHARE_DAYS.map((d) => (
            <Button
              key={d}
              mode={days === d ? 'default' : 'ghost'}
              tone={days === d ? 'primary' : 'default'}
              text={d === 1 ? '1 day' : `${d} days`}
              role="radio"
              aria-checked={days === d}
              onClick={() => setDays(d)}
              disabled={busy}
            />
          ))}
        </Flex>
      </Stack>

      <Flex>
        <Button
          icon={ShareIcon}
          text={busy ? 'Making the link...' : 'Make the link'}
          tone="primary"
          onClick={() => void make()}
          disabled={busy}
        />
      </Flex>

      {link && (
        <Card padding={3} radius={2} tone="positive" border>
          <Stack gap={3}>
            <Text size={1} weight="semibold">
              Here is the link. It works until {longDate(link.expiresAt)}.
            </Text>
            <TextInput
              readOnly
              value={link.url}
              aria-label="The preview link"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Flex gap={2} align="center">
              <Button icon={CopyIcon} text="Copy" onClick={() => void copy()} />
              {copied && (
                <Text size={1} muted>
                  Copied.
                </Text>
              )}
            </Flex>
            <Text size={1} muted>
              This is the only time the link is shown. If you lose it, make a new one.
            </Text>
          </Stack>
        </Card>
      )}

      {note && (
        <Card padding={3} radius={2} tone="critical" border>
          <Text size={1}>{note}</Text>
        </Card>
      )}

      <Stack gap={2}>
        <Text size={1} weight="semibold">
          Links for this page that still work
        </Text>
        {active === null ? (
          <Spinner muted />
        ) : active.length === 0 ? (
          <Text size={1} muted>
            None.
          </Text>
        ) : (
          active.map((a) => (
            <Card key={a._id} padding={2} radius={2} border>
              <Flex align="center" gap={3}>
                <Box flex={1}>
                  <Text size={1}>
                    Made {longDate(a._createdAt)}, works until {longDate(a.expiresAt)}
                  </Text>
                </Box>
                <Button
                  mode="ghost"
                  tone="critical"
                  text="Stop this link"
                  onClick={() => void stop(a._id)}
                />
              </Flex>
            </Card>
          ))
        )}
      </Stack>
    </Stack>
  );
}

/** The document action, for the types listed in `shareTypes`. */
export function makeSharePreviewAction(shareTypes: Set<string>): DocumentActionComponent {
  const SharePreviewAction: DocumentActionComponent = (props) => {
    const [open, setOpen] = useState(false);
    const doc = (props.draft ?? props.published) as Record<string, unknown> | null;
    const path = shareTypes.has(props.type)
      ? normaliseSharePath(previewPathFor(props.type, doc))
      : null;
    if (!path || !doc) return null;
    const title =
      (typeof doc.title === 'string' && doc.title) ||
      (typeof doc.seoTitle === 'string' && doc.seoTitle) ||
      (typeof doc.heroHeadline === 'string' && doc.heroHeadline) ||
      props.type;

    return {
      label: 'Share a preview',
      icon: ShareIcon,
      title: 'Make a private link to this draft that works for a few days',
      onHandle: () => setOpen(true),
      dialog: open
        ? {
            type: 'dialog',
            header: 'Share a preview',
            onClose: () => {
              setOpen(false);
              props.onComplete();
            },
            content: (
              <SharePreviewDialog
                docId={props.id.replace(/^drafts\./, '')}
                docType={props.type}
                title={title}
                path={path}
              />
            ),
          }
        : null,
    } satisfies DocumentActionDescription;
  };
  return SharePreviewAction;
}
