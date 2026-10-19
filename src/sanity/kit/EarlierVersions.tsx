// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// "Earlier versions": a document inspector (Studio kit, PORTS.md card 125)
// =============================================================================
// Sanity's free plan keeps three days of history. This panel reaches back two
// weeks, to the nightly backups: it lists the nights GitHub still keeps, looks
// for this document in each (on request: it takes a couple of minutes), says
// which fields differ from now, and puts a chosen night's version back as a
// DRAFT. Nothing reaches the website until the editor presses Publish, and the
// Studio's own "Discard changes" undoes it.
//
// It never sees a backup itself. It asks /api/studio/earlier-versions/, which
// asks GitHub Actions (restore-doc.yml) to do the decrypting in CI. Without
// those settings, or for someone who may not edit, it says so and offers to
// ask the site's helper (kit.config.ts helper) instead.
//
// What differs is shown by field NAME (the titles the editor sees in the form)
// and list length only, never the old words: those travel through a log that
// is public on a public repository. The editor sees the words themselves in
// the draft, and in "Review changes", once it is back.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  defineDocumentInspector,
  useClient,
  useEditState,
  useSchema,
  type DocumentInspectorProps,
} from 'sanity';
import { CloseIcon } from '@sanity/icons/Close';
import { CopyIcon } from '@sanity/icons/Copy';
import { RestoreIcon } from '@sanity/icons/Restore';
import { Box, Button, Card, Flex, Spinner, Stack, Text } from '@sanity/ui';
import {
  changesLine,
  nightLabel,
  publishedId,
  type Backup,
  type FoundVersion,
  type RequestState,
  type RestoreResult,
  type ScanResult,
} from '../../lib/earlier-versions';
import { API_VERSION, studioToken, tabStorage } from './shared';
import type { KitConfig } from './types';

export const EARLIER_VERSIONS_NAME = 'ncs-earlier-versions';
const PATH = '/api/studio/earlier-versions/';
const POLL_MS = 8000;
/** Give up waiting after this long and say so (the run may still finish). */
const POLL_LIMIT_MS = 12 * 60 * 1000;

type Setup =
  | { kind: 'loading' }
  | { kind: 'ready'; backups: Backup[] }
  | { kind: 'unavailable'; reason: string };

interface Pending {
  request: string;
  mode: 'scan' | 'restore';
  date?: string;
  startedAt: number;
}

const storeKey = (id: string) => `ncs-earlier-versions:${id}`;

function readPending(id: string): Pending | null {
  try {
    const raw = tabStorage()?.getItem(storeKey(id));
    const p = raw ? (JSON.parse(raw) as Pending) : null;
    return p && Date.now() - p.startedAt < POLL_LIMIT_MS ? p : null;
  } catch {
    return null;
  }
}

function writePending(id: string, p: Pending | null) {
  try {
    const s = tabStorage();
    if (!s) return;
    if (p) s.setItem(storeKey(id), JSON.stringify(p));
    else s.removeItem(storeKey(id));
  } catch {
    /* storage blocked: the panel just forgets on close */
  }
}

function AskHelper({
  config,
  title,
  docId,
  reason,
}: {
  config: KitConfig;
  title: string;
  docId: string;
  reason: string;
}) {
  const [copied, setCopied] = useState(false);
  const details = `Please put back an earlier version of "${title}" (document ${docId}). The version from: [which day?]`;
  const mail = config.helper.email
    ? `mailto:${config.helper.email}?subject=${encodeURIComponent('Please restore an earlier version')}&body=${encodeURIComponent(details)}`
    : null;
  return (
    <Card padding={4} radius={3} border tone="primary">
      <Stack gap={4}>
        <Text size={1} style={{ lineHeight: 1.6 }}>
          {reason}
        </Text>
        <Text size={1} style={{ lineHeight: 1.6 }}>
          {`Ask ${config.helper.name} to restore this. Say which day you want back; the website keeps a backup of every night for two weeks.`}
        </Text>
        <Flex gap={2} wrap="wrap">
          {mail && (
            <Button
              as="a"
              href={mail}
              text={`Email ${config.helper.name}`}
              tone="primary"
              fontSize={1}
            />
          )}
          <Button
            icon={CopyIcon}
            mode="ghost"
            fontSize={1}
            text={copied ? 'Copied' : 'Copy the details'}
            onClick={() => {
              void navigator.clipboard?.writeText(details).then(() => setCopied(true));
            }}
          />
        </Flex>
      </Stack>
    </Card>
  );
}

export function makeEarlierVersions(config: KitConfig) {
  function EarlierVersions({ documentId, documentType, onClose }: DocumentInspectorProps) {
    const id = publishedId(documentId);
    const client = useClient({ apiVersion: API_VERSION });
    const schema = useSchema();
    const edit = useEditState(id, documentType);
    const doc = (edit.draft ?? edit.published) as { title?: unknown } | null;
    const title =
      (typeof doc?.title === 'string' ? doc.title : '') ||
      (schema.get(documentType)?.title ?? 'this page');

    // Field name -> the title the editor sees in the form.
    const fieldTitle = useMemo(() => {
      const fields =
        (
          schema.get(documentType) as {
            fields?: Array<{ name: string; type?: { title?: string } }>;
          }
        )?.fields ?? [];
      const map = new Map(fields.map((f) => [f.name, f.type?.title || f.name]));
      return (name: string) => map.get(name) ?? name;
    }, [schema, documentType]);

    const call = useCallback(
      async (init?: { method: 'POST'; body: unknown }, query = '') => {
        const token = studioToken(client);
        const res = await fetch(`${PATH}${query}`, {
          method: init?.method ?? 'GET',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init ? { 'Content-Type': 'application/json' } : {}),
          },
          body: init ? JSON.stringify(init.body) : undefined,
        });
        const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        return { status: res.status, body };
      },
      [client],
    );

    const [setup, setSetup] = useState<Setup>({ kind: 'loading' });
    const [pending, setPending] = useState<Pending | null>(() => readPending(id));
    const [scan, setScan] = useState<ScanResult | null>(null);
    const [state, setState] = useState<RequestState | null>(null);
    const [note, setNote] = useState<{
      tone: 'positive' | 'critical' | 'caution';
      text: string;
    } | null>(null);
    const [confirm, setConfirm] = useState<FoundVersion | null>(null);

    // The nights GitHub still keeps.
    useEffect(() => {
      let live = true;
      call(undefined, '?backups=1')
        .then(({ status, body }) => {
          if (!live) return;
          if (status === 401 || status === 403) {
            setSetup({
              kind: 'unavailable',
              reason: String(body.error ?? 'You cannot do this from here.'),
            });
          } else if (body.configured === false) {
            setSetup({
              kind: 'unavailable',
              reason: 'Going back further than three days is not switched on for this website yet.',
            });
          } else if (Array.isArray(body.backups)) {
            setSetup({ kind: 'ready', backups: body.backups as Backup[] });
          } else {
            setSetup({ kind: 'unavailable', reason: 'The backups could not be listed just now.' });
          }
        })
        .catch(
          () =>
            live &&
            setSetup({ kind: 'unavailable', reason: 'The backups could not be listed just now.' }),
        );
      return () => {
        live = false;
      };
    }, [call]);

    // Wait for the request to finish.
    useEffect(() => {
      if (!pending) return;
      let live = true;
      const tick = async () => {
        if (!live) return;
        if (Date.now() - pending.startedAt > POLL_LIMIT_MS) {
          setPending(null);
          writePending(id, null);
          setNote({
            tone: 'caution',
            text: 'This is taking much longer than usual. Close the panel and look again in a few minutes.',
          });
          return;
        }
        try {
          const { body } = await call(undefined, `?request=${encodeURIComponent(pending.request)}`);
          if (!live) return;
          const s = body.state as RequestState | undefined;
          setState(s ?? 'running');
          if (s === 'done' || s === 'failed') {
            setPending(null);
            writePending(id, null);
            if (s === 'failed') {
              setNote({
                tone: 'critical',
                text: `That did not work. Nothing was changed. Try again, or ask ${config.helper.name}.`,
              });
            } else if (pending.mode === 'scan') {
              setScan(body.result as ScanResult);
            } else {
              const r = body.result as RestoreResult;
              setNote(
                r?.same
                  ? {
                      tone: 'caution',
                      text: 'That version is the same as now, so nothing changed.',
                    }
                  : {
                      tone: 'positive',
                      text: `Done. The version from ${nightLabel(pending.date ?? '')} is now the draft. Check it, then press Publish. Changed your mind? Use Discard changes in the menu next to Publish.`,
                    },
              );
            }
            return;
          }
        } catch {
          /* a blip: keep waiting */
        }
        timer = setTimeout(tick, POLL_MS);
      };
      let timer = setTimeout(tick, 1500);
      return () => {
        live = false;
        clearTimeout(timer);
      };
    }, [pending, call, id]);

    const start = async (mode: 'scan' | 'restore', version?: FoundVersion) => {
      setNote(null);
      setConfirm(null);
      const { status, body } = await call({
        method: 'POST',
        body:
          mode === 'scan'
            ? { action: 'scan', id }
            : { action: 'restore', id, run: String(version!.run) },
      }).catch(() => ({ status: 0, body: {} as Record<string, unknown> }));
      if (status !== 202 || typeof body.request !== 'string') {
        setNote({
          tone: 'critical',
          text: String(body.error ?? 'That did not start. Check your connection and try again.'),
        });
        return;
      }
      if (mode === 'scan') setScan(null);
      const p: Pending = {
        request: body.request,
        mode,
        date: version?.date,
        startedAt: Date.now(),
      };
      setState('starting');
      setPending(p);
      writePending(id, p);
    };

    const found = (scan?.versions.filter((v) => v.found) ?? []) as FoundVersion[];

    return (
      <Flex direction="column" height="fill" style={{ minHeight: 0 }}>
        <Card borderBottom paddingX={4} paddingY={3} style={{ flexShrink: 0 }}>
          <Flex align="center" gap={2}>
            <Box flex={1}>
              <Text size={1} weight="semibold">
                Earlier versions
              </Text>
            </Box>
            <Button
              icon={CloseIcon}
              mode="bleed"
              onClick={onClose}
              aria-label="Close"
              title="Close"
            />
          </Flex>
        </Card>
        <Box flex={1} padding={4} style={{ overflowY: 'auto' }}>
          <Stack gap={4}>
            <Text size={1} muted style={{ lineHeight: 1.6 }}>
              The Studio's own history keeps the last three days. The website also keeps a backup of
              every night for two weeks, and you can put this page back the way it was on one of
              those nights. It comes back as a draft: nothing changes on the website until you press
              Publish.
            </Text>

            {setup.kind === 'loading' && (
              <Flex gap={2} align="center">
                <Spinner muted />
                <Text size={1} muted>
                  Looking for backups...
                </Text>
              </Flex>
            )}

            {setup.kind === 'unavailable' && (
              <AskHelper config={config} title={title} docId={id} reason={setup.reason} />
            )}

            {setup.kind === 'ready' && setup.backups.length === 0 && (
              <AskHelper
                config={config}
                title={title}
                docId={id}
                reason="There are no nightly backups from the last two weeks to go back to."
              />
            )}

            {setup.kind === 'ready' && setup.backups.length > 0 && (
              <Stack gap={4}>
                <Text size={1} style={{ lineHeight: 1.6 }}>
                  {`${setup.backups.length} nightly backup${setup.backups.length === 1 ? '' : 's'}, from ${nightLabel(setup.backups[setup.backups.length - 1].date)} to ${nightLabel(setup.backups[0].date)}.`}
                </Text>

                {pending ? (
                  <Card padding={3} radius={2} border>
                    <Flex gap={3} align="center">
                      <Spinner muted />
                      <Text size={1} style={{ lineHeight: 1.6 }}>
                        {pending.mode === 'scan'
                          ? 'Looking for this page in the backups. This takes two or three minutes; you can keep working and come back.'
                          : `Putting back the version from ${nightLabel(pending.date ?? '')}. This takes a minute or two.`}
                        {state === 'starting' ? ' Starting...' : ''}
                      </Text>
                    </Flex>
                  </Card>
                ) : (
                  <Button
                    icon={RestoreIcon}
                    text={scan ? 'Look again' : 'Look for this page in the backups'}
                    mode={scan ? 'ghost' : 'default'}
                    tone="primary"
                    fontSize={1}
                    onClick={() => void start('scan')}
                  />
                )}

                {note && (
                  <Card padding={3} radius={2} border tone={note.tone}>
                    <Text size={1} style={{ lineHeight: 1.6 }}>
                      {note.text}
                    </Text>
                  </Card>
                )}

                {scan && !pending && found.length === 0 && (
                  <Text size={1} muted style={{ lineHeight: 1.6 }}>
                    This page is not in any of the backups, which usually means it was made in the
                    last day.
                  </Text>
                )}

                {scan && !pending && found.length > 0 && (
                  <Stack gap={3}>
                    {found.map((v) => (
                      <Card key={v.run} padding={3} radius={2} border>
                        <Stack gap={3}>
                          <Text size={1} weight="semibold">
                            {nightLabel(v.date)}
                          </Text>
                          <Text size={1} muted style={{ lineHeight: 1.6 }}>
                            {v.sameAsNow
                              ? 'The same as now.'
                              : v.sameAsNewer
                                ? 'No change from the night after.'
                                : `Different from now: ${changesLine(v.changes, fieldTitle)}.`}
                            {v.wasDraft ? ' It was an unpublished draft then.' : ''}
                          </Text>
                          {!v.sameAsNow &&
                            (confirm?.run === v.run ? (
                              <Card padding={3} radius={2} tone="caution" border>
                                <Stack gap={3}>
                                  <Text size={1} style={{ lineHeight: 1.6 }}>
                                    {`This makes a draft of the page as it was on ${nightLabel(v.date)}. Any changes you have not published yet are replaced. The website does not change until you press Publish.`}
                                  </Text>
                                  <Flex gap={2} wrap="wrap">
                                    <Button
                                      text="Yes, put it back"
                                      tone="primary"
                                      fontSize={1}
                                      onClick={() => void start('restore', v)}
                                    />
                                    <Button
                                      text="Cancel"
                                      mode="ghost"
                                      fontSize={1}
                                      onClick={() => setConfirm(null)}
                                    />
                                  </Flex>
                                </Stack>
                              </Card>
                            ) : (
                              <Flex>
                                <Button
                                  text="Put this version back as a draft"
                                  mode="ghost"
                                  fontSize={1}
                                  onClick={() => setConfirm(v)}
                                />
                              </Flex>
                            ))}
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
            )}
          </Stack>
        </Box>
      </Flex>
    );
  }

  return defineDocumentInspector({
    name: EARLIER_VERSIONS_NAME,
    useMenuItem: () => ({
      icon: RestoreIcon,
      title: 'Earlier versions',
      showAsAction: false,
    }),
    component: EarlierVersions,
  });
}
