// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// The mail pieces Home and the Messages inbox show (PORTS.md card 127)
// =============================================================================
//   NewsletterCard   Home: how many people get the newsletter, and the last
//                    issue that went. "Not set up yet" until the Worker has
//                    the database, a provider and MAIL_SECRET. Card 132: the
//                    kit's card, a display-font figure, the last issue as a row.
//   RsvpComingUp     Inside Home's "Coming up": upcoming events with an RSVP
//                    section and their headcount, as rows with the date on a
//                    stone (card 132).
//   NewsletterBody, RsvpRows  the drawn parts, data by props, for the kit harness.
//   RsvpInboxNote    One line at the top of Messages: "VBS: 34 coming".
// Each fails soft: a quiet sentence, never a blank or a red box.
// =============================================================================
import { useEffect, useState } from 'react';
import { useClient } from 'sanity';
import { Button, Card, Flex, Stack, Text } from '@sanity/ui';
import { studioApi, WORKFLOW_API_VERSION } from '../workflow/studioApi';
import { useStudioLink } from '../kit/shared';
import { NEWSLETTER_API } from './NewsletterActions';
import { countWords, isUpcoming, useRsvpOverview, type RsvpOverview } from './rsvpData';
import {
  ArtRow,
  ArtRows,
  DateBlock,
  Figure,
  KitBox,
  KitLoading,
  KitScope,
  SectionRule,
  StoneTag,
} from '../kit/ui';

/** A link as useStudioLink() makes it (the kit harness passes a dead one). */
interface RowLink {
  href: string;
  onClick?: (e: { preventDefault: () => void; metaKey?: boolean; ctrlKey?: boolean }) => void;
}

export interface ListSummary {
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

/** The newsletter's numbers, drawn (card 132): the display-font figure, then the last issue as a row. */
export function NewsletterBody({ data }: { data: ListSummary }) {
  const n = data.subscribers ?? 0;
  const last = data.recent?.[0];
  return (
    <Stack gap={4}>
      <Figure
        value={n.toLocaleString('en-US')}
        label={`${n === 1 ? 'person gets' : 'people get'} the newsletter`}
        sub={data.pending ? `And ${data.pending} still to confirm their email.` : undefined}
      />
      {last && (
        <ArtRows label="The last issue">
          <ArtRow
            meaning="message"
            title={`"${last.subject}"`}
            meta={
              last.status === 'done'
                ? `Last sent ${day(last.finished_at ?? last.started_at)}, to ${last.sent}`
                : 'Last sent: still sending'
            }
            tag={last.status === 'done' ? undefined : <StoneTag tone="tip">Sending</StoneTag>}
          />
        </ArtRows>
      )}
    </Stack>
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

  // Card 132: the kit's card, in Home's language.
  return (
    <KitScope>
      <KitBox title="Newsletter" meaning="message">
        {state.kind === 'loading' ? (
          <KitLoading />
        ) : state.kind === 'off' ? (
          <Text size={2} muted style={{ lineHeight: 1.6 }}>
            The newsletter is not set up yet. Ask {helperName} to switch it on, and the number of
            people signed up will show here.
          </Text>
        ) : (
          <NewsletterBody data={state.data} />
        )}
      </KitBox>
    </KitScope>
  );
}

/** Upcoming RSVP events, drawn (card 132): the date on a stone, the name, the headcount. */
export function RsvpRows({ events, link }: { events: RsvpOverview[]; link: RowLink }) {
  return (
    <ArtRows label="RSVPs">
      {events.map((e, i) => (
        <ArtRow
          key={e.key}
          lead={e.startsAt ? <DateBlock date={e.startsAt} index={i + 1} /> : undefined}
          meaning="event"
          title={e.name}
          meta={e.startsAt ? `${day(e.startsAt)}, ${countWords(e)}` : countWords(e)}
          href={link.href}
          onClick={link.onClick}
        />
      ))}
    </ArtRows>
  );
}

export function RsvpComingUp() {
  const state = useRsvpOverview();
  const link = useStudioLink()({ tool: 'rsvps' });
  if (state.kind !== 'ok') return null;
  const upcoming = state.events.filter((e) => isUpcoming(e)).slice(0, 4);
  if (!upcoming.length) return null;
  // Inside Home's Coming up card, so already in the kit's scope.
  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 18 }}>
      <SectionRule label="RSVPs" />
      <RsvpRows events={upcoming} link={link} />
    </div>
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
