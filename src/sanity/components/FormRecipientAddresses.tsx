// Safe to edit by hand
// =============================================================================
// Site settings > Forms > "Where form messages go" (PORTS.md card 174)
// =============================================================================
// For a signed-in ADMINISTRATOR: one row per form (the Contact page form, plus any keys a site
// lists in a `formRecipients` array on the same document) with the email address its messages go
// to, a box to change it, and what is happening with a new one ("waiting for the link to be
// pressed"). Everyone else sees one sentence saying an administrator sets these.
//
// This field stores NOTHING in the dataset: the component never calls onChange. The addresses
// are private and the dataset is public, so the panel talks to the site's own
// /api/studio/form-recipients/ (src/lib/form-recipients.ts), which keeps them in the Worker's D1
// database and checks the session and the administrator role on every call. A new address is
// emailed a link and starts receiving messages only once it is confirmed; without the email
// backbone it is saved as unconfirmed and the panel says so.
//
// The words here are the site's own (this file is not PORTABLE): change them freely.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useClient, useCurrentUser, useFormValue, type StringInputProps } from 'sanity';
import { Badge, Box, Button, Card, Flex, Stack, Text, TextInput } from '@sanity/ui';
import { EnvelopeIcon } from '@sanity/icons/Envelope';
import { studioApi, WORKFLOW_API_VERSION } from '../workflow/studioApi';

const API = '/api/studio/form-recipients/';

/** Who looks after the website's server, in the panel's words. */
const HELPER = 'whoever looks after your website';

interface Row {
  key: string;
  email: string | null;
  pendingEmail: string | null;
  pendingStatus: 'sent' | 'unconfirmed' | null;
}

interface Answer {
  ok?: boolean;
  configured?: boolean;
  canConfirm?: boolean;
  needsMigration?: boolean;
  fallbacks?: Record<string, boolean>;
  rows?: Row[];
  status?: string;
  error?: string;
}

interface Person {
  key: string;
  name: string;
}

const CONTACT: Person = { key: 'contact', name: 'The Contact page form' };

/** The field's input: renders the panel in place of a text box. */
export function FormRecipientAddressesInput(_props: StringInputProps) {
  const user = useCurrentUser();
  const admin = (user?.roles ?? []).some((r) => r.name === 'administrator');
  if (!admin) {
    return (
      <Card padding={3} radius={2} border tone="transparent">
        <Text size={1} muted>
          Where form messages go is set here by an administrator of this Studio. Ask {HELPER} if one
          needs changing.
        </Text>
      </Card>
    );
  }
  return <AdminPanel />;
}

function AdminPanel() {
  const client = useClient({ apiVersion: WORKFLOW_API_VERSION });
  // A site with several forms can list their keys in a `formRecipients` array on this document;
  // the starter has only the Contact form.
  const listed = (useFormValue(['formRecipients']) as { key?: string; name?: string }[]) ?? [];
  const people: Person[] = [
    CONTACT,
    ...listed
      .filter((n) => n?.key && n.key !== CONTACT.key)
      .map((n) => ({ key: n.key as string, name: n.name || (n.key as string) })),
  ];
  const [data, setData] = useState<Answer | null>(null);
  const [message, setMessage] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const r = await studioApi<Answer>(client, API);
    setData({ ...r.body, ok: r.status === 200 && r.body.ok });
  }, [client]);
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (key: string, name: string, action: string, email?: string) => {
    setMessage((m) => ({ ...m, [key]: 'Saving...' }));
    const r = await studioApi<Answer>(client, API, {
      method: 'POST',
      body: { action, key, name, email },
    });
    const b = r.body;
    const words = !b.ok
      ? (b.error ?? 'That did not save. Try again in a minute.')
      : b.status === 'sent'
        ? `Saved. We emailed ${email ?? 'the new address'} a link. Messages start going there once it is pressed; until then they go where they went before.`
        : b.status === 'unconfirmed'
          ? `Saved, but NOT confirmed: email is not set up on the website yet, so no link could be sent and nothing goes to this address. Once ${HELPER} switches email on, press "Send the link again".`
          : b.status === 'cleared'
            ? 'Removed. Messages go to the address set on the website’s server.'
            : 'Saved.';
    setMessage((m) => ({ ...m, [key]: words }));
    await load();
  };

  if (!data) {
    return (
      <Card padding={3} radius={2} border>
        <Text size={1}>Checking where form messages go...</Text>
      </Card>
    );
  }
  if (!data.ok) {
    return (
      <Card padding={3} radius={2} border tone="caution">
        <Text size={1}>
          {data.configured === false
            ? data.needsMigration
              ? `Setting addresses here needs one more step on the website’s server (a database update) by ${HELPER}. Until then, form messages go where they go today.`
              : `Setting addresses here is not switched on yet (the website’s message store is not connected). Until it is, form messages go to the address set on the website’s server.`
            : (data.error ?? 'Could not reach the website. Check the connection and reload.')}
        </Text>
      </Card>
    );
  }

  const rows = new Map((data.rows ?? []).map((r) => [r.key, r]));
  return (
    <Card padding={4} radius={3} border>
      <Stack gap={4}>
        <Flex gap={3} align="flex-start">
          <Text size={3}>
            <EnvelopeIcon />
          </Text>
          <Stack gap={2} flex={1}>
            <Text weight="semibold">Where form messages go</Text>
            <Text size={1} muted>
              Only administrators see this. These addresses are kept on the website&rsquo;s server,
              never in the public site content. A new address gets an email with a link, and
              messages start going to it once the link is pressed.
            </Text>
          </Stack>
        </Flex>
        {!data.canConfirm && (
          <Card padding={3} radius={2} tone="caution">
            <Text size={1}>
              Email is not set up on the website yet, so new addresses cannot be confirmed. You can
              still save one; it waits, unconfirmed, until email is switched on.
            </Text>
          </Card>
        )}
        {people.map((p) => (
          <PersonRow
            key={p.key}
            person={p}
            row={rows.get(p.key) ?? null}
            server={data.fallbacks?.[p.key] === true}
            note={message[p.key]}
            onAct={act}
          />
        ))}
      </Stack>
    </Card>
  );
}

function PersonRow(props: {
  person: Person;
  row: Row | null;
  server: boolean;
  note?: string;
  onAct: (key: string, name: string, action: string, email?: string) => Promise<void>;
}) {
  const { person, row, server, note, onAct } = props;
  const [value, setValue] = useState('');
  const looksOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
  const now = row?.email
    ? `Goes to ${row.email}`
    : server
      ? 'Goes to the address set on the website’s server'
      : person.key === CONTACT.key
        ? 'No address set here or on the website’s server yet'
        : 'Goes to the Contact form’s address';

  return (
    <Card padding={3} radius={2} tone="transparent" border>
      <Stack gap={3}>
        <Flex gap={2} align="center" wrap="wrap">
          <Text weight="semibold">{person.name}</Text>
          {row?.email && <Badge tone="positive">Confirmed</Badge>}
          {!row?.email && server && <Badge tone="default">Set on the server</Badge>}
        </Flex>
        <Text size={1}>{now}</Text>
        {row?.pendingEmail && (
          <Card padding={3} radius={2} tone={row.pendingStatus === 'sent' ? 'primary' : 'caution'}>
            <Stack gap={3}>
              <Text size={1}>
                {row.pendingStatus === 'sent'
                  ? `Waiting for ${row.pendingEmail} to press the link we emailed.`
                  : `${row.pendingEmail} is saved but not confirmed, so nothing goes to it yet.`}
              </Text>
              <Flex gap={2} wrap="wrap">
                <Button
                  text="Send the link again"
                  mode="ghost"
                  onClick={() => void onAct(person.key, person.name, 'resend', row.pendingEmail!)}
                />
                <Button
                  text="Cancel this change"
                  mode="bleed"
                  onClick={() => void onAct(person.key, person.name, 'cancel')}
                />
              </Flex>
            </Stack>
          </Card>
        )}
        <Flex gap={2} wrap="wrap" align="flex-end">
          <Box flex={1} style={{ minWidth: '14rem' }}>
            <TextInput
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="name@example.com"
              aria-label={`New email address for ${person.name}`}
              value={value}
              onChange={(e) => setValue(e.currentTarget.value)}
            />
          </Box>
          <Button
            text="Save this address"
            tone="primary"
            disabled={!looksOk}
            onClick={() => {
              const email = value.trim();
              setValue('');
              void onAct(person.key, person.name, 'set', email);
            }}
          />
          {row?.email && (
            <Button
              text="Remove"
              mode="bleed"
              tone="critical"
              onClick={() => void onAct(person.key, person.name, 'clear')}
            />
          )}
        </Flex>
        {note && (
          <Text size={1} muted>
            {note}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
