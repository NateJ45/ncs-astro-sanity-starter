// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// RSVPs - who is coming to what (PORTS.md card 121)
// =============================================================================
// A tool at the top of the Studio. The left list is every event with an RSVP
// section and its headcount; picking one shows the replies as a table and
// offers "Download for a spreadsheet" (CSV, opens in Excel or Google Sheets)
// for the organiser. Names and emails come from the site's own database
// through /api/studio/rsvps/ and are only ever held in this page's memory.
// =============================================================================
import { useEffect, useState } from 'react';
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
import { DownloadIcon } from '@sanity/icons/Download';
import { studioApi, studioToken, WORKFLOW_API_VERSION } from '../workflow/studioApi';
import { countWords, RSVPS_API, useRsvpOverview, type RsvpOverview } from './rsvpData';

interface ReplyRow {
  id: number;
  received_at: string;
  name: string;
  email: string;
  party_size: number;
  status: string;
  answers: Array<{ label: string; value: string }>;
}

const shortDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(iso),
      )
    : 'No date';

function Replies({ event }: { event: RsvpOverview }) {
  const client = useClient({ apiVersion: WORKFLOW_API_VERSION });
  const [rows, setRows] = useState<ReplyRow[] | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setRows(null);
    setError('');
    void studioApi<{ rows?: ReplyRow[] }>(
      client,
      `${RSVPS_API}?event=${encodeURIComponent(event.key)}`,
    ).then((r) => {
      if (r.status === 503) setError('RSVPs are not switched on for this website yet.');
      else if (!r.body.ok) setError(r.body.error ?? 'The replies could not load.');
      else setRows(r.body.rows ?? []);
    });
  }, [client, event.key]);

  const download = async () => {
    setDownloading(true);
    try {
      const token = studioToken(client);
      const res = await fetch(`${RSVPS_API}?event=${encodeURIComponent(event.key)}&format=csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `rsvps-${
        event.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'event'
      }.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('The download did not work. Try again in a minute.');
    }
    setDownloading(false);
  };

  const labels = rows ? [...new Set(rows.flatMap((r) => r.answers.map((a) => a.label)))] : [];

  return (
    <Stack gap={4}>
      <Flex align="center" justify="space-between" gap={3} wrap="wrap">
        <Stack gap={2}>
          <Heading as="h2" size={2}>
            {event.name}
          </Heading>
          <Text size={1} muted>
            {shortDate(event.startsAt)}. {countWords(event)}.
          </Text>
        </Stack>
        <Button
          icon={DownloadIcon}
          text={downloading ? 'Downloading…' : 'Download for a spreadsheet'}
          mode="ghost"
          disabled={downloading || !rows?.length}
          onClick={() => void download()}
        />
      </Flex>
      {error && (
        <Card padding={3} radius={2} tone="caution">
          <Text size={2}>{error}</Text>
        </Card>
      )}
      {!rows && !error && <Spinner muted />}
      {rows && rows.length === 0 && (
        <Text size={2} muted>
          No replies yet.
        </Text>
      )}
      {rows && rows.length > 0 && (
        <Card radius={2} border overflow="auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {['Name', 'Email', 'How many', 'Status', 'Received', ...labels].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
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
              {rows.map((r) => (
                <tr key={r.id}>
                  {[
                    r.name,
                    r.email,
                    String(r.party_size),
                    r.status === 'waitlist' ? 'Waiting list' : 'Coming',
                    shortDate(r.received_at),
                    ...labels.map((l) => r.answers.find((a) => a.label === l)?.value ?? ''),
                  ].map((v, i) => (
                    <td
                      key={i}
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--card-border-color)',
                        verticalAlign: 'top',
                      }}
                    >
                      {i === 3 ? (
                        <Badge tone={r.status === 'waitlist' ? 'caution' : 'positive'}>{v}</Badge>
                      ) : (
                        <Text size={1}>{v}</Text>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Stack>
  );
}

export function RsvpTool() {
  const state = useRsvpOverview();
  const [picked, setPicked] = useState<string | null>(null);
  const events = state.kind === 'ok' ? state.events : [];
  const current = events.find((e) => e.key === picked) ?? events[0] ?? null;

  return (
    <Card height="fill" overflow="auto" tone="transparent">
      <Container width={3} padding={4} paddingY={5}>
        <Stack gap={5}>
          <Stack gap={3}>
            <Heading as="h1" size={3}>
              RSVPs
            </Heading>
            <Text size={2} muted>
              Who is coming to each event with an RSVP section. Replies are kept privately on the
              website, not in this editor.
            </Text>
          </Stack>
          {state.kind === 'loading' && <Spinner muted />}
          {state.kind === 'failed' && (
            <Card padding={4} radius={2} tone="caution">
              <Text size={2}>The RSVPs could not load just now. Try again in a minute.</Text>
            </Card>
          )}
          {(state.kind === 'off' || (state.kind === 'ok' && events.length === 0)) && (
            <Card padding={4} radius={2} border>
              <Text size={2}>
                No events take RSVPs yet. To add one, open a page, add a section and pick "RSVP (who
                is coming)" under Sign-ups.
              </Text>
            </Card>
          )}
          {events.length > 0 && current && (
            <Flex direction={['column', 'column', 'row']} gap={4} align="flex-start">
              <Stack gap={2} flex={1} style={{ minWidth: 220 }}>
                {events.map((e) => (
                  <Card
                    key={e.key}
                    as="button"
                    padding={3}
                    radius={2}
                    border
                    tone={e.key === current.key ? 'primary' : 'default'}
                    onClick={() => setPicked(e.key)}
                    style={{ textAlign: 'left', cursor: 'pointer' }}
                    aria-pressed={e.key === current.key}
                  >
                    <Stack gap={2}>
                      <Text size={2} weight="semibold">
                        {e.name}
                      </Text>
                      <Text size={1} muted>
                        {shortDate(e.startsAt)}
                      </Text>
                      <Text size={1}>{countWords(e)}</Text>
                    </Stack>
                  </Card>
                ))}
              </Stack>
              <Box flex={2} style={{ minWidth: 0, width: '100%' }}>
                <Replies event={current} />
              </Box>
            </Flex>
          )}
        </Stack>
      </Container>
    </Card>
  );
}
