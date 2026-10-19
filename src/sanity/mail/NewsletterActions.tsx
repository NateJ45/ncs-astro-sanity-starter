// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// "Send a test to me" and "Send to everyone" on a Newsletter (PORTS.md card 127)
// =============================================================================
// Both call /api/studio/newsletter/ with the Studio session (studioApi), and the
// Worker does the rest from the PUBLISHED issue: these buttons send an id, never
// the words. "Send to everyone" asks once, then sends in batches and shows the
// count going up; it keeps asking the Worker for the next batch until the send
// says done. Closing the dialog midway is safe: pressing it again carries on,
// and nobody gets the issue twice (src/lib/mail-newsletter.ts).
//
// Both are off while the issue has unpublished changes or has never been
// published, with a tooltip that says why.
// =============================================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { useClient, type DocumentActionComponent, type DocumentActionDescription } from 'sanity';
import { Box, Button, Card, Flex, Spinner, Stack, Text } from '@sanity/ui';
import { EnvelopeIcon } from '@sanity/icons/Envelope';
import { UsersIcon } from '@sanity/icons/Users';
import { studioApi, WORKFLOW_API_VERSION } from '../workflow/studioApi';

export const NEWSLETTER_API = '/api/studio/newsletter/';

interface Progress {
  status: 'sending' | 'done';
  sent: number;
  failed: number;
  remaining: number;
  total: number;
  startedAt: string;
  finishedAt: string | null;
}

interface Status {
  configured?: boolean;
  subscribers?: number;
  you?: string | null;
  send?: Progress | null;
}

const longDate = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso));

const people = (n: number) => (n === 1 ? '1 person' : `${n.toLocaleString('en-US')} people`);

function blockedReason(props: { draft: unknown; published: unknown }): string | null {
  if (!props.published) return 'Publish the newsletter first. Only the published version is sent.';
  if (props.draft) return 'Publish your changes first. Only the published version is sent.';
  return null;
}

// -----------------------------------------------------------------------------
// Send a test to me
// -----------------------------------------------------------------------------

export const SendTestAction: DocumentActionComponent = (props) => {
  const client = useClient({ apiVersion: WORKFLOW_API_VERSION });
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle');
  const [note, setNote] = useState('');
  const blocked = blockedReason(props);

  return {
    label: state === 'busy' ? 'Sending a test…' : 'Send a test to me',
    icon: EnvelopeIcon,
    disabled: Boolean(blocked) || state === 'busy',
    title: blocked ?? 'Email this issue to yourself, to check it before everyone gets it',
    onHandle: async () => {
      setState('busy');
      const r = await studioApi<{ to?: string }>(client, NEWSLETTER_API, {
        method: 'POST',
        body: { action: 'test', id: props.id },
      });
      if (r.body.ok) {
        setNote(`Sent to ${r.body.to}. It can take a minute to arrive; check spam if it does not.`);
        setState('done');
      } else {
        setNote(
          r.status === 503
            ? 'Email is not set up on this website yet. Ask for help to switch it on.'
            : (r.body.error ?? 'The test did not send. Try again in a minute.'),
        );
        setState('failed');
      }
    },
    dialog:
      state === 'done' || state === 'failed'
        ? {
            type: 'dialog',
            header: state === 'done' ? 'Test sent' : 'The test did not send',
            onClose: () => {
              setState('idle');
              props.onComplete();
            },
            content: (
              <Box padding={4}>
                <Text size={2}>{note}</Text>
              </Box>
            ),
          }
        : null,
  } satisfies DocumentActionDescription;
};

// -----------------------------------------------------------------------------
// Send to everyone
// -----------------------------------------------------------------------------

function SendAllDialog({ id, subject }: { id: string; subject: string }) {
  const client = useClient({ apiVersion: WORKFLOW_API_VERSION });
  const [status, setStatus] = useState<Status | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const stopped = useRef(false);

  useEffect(() => {
    stopped.current = false;
    void studioApi<Status>(client, `${NEWSLETTER_API}?id=${encodeURIComponent(id)}`).then((r) => {
      setStatus(r.status === 503 ? { configured: false } : r.body);
      if (r.body.send) setProgress(r.body.send);
      if (!r.body.ok && r.status !== 503) setError(r.body.error ?? 'Could not reach the website.');
    });
    return () => {
      stopped.current = true;
    };
  }, [client, id]);

  const send = useCallback(async () => {
    setSending(true);
    setError('');
    let action: 'start' | 'continue' = 'start';
    // Each call sends one batch; keep going until the Worker says done.
    for (let guard = 0; guard < 2000 && !stopped.current; guard++) {
      const r = await studioApi<{ progress?: Progress; alreadySent?: boolean }>(
        client,
        NEWSLETTER_API,
        {
          method: 'POST',
          body: { action, id },
        },
      );
      if (!r.body.ok || !r.body.progress) {
        setError(
          r.body.error ??
            'The send stopped. Press the button again to carry on; nobody gets it twice.',
        );
        break;
      }
      setProgress(r.body.progress);
      if (r.body.progress.status === 'done') break;
      action = 'continue';
      // A short pause keeps well inside the providers' rate limits.
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    setSending(false);
  }, [client, id]);

  if (!status) {
    return (
      <Flex justify="center" padding={4}>
        <Spinner muted />
      </Flex>
    );
  }
  if (status.configured === false) {
    return (
      <Card padding={4} tone="caution" radius={2} margin={4}>
        <Text size={2}>
          Email is not set up on this website yet, so the newsletter cannot be sent. Ask for help to
          switch it on.
        </Text>
      </Card>
    );
  }

  const done = progress?.status === 'done';
  const total = progress ? progress.total : (status.subscribers ?? 0);
  return (
    <Stack gap={4} padding={4}>
      {done && progress ? (
        <Card padding={3} radius={2} tone="positive">
          <Text size={2}>
            Sent to {people(progress.sent)} on {longDate(progress.finishedAt ?? progress.startedAt)}
            .
            {progress.failed > 0 &&
              ` ${people(progress.failed)} could not be reached; their email services refused it.`}{' '}
            An issue only ever goes once.
          </Text>
        </Card>
      ) : progress ? (
        <Stack gap={3}>
          <Text size={2}>
            {sending ? 'Sending' : 'Started, not finished'}: {progress.sent} of {total} sent
            {progress.failed > 0 ? `, ${progress.failed} could not be reached` : ''}.
          </Text>
          <Box
            style={{
              height: 8,
              borderRadius: 4,
              background: 'var(--card-border-color)',
              overflow: 'hidden',
            }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total || 1}
            aria-valuenow={progress.sent + progress.failed}
            aria-label="Newsletter sending progress"
          >
            <Box
              style={{
                height: '100%',
                width: `${total ? Math.round(((progress.sent + progress.failed) / total) * 100) : 0}%`,
                background: 'var(--card-focus-ring-color)',
              }}
            />
          </Box>
          {!sending && (
            <Text size={1} muted>
              Press the button to carry on. Nobody who already has it gets it again.
            </Text>
          )}
        </Stack>
      ) : (
        <Text size={2}>
          Send "{subject}" to {people(status.subscribers ?? 0)} who signed up?{' '}
          {status.subscribers ? 'It goes once and cannot be taken back.' : ''}
        </Text>
      )}
      {error && (
        <Card padding={3} radius={2} tone="critical">
          <Text size={2}>{error}</Text>
        </Card>
      )}
      {!done && (status.subscribers ?? 0) > 0 && (
        <Flex gap={2}>
          <Button
            tone="primary"
            icon={UsersIcon}
            text={sending ? 'Sending…' : progress ? 'Carry on sending' : 'Yes, send it to everyone'}
            data-tour="newsletter-send-everyone"
            disabled={sending}
            onClick={() => void send()}
          />
          {sending && <Spinner muted />}
        </Flex>
      )}
      {!done && !status.subscribers && (
        <Text size={2} muted>
          Nobody has signed up yet. Add a newsletter sign-up to a page, and send once people have
          confirmed.
        </Text>
      )}
    </Stack>
  );
}

export const SendAllAction: DocumentActionComponent = (props) => {
  const [open, setOpen] = useState(false);
  const blocked = blockedReason(props);
  const doc = (props.published ?? props.draft) as { subject?: string } | null;
  return {
    label: 'Send to everyone',
    icon: UsersIcon,
    tone: 'primary',
    disabled: Boolean(blocked),
    title: blocked ?? 'Email this issue to everyone on the list. It goes once.',
    onHandle: () => setOpen(true),
    dialog: open
      ? {
          type: 'dialog',
          header: 'Send to everyone',
          onClose: () => {
            setOpen(false);
            props.onComplete();
          },
          content: (
            <SendAllDialog
              id={props.id.replace(/^drafts\./, '')}
              subject={doc?.subject ?? 'this issue'}
            />
          ),
        }
      : null,
  } satisfies DocumentActionDescription;
};
