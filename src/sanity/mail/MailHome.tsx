// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// The mail pieces Home and the Messages inbox show (PORTS.md card 127)
// =============================================================================
//   NewsletterCard   Home: how many people get the newsletter, and the last
//                    issue that went. "Not set up yet" until the Worker has
//                    the database, a provider and MAIL_SECRET.
//   RsvpComingUp     Inside Home's "Coming up": upcoming events with an RSVP
//                    section and their headcount.
//   RsvpInboxNote    One line at the top of Messages: "VBS: 34 coming".
// Each fails soft: a quiet sentence, never a blank or a red box.
// =============================================================================
import { useEffect, useState } from 'react';
import { useClient } from 'sanity';
import { Button, Card, Flex, Heading, Spinner, Stack, Text } from '@sanity/ui';
import { studioApi, WORKFLOW_API_VERSION } from '../workflow/studioApi';
import { useStudioLink } from '../kit/shared';
import { NEWSLETTER_API } from './NewsletterActions';
import { countWords, isUpcoming, useRsvpOverview } from './rsvpData';

interface ListSummary {
  subscribers?: number;
  pending?: number;
  recent?: Array<{
    subject: string;
    status: string;
    sent: number;
    started_at: string;
    finished_at: string | null;
  }>;
}

const day = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(iso));

/** A link to the RSVPs tool, routed inside the Studio. */
function RsvpsButton({ text }: { text: string }) {
  const link = useStudioLink()({ tool: 'rsvps' });
  return (
    <Button
      as="a"
      href={link.href}
      onClick={link.onClick}
      text={text}
      mode="ghost"
      fontSize={1}
      padding={2}
    />
  );
}

export function NewsletterCard({ helperName }: { helperName: string }) {
  const client = useClient({ apiVersion: WORKFLOW_API_VERSION });
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'off' } | { kind: 'ok'; data: ListSummary }
  >({ kind: 'loading' });
  useEffect(() => {
    let live = true;
    void studioApi<ListSummary>(client, NEWSLETTER_API).then((r) => {
      if (!live) return;
      setState(r.body.ok ? { kind: 'ok', data: r.body } : { kind: 'off' });
    });
    return () => {
      live = false;
    };
  }, [client]);

  return (
    <Card padding={4} radius={3} border>
      <Stack gap={4}>
        <Heading as="h2" size={1}>
          Newsletter
        </Heading>
        {state.kind === 'loading' ? (
          <Spinner muted />
        ) : state.kind === 'off' ? (
          <Text size={2} muted style={{ lineHeight: 1.6 }}>
            The newsletter is not set up yet. Ask {helperName} to switch it on, and the number of
            people signed up will show here.
          </Text>
        ) : (
          <Stack gap={3}>
            <Text size={4} weight="semibold">
              {(state.data.subscribers ?? 0).toLocaleString('en-US')}
            </Text>
            <Text size={2} muted>
              {state.data.subscribers === 1 ? 'person gets' : 'people get'} the newsletter
              {state.data.pending ? `, and ${state.data.pending} still to confirm their email` : ''}
              .
            </Text>
            {state.data.recent?.[0] && (
              <Text size={1} muted>
                Last sent: "{state.data.recent[0].subject}",{' '}
                {state.data.recent[0].status === 'done'
                  ? `${day(state.data.recent[0].finished_at ?? state.data.recent[0].started_at)}, to ${state.data.recent[0].sent}`
                  : 'still sending'}
                .
              </Text>
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

export function RsvpComingUp() {
  const state = useRsvpOverview();
  if (state.kind !== 'ok') return null;
  const upcoming = state.events.filter((e) => isUpcoming(e)).slice(0, 4);
  if (!upcoming.length) return null;
  return (
    <Stack gap={3}>
      <Text size={1} weight="semibold">
        RSVPs
      </Text>
      {upcoming.map((e) => (
        <Flex key={e.key} align="center" gap={3}>
          <Stack gap={2} flex={1}>
            <Text size={2} weight="semibold" textOverflow="ellipsis">
              {e.name}
            </Text>
            <Text size={1} muted>
              {day(e.startsAt as string)}, {countWords(e)}
            </Text>
          </Stack>
          <RsvpsButton text="See who" />
        </Flex>
      ))}
    </Stack>
  );
}

export function RsvpInboxNote() {
  const state = useRsvpOverview();
  if (state.kind !== 'ok') return null;
  const upcoming = state.events.filter((e) => isUpcoming(e) && e.replies > 0).slice(0, 3);
  if (!upcoming.length) return null;
  return (
    <Card padding={3} radius={2} tone="primary" border>
      <Flex align="center" gap={3} wrap="wrap">
        <Text size={2} style={{ flex: 1 }}>
          RSVPs: {upcoming.map((e) => `${e.name}, ${countWords(e)}`).join('; ')}.
        </Text>
        <RsvpsButton text="Open RSVPs" />
      </Flex>
    </Card>
  );
}
