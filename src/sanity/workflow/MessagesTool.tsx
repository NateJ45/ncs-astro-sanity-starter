// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Messages - the Studio inbox for form submissions (PORTS.md card 117)
// =============================================================================
// Lists what the website's forms received (from the Worker's D1 database, via
// /api/studio/messages/), newest first, with a status pill per message: New,
// Needs a person, Replied, Spam. A message opens into its detail with "Mark as"
// buttons. The status is stored in D1 next to the message; nothing personal is
// ever written to Sanity.
//
// Prayer requests show only that one arrived (src/lib/studio-messages.ts has
// the rule). With no database bound the tool says "Forms are not set up yet".
// =============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useClient } from 'sanity';
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
} from '@sanity/ui';
import { ArrowLeftIcon } from '@sanity/icons/ArrowLeft';
import { RefreshIcon } from '@sanity/icons/Refresh';
import {
  MESSAGE_STATUSES,
  STATUS_LABELS,
  type MessageDetail,
  type MessageListItem,
  type MessageStatus,
} from '../../lib/studio-messages';
import { studioApi, WORKFLOW_API_VERSION } from './studioApi';
import { RsvpInboxNote } from '../mail/MailHome';

const API = '/api/studio/messages/';

const TONE: Record<MessageStatus, 'primary' | 'caution' | 'positive' | 'default'> = {
  new: 'primary',
  'needs-person': 'caution',
  replied: 'positive',
  spam: 'default',
};

const when = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );

export function StatusPill({ status }: { status: MessageStatus }) {
  return (
    <Badge tone={TONE[status]} fontSize={1} padding={2} radius={4}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

interface ListAnswer {
  configured?: boolean;
  statusReady?: boolean;
  messages?: MessageListItem[];
}

function Detail({
  messageKey,
  statusReady,
  onBack,
  onChanged,
}: {
  messageKey: string;
  statusReady: boolean;
  onBack: () => void;
  onChanged: (key: string, status: MessageStatus) => void;
}) {
  const client = useClient({ apiVersion: WORKFLOW_API_VERSION });
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<MessageStatus | null>(null);

  useEffect(() => {
    void studioApi<{ message?: MessageDetail }>(
      client,
      `${API}?key=${encodeURIComponent(messageKey)}`,
    ).then((r) =>
      r.body.message ? setMessage(r.body.message) : setError(r.body.error ?? 'Not found.'),
    );
  }, [client, messageKey]);

  const mark = async (status: MessageStatus) => {
    setSaving(status);
    const r = await studioApi(client, API, { method: 'POST', body: { key: messageKey, status } });
    setSaving(null);
    if (r.body.ok && message) {
      setMessage({ ...message, status });
      onChanged(messageKey, status);
    } else setError(r.body.error ?? 'That did not save. Try again.');
  };

  return (
    <Stack gap={4}>
      <Flex>
        <Button icon={ArrowLeftIcon} mode="bleed" text="All messages" onClick={onBack} />
      </Flex>
      {!message && !error && <Spinner muted />}
      {error && (
        <Card padding={3} tone="critical" radius={2} border>
          <Text size={1}>{error}</Text>
        </Card>
      )}
      {message && (
        <Card padding={4} radius={3} border>
          <Stack gap={4}>
            <Flex align="center" gap={3} wrap="wrap">
              <Box flex={1}>
                <Heading as="h2" size={2}>
                  {message.from}
                </Heading>
              </Box>
              <StatusPill status={message.status} />
            </Flex>
            <Stack gap={2}>
              <Text size={1} muted>
                {message.form}, received {when(message.receivedAt)}
                {message.emailed ? ', emailed' : ', not emailed'}
              </Text>
              {message.email && (
                <Text size={1}>
                  Reply to: <a href={`mailto:${message.email}`}>{message.email}</a>
                </Text>
              )}
              {message.sentTo && (
                <Text size={1} muted>
                  Sent to {message.sentTo}
                </Text>
              )}
              {message.subject && (
                <Text size={1} weight="semibold">
                  {message.subject}
                </Text>
              )}
            </Stack>
            {message.note && (
              <Card padding={3} radius={2} tone={message.prayer ? 'transparent' : 'caution'} border>
                <Text size={1}>{message.note}</Text>
              </Card>
            )}
            {message.answers.length > 0 && (
              <Stack gap={3}>
                {message.answers.map((a, i) => (
                  <Stack key={i} gap={2}>
                    <Text size={1} weight="semibold">
                      {a.label}
                    </Text>
                    <Text size={2} style={{ whiteSpace: 'pre-wrap' }}>
                      {a.value}
                    </Text>
                  </Stack>
                ))}
              </Stack>
            )}
            <Stack gap={2}>
              <Text size={1} weight="semibold">
                Mark as
              </Text>
              {statusReady ? (
                <Flex gap={2} wrap="wrap">
                  {MESSAGE_STATUSES.map((s) => (
                    <Button
                      key={s}
                      text={STATUS_LABELS[s]}
                      mode={message.status === s ? 'default' : 'ghost'}
                      tone={message.status === s ? TONE[s] : 'default'}
                      disabled={saving !== null || message.status === s}
                      loading={saving === s}
                      onClick={() => void mark(s)}
                    />
                  ))}
                </Flex>
              ) : (
                <Text size={1} muted>
                  Marking messages needs one database update on the website first. Ask for help.
                </Text>
              )}
            </Stack>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

export function MessagesTool() {
  const client = useClient({ apiVersion: WORKFLOW_API_VERSION });
  const [answer, setAnswer] = useState<ListAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MessageStatus | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const r = await studioApi<ListAnswer>(client, API);
    if (r.body.ok) setAnswer(r.body);
    else setError(r.body.error ?? 'The inbox could not load just now.');
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const messages = useMemo(() => answer?.messages ?? [], [answer]);
  const shown = filter === 'all' ? messages : messages.filter((m) => m.status === filter);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: messages.length };
    for (const m of messages) c[m.status] = (c[m.status] ?? 0) + 1;
    return c;
  }, [messages]);

  const changed = (key: string, status: MessageStatus) =>
    setAnswer((a) =>
      a ? { ...a, messages: a.messages?.map((m) => (m.key === key ? { ...m, status } : m)) } : a,
    );

  return (
    <Card height="fill" overflow="auto" tone="transparent">
      <Container width={3} padding={4} paddingY={5}>
        <Stack gap={5}>
          <Flex align="center" gap={3}>
            <Box flex={1}>
              <Heading as="h1" size={4}>
                Messages
              </Heading>
            </Box>
            <Button icon={RefreshIcon} mode="ghost" text="Refresh" onClick={() => void load()} />
          </Flex>
          <Text size={2} muted>
            What people sent through the website's forms. Mark each one so everyone can see what
            still needs an answer.
          </Text>
          {/* RSVP headcounts for upcoming events (card 121); nothing when there are none. */}
          <RsvpInboxNote />

          {error && (
            <Card padding={4} tone="critical" radius={3} border>
              <Text size={2}>{error}</Text>
            </Card>
          )}
          {!answer && !error && (
            <Flex justify="center" padding={5}>
              <Spinner muted />
            </Flex>
          )}

          {answer && !answer.configured && (
            <Card padding={5} radius={3} border tone="transparent">
              <Stack gap={3}>
                <Heading as="h2" size={2}>
                  Forms are not set up yet
                </Heading>
                <Text size={2} muted>
                  The website's forms are not switched on, so there is nothing to show. Once they
                  are, every message lands here as well as in email.
                </Text>
              </Stack>
            </Card>
          )}

          {answer?.configured && open && (
            <Detail
              messageKey={open}
              statusReady={Boolean(answer.statusReady)}
              onBack={() => setOpen(null)}
              onChanged={changed}
            />
          )}

          {answer?.configured && !open && (
            <Stack gap={4}>
              <Flex gap={2} wrap="wrap" role="group" aria-label="Show messages that are">
                {(['all', ...MESSAGE_STATUSES] as const).map((s) => (
                  <Button
                    key={s}
                    mode={filter === s ? 'default' : 'ghost'}
                    text={`${s === 'all' ? 'All' : STATUS_LABELS[s]} (${counts[s] ?? 0})`}
                    onClick={() => setFilter(s)}
                    aria-pressed={filter === s}
                  />
                ))}
              </Flex>
              {shown.length === 0 ? (
                <Text size={2} muted>
                  {messages.length === 0 ? 'No messages yet.' : 'None with that status.'}
                </Text>
              ) : (
                <Card radius={3} border overflow="auto">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['From', 'Which form', 'Received', 'Status'].map((h) => (
                          <th
                            key={h}
                            scope="col"
                            style={{
                              textAlign: 'left',
                              padding: '10px 12px',
                              borderBottom: '1px solid var(--card-border-color)',
                            }}
                          >
                            <Text size={1} weight="semibold">
                              {h}
                            </Text>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((m) => (
                        <tr key={m.key}>
                          <td
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid var(--card-border-color)',
                            }}
                          >
                            <Button
                              mode="bleed"
                              padding={2}
                              text={m.from}
                              onClick={() => setOpen(m.key)}
                              aria-label={`Open the message from ${m.from}`}
                            />
                          </td>
                          <td
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid var(--card-border-color)',
                            }}
                          >
                            <Text size={1}>{m.form}</Text>
                          </td>
                          <td
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid var(--card-border-color)',
                            }}
                          >
                            <Text size={1}>{when(m.receivedAt)}</Text>
                          </td>
                          <td
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid var(--card-border-color)',
                            }}
                          >
                            <StatusPill status={m.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </Stack>
          )}
        </Stack>
      </Container>
    </Card>
  );
}
