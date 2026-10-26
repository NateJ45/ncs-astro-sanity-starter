// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// People: invite a helper or an administrator (PORTS.md card 176)
// =============================================================================
// A tool in the top bar for ADMINISTRATORS only (index.tsx adds it by the
// caller's real Sanity role). Three parts, top to bottom:
//   1. Invite someone: name, email, Helper or Administrator, then Send.
//   2. Waiting to accept: pending invitations, each with Send again / Cancel.
//   3. Who can edit the website: the members, what they can do, and a
//      "Simple view" switch for each administrator (card 175: the staff view
//      for an account whatever its role, the Free plan's way to a helper).
// Invitations go through /api/studio/people/ (src/lib/studio-people.ts has the
// rules); the Simple view switch writes the kit's marks document with the
// administrator's own Studio session. Emails are only ever held in this page's
// memory. Where the plan or the setup cannot do something, the tool says so and
// links to sanity.io/manage with the steps, rather than failing.
//
// Per site (kitConfig.people): the role words, the plan, the lead line.
// =============================================================================
import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { useClient } from 'sanity';
import { Box, Button, Card, Flex, Radio, Stack, Switch, Text, TextInput } from '@sanity/ui';
import { studioApi, WORKFLOW_API_VERSION } from '../workflow/studioApi';
import { KitBox, KitLoading, KitNotice, KitScope, StoneTag, ToolHead } from '../kit/ui';
import type { KitConfig } from '../kit/types';
import { cleanMarks, STAFF_DOC_ID, STAFF_TYPE } from '../../lib/studio-kit';
import {
  noHelperSteps,
  planOf,
  roleLabel,
  roleWords,
  validatePeopleRequest,
  type InviteRow,
  type MemberRow,
  type PeopleRoleWords,
  type PlainRole,
  type SanityPlan,
} from '../../lib/studio-people';

export const PEOPLE_API = '/api/studio/people/';

interface Overview {
  ok?: boolean;
  configured?: boolean;
  manageUrl?: string;
  projectId?: string;
  helperAvailable?: boolean;
  members?: MemberRow[];
  invites?: InviteRow[];
}

type Load =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; manageUrl?: string }
  | { kind: 'ready'; data: Overview };

interface Ctx {
  words: PeopleRoleWords;
  plan: SanityPlan;
  siteName: string;
}

const day = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(iso)) : 'Not yet';

function ManageLink({ url, children }: { url?: string; children?: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {children ?? 'Open sanity.io/manage'}
    </a>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol style={{ margin: '8px 0 0', paddingLeft: 20, display: 'grid', gap: 6 }}>
      {items.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ol>
  );
}

function InviteForm({ data, ctx, onDone }: { data: Overview; ctx: Ctx; onDone: () => void }) {
  const client = useClient({ apiVersion: WORKFLOW_API_VERSION });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PlainRole>(
    data.helperAvailable === false ? 'administrator' : 'helper',
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    tone: 'note' | 'careful';
    text: string;
    steps?: string[];
  } | null>(null);
  const helperBlocked = data.helperAvailable === false && role === 'helper';
  const steps = noHelperSteps(data.projectId ?? '', ctx.words, ctx.plan);

  const submit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);
    const v = validatePeopleRequest({ action: 'invite', name, email, role }, ctx.words);
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    setSending(true);
    const r = await studioApi<{
      message?: string;
      errors?: Record<string, string>;
      planLimit?: boolean;
    }>(client, PEOPLE_API, { method: 'POST', body: { ...v.value, plan: ctx.plan } });
    setSending(false);
    if (r.body.ok) {
      setResult({ tone: 'note', text: r.body.message ?? 'Invitation sent.' });
      setName('');
      setEmail('');
      onDone();
    } else {
      if (r.body.errors) setErrors(r.body.errors);
      setResult({
        tone: 'careful',
        text: r.body.error ?? 'That did not work. Try again in a minute.',
        steps: r.body.planLimit ? steps : undefined,
      });
    }
  };

  const fieldError = (key: string) =>
    errors[key] ? (
      <Text size={1} style={{ color: 'var(--card-badge-critical-fg-color, #b42318)' }}>
        {errors[key]}
      </Text>
    ) : null;

  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <Stack gap={4}>
        <Stack gap={2}>
          <Text as="label" htmlFor="people-name" size={1} weight="semibold">
            Their name
          </Text>
          <TextInput
            id="people-name"
            value={name}
            maxLength={80}
            autoComplete="off"
            placeholder="Sam Rivera"
            onChange={(e) => setName(e.currentTarget.value)}
          />
          {fieldError('name')}
        </Stack>
        <Stack gap={2}>
          <Text as="label" htmlFor="people-email" size={1} weight="semibold">
            Their email address
          </Text>
          <Text size={1} muted>
            The one they will sign in with. Sanity sends the invitation here.
          </Text>
          <TextInput
            id="people-email"
            type="email"
            value={email}
            maxLength={254}
            autoComplete="off"
            placeholder="sam@example.com"
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          {fieldError('email')}
        </Stack>
        <Stack gap={3} as="fieldset" style={{ border: 0, margin: 0, padding: 0 }}>
          <Text as="legend" size={1} weight="semibold">
            What can they do?
          </Text>
          {(['helper', 'administrator'] as PlainRole[]).map((key) => (
            <Card
              key={key}
              padding={3}
              radius={2}
              border
              tone={role === key ? 'primary' : 'default'}
            >
              <Flex gap={3} align="flex-start" as="label" style={{ cursor: 'pointer' }}>
                <Radio
                  name="people-role"
                  value={key}
                  checked={role === key}
                  onChange={() => setRole(key)}
                />
                <Stack gap={2}>
                  <Text size={2} weight="semibold">
                    {ctx.words[key].title}
                    {key === 'helper' && data.helperAvailable === false
                      ? ' (not on the free plan)'
                      : ''}
                  </Text>
                  <Text size={1} muted>
                    {ctx.words[key].description}
                  </Text>
                </Stack>
              </Flex>
            </Card>
          ))}
          {fieldError('role')}
        </Stack>
        {helperBlocked && (
          <KitNotice
            tone="tip"
            title={`The free Sanity plan has no ${ctx.words.helper.title} role.`}
          >
            <Steps items={steps} />
          </KitNotice>
        )}
        {result && (
          <KitNotice tone={result.tone} title={result.text}>
            {result.steps?.length ? <Steps items={result.steps} /> : null}
          </KitNotice>
        )}
        <Flex>
          <Button
            type="submit"
            tone="primary"
            text={sending ? 'Sending…' : 'Send the invitation'}
            disabled={sending || helperBlocked}
          />
        </Flex>
        <Text size={1} muted>
          Each person needs their own email address. They pick their own name and password (or sign
          in with Google) when they accept.
        </Text>
      </Stack>
    </form>
  );
}

function InviteList({
  invites,
  ctx,
  onChange,
}: {
  invites: InviteRow[];
  ctx: Ctx;
  onChange: () => void;
}) {
  const client = useClient({ apiVersion: WORKFLOW_API_VERSION });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: 'note' | 'careful'; text: string } | null>(null);

  const act = async (action: 'resend' | 'cancel', id: string) => {
    setBusy(id);
    setNote(null);
    const r = await studioApi<{ message?: string }>(client, PEOPLE_API, {
      method: 'POST',
      body: { action, id, plan: ctx.plan },
    });
    setBusy(null);
    setConfirming(null);
    setNote({
      tone: r.body.ok ? 'note' : 'careful',
      text: r.body.ok ? (r.body.message ?? 'Done.') : (r.body.error ?? 'That did not work.'),
    });
    onChange();
  };

  if (!invites.length)
    return (
      <Text size={2} muted>
        Nobody is waiting. Invitations show here until they are accepted.
      </Text>
    );
  return (
    <Stack gap={3}>
      {note && <KitNotice tone={note.tone} title={note.text} />}
      {invites.map((i) => (
        <Card key={i.id} padding={3} radius={2} border>
          <Flex gap={3} align="center" justify="space-between" wrap="wrap">
            <Stack gap={2}>
              <Text size={2} weight="semibold">
                {i.email}
              </Text>
              <Text size={1} muted>
                {roleLabel(i.roleKey, ctx.words, i.roles)}. Invited {day(i.createdAt)}.
              </Text>
            </Stack>
            {confirming === i.id ? (
              <Flex gap={2} wrap="wrap" align="center">
                <Text size={1}>Cancel this invitation?</Text>
                <Button
                  mode="ghost"
                  tone="critical"
                  text="Yes, cancel it"
                  disabled={busy === i.id}
                  onClick={() => void act('cancel', i.id)}
                />
                <Button mode="bleed" text="Keep it" onClick={() => setConfirming(null)} />
              </Flex>
            ) : (
              <Flex gap={2} wrap="wrap">
                <Button
                  mode="ghost"
                  text={busy === i.id ? 'Sending…' : 'Send again'}
                  disabled={busy === i.id}
                  onClick={() => void act('resend', i.id)}
                />
                <Button mode="bleed" text="Cancel" onClick={() => setConfirming(i.id)} />
              </Flex>
            )}
          </Flex>
        </Card>
      ))}
    </Stack>
  );
}

/** Card 175: the marked ids, read and written with the administrator's own session. */
function useMarks() {
  const client = useClient({ apiVersion: WORKFLOW_API_VERSION });
  const [marks, setMarks] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    client
      .fetch<unknown>(`*[_id == $id][0].ids`, { id: STAFF_DOC_ID })
      .then((ids) => !cancelled && setMarks(cleanMarks(ids)))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [client]);
  const toggle = useCallback(
    async (userId: string, on: boolean) => {
      const id = cleanMarks([userId])[0];
      if (!id) return false;
      try {
        await client.createIfNotExists({ _id: STAFF_DOC_ID, _type: STAFF_TYPE, ids: [] });
        const patch = client.patch(STAFF_DOC_ID).setIfMissing({ ids: [] });
        await (
          on
            ? patch.unset([`ids[@ == "${id}"]`]).append('ids', [id])
            : patch.unset([`ids[@ == "${id}"]`])
        ).commit();
        setMarks((m) => {
          const rest = (m ?? []).filter((v) => v !== id);
          return on ? [...rest, id] : rest;
        });
        return true;
      } catch {
        return false;
      }
    },
    [client],
  );
  return { marks, failed, toggle };
}

function MemberList({
  members,
  manageUrl,
  ctx,
}: {
  members: MemberRow[];
  manageUrl?: string;
  ctx: Ctx;
}) {
  const { marks, failed, toggle } = useMarks();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: 'note' | 'careful'; text: string } | null>(null);

  const flip = async (m: MemberRow, on: boolean) => {
    if (!m.userId) return;
    setBusy(m.userId);
    setNote(null);
    const ok = await toggle(m.userId, on);
    setBusy(null);
    const first = m.name.split(' ')[0];
    setNote(
      ok
        ? {
            tone: 'note',
            text: on
              ? `${first} sees the simple view from their next visit.`
              : `${first} sees the full Studio from their next visit.`,
          }
        : { tone: 'careful', text: 'That did not save. Try again in a minute.' },
    );
  };

  return (
    <Stack gap={3}>
      {note && <KitNotice tone={note.tone} title={note.text} />}
      {members.map((m) => {
        const isAdmin = m.roleKey === 'administrator';
        const marked = Boolean(m.userId && marks?.includes(m.userId));
        return (
          <Card key={m.id} padding={3} radius={2} border>
            <Flex gap={3} align="center" justify="space-between" wrap="wrap">
              <Stack gap={2}>
                <Text size={2} weight="semibold">
                  {m.name}
                  {m.isYou ? ' (you)' : ''}
                </Text>
                <Text size={1} muted>
                  {m.email ? `${m.email}. ` : ''}Last here: {day(m.lastSeenAt)}.
                </Text>
              </Stack>
              <Flex gap={3} align="center" wrap="wrap">
                {isAdmin && m.userId && marks !== null && (
                  <Flex as="label" gap={2} align="center" style={{ cursor: 'pointer' }}>
                    <Switch
                      checked={marked}
                      disabled={busy === m.userId}
                      onChange={() => void flip(m, !marked)}
                    />
                    <Text size={1}>Simple view</Text>
                  </Flex>
                )}
                {!isAdmin && m.roleKey !== 'other' && (
                  <Text size={1} muted>
                    Simple view (always)
                  </Text>
                )}
                <StoneTag tone={isAdmin ? 'careful' : 'note'}>
                  {roleLabel(m.roleKey, ctx.words, m.roles)}
                </StoneTag>
              </Flex>
            </Flex>
          </Card>
        );
      })}
      {failed && (
        <KitNotice tone="careful" title="The Simple view switches did not load.">
          Refresh to try again.
        </KitNotice>
      )}
      <Text size={1} muted>
        Simple view shows fewer tools and no permanent delete. Everyone who is not an{' '}
        {ctx.words.administrator.title.toLowerCase()} has it; turn it on for an{' '}
        {ctx.words.administrator.title.toLowerCase()} who would rather have it too. Anyone can still
        switch to the full Studio for a while from Home.
      </Text>
      <Text size={1} muted>
        To change what someone can do, or to remove them, use Members at{' '}
        <ManageLink url={manageUrl}>sanity.io/manage</ManageLink>. Removing someone never deletes
        what they wrote.
      </Text>
    </Stack>
  );
}

export function makePeopleTool(config: KitConfig) {
  return function PeopleTool() {
    const client = useClient({ apiVersion: WORKFLOW_API_VERSION });
    const [state, setState] = useState<Load>({ kind: 'loading' });
    const ctx = useMemo<Ctx>(
      () => ({
        words: roleWords(config.people?.roles),
        plan: planOf(config.people?.plan),
        siteName: config.siteName,
      }),
      [],
    ); // config is fixed for the Studio's life

    const load = useCallback(() => {
      void studioApi<Overview>(client, `${PEOPLE_API}?plan=${ctx.plan}`).then((r) => {
        if (r.body.ok) setState({ kind: 'ready', data: r.body });
        else
          setState({
            kind: 'error',
            message:
              r.status === 404
                ? 'The People tool is not on this website yet. It arrives with the next update.'
                : (r.body.error ?? 'The list did not load. Try again in a minute.'),
            manageUrl: (r.body as Overview).manageUrl,
          });
      });
    }, [client, ctx.plan]);

    useEffect(load, [load]);

    return (
      <Card height="fill" overflow="auto" tone="transparent">
        <KitScope>
          <Box padding={4} paddingY={5} style={{ maxWidth: 820, margin: '0 auto' }}>
            <Stack gap={5}>
              <ToolHead
                label="People"
                meaning="people"
                title="Add someone to help with the website"
                lead={
                  config.people?.lead ??
                  'Invite someone to edit the website with you. Sanity, the company that runs this editor, emails them a link to join.'
                }
              />
              {state.kind === 'loading' && <KitLoading label="Loading the people list" />}
              {state.kind === 'error' && (
                <KitNotice tone="careful" title={state.message}>
                  {state.manageUrl && (
                    <p>
                      You can still invite people at{' '}
                      <ManageLink url={state.manageUrl}>sanity.io/manage</ManageLink> (Members, then
                      Invite members).
                    </p>
                  )}
                </KitNotice>
              )}
              {state.kind === 'ready' && state.data.configured === false && (
                <KitNotice tone="tip" title="Inviting from here is not switched on yet.">
                  <p>Until it is, you can invite people yourself:</p>
                  <Steps
                    items={[
                      'Open sanity.io/manage and sign in the way you sign in here.',
                      `Pick ${ctx.siteName}'s project, then Members, then Invite members.`,
                      `Type their email address and pick a role: ${
                        ctx.plan === 'free'
                          ? 'Administrator (the free plan has no Editor role)'
                          : `Editor for a ${ctx.words.helper.title}, Administrator for someone who runs everything`
                      }.`,
                      'Press Invite. They get an email with a link to join.',
                    ]}
                  />
                  <p>
                    <ManageLink url={state.data.manageUrl}>Open the Members page</ManageLink>
                  </p>
                </KitNotice>
              )}
              {state.kind === 'ready' && state.data.configured && (
                <>
                  <KitBox title="Invite someone" meaning="people">
                    <InviteForm data={state.data} ctx={ctx} onDone={load} />
                  </KitBox>
                  <KitBox title="Waiting to accept">
                    <InviteList invites={state.data.invites ?? []} ctx={ctx} onChange={load} />
                  </KitBox>
                  <KitBox title="Who can edit the website">
                    <MemberList
                      members={state.data.members ?? []}
                      manageUrl={state.data.manageUrl}
                      ctx={ctx}
                    />
                  </KitBox>
                </>
              )}
            </Stack>
          </Box>
        </KitScope>
      </Card>
    );
  };
}
