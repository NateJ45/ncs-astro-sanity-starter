// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// PrivatePasswordInput - "Set the password" on a private page (PORTS.md card 122)
// =============================================================================
// The custom input for privatePage.password. The editor types a password and
// clicks Save; THIS COMPONENT hashes it in the browser with Web Crypto
// (PBKDF2-SHA256, a random salt; src/lib/private-pages.ts) and writes only the
// hash. The password itself never leaves the editor's computer and is never
// stored anywhere, so nobody can read it back, including us. Forgotten? Set a
// new one; that also signs out everyone who used the old one.
//
// It also shows the page's address, so the editor can copy it to share.
// =============================================================================
import { useState } from 'react';
import { set, unset, useFormValue, type ObjectInputProps } from 'sanity';
import { Box, Button, Flex, Stack, Text, TextInput } from '@sanity/ui';
import {
  hashPassword,
  isPasswordRecord,
  passwordProblem,
  privatePath,
  type PasswordRecord,
} from '../../lib/private-pages';
import { SITE_URL_FOR_PREVIEW } from '../urls';
import { KitNotice, KitScope } from '../kit/ui';

function when(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function PrivatePasswordInput(props: ObjectInputProps) {
  const { onChange, value, readOnly } = props;
  const slug = useFormValue(['slug', 'current']) as string | undefined;
  const [typed, setTyped] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const record = isPasswordRecord(value) ? (value as PasswordRecord) : null;
  const address = slug ? `${SITE_URL_FOR_PREVIEW}${privatePath(slug)}` : null;

  async function save() {
    const problem = passwordProblem(typed);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await hashPassword(typed);
      onChange(set({ _type: 'privatePassword', ...next }));
      setTyped('');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack gap={4}>
      {/* Card 149: the status is the kit's callout, its stone the marker. */}
      <KitScope>
        <KitNotice
          tone={record ? 'tip' : 'careful'}
          title={record ? 'A password is set' : 'No password yet'}
        >
          {record
            ? `${record.setAt ? `Set ${when(record.setAt)}. ` : ''}${
                saved ? 'Publish to use the new one.' : 'Type a new one below to change it.'
              }`
            : 'Nobody can open this page until you set one and publish.'}
        </KitNotice>
      </KitScope>

      {!readOnly && (
        <Stack gap={2}>
          <Flex gap={2} align="center">
            <Box flex={1}>
              <TextInput
                type={show ? 'text' : 'password'}
                value={typed}
                placeholder={record ? 'A new password' : 'A password'}
                autoComplete="new-password"
                onChange={(e) => {
                  setTyped(e.currentTarget.value);
                  setError(null);
                  setSaved(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void save();
                  }
                }}
              />
            </Box>
            <Button mode="ghost" text={show ? 'Hide' : 'Show'} onClick={() => setShow((s) => !s)} />
            <Button
              tone="primary"
              text={record ? 'Change password' : 'Save password'}
              loading={busy}
              disabled={!typed}
              onClick={() => void save()}
            />
          </Flex>
          {error && (
            <Text size={1} style={{ color: 'var(--card-badge-critical-fg-color)' }}>
              {error}
            </Text>
          )}
          <Text size={1} muted>
            At least 8 characters. A short phrase is easiest to share and remember. The password is
            not kept anywhere, so write it down somewhere safe. Changing it means everyone has to
            type the new one.
          </Text>
          {record && (
            <Box>
              <Button
                mode="bleed"
                tone="critical"
                text="Remove the password (nobody can open the page)"
                onClick={() => onChange(unset())}
              />
            </Box>
          )}
        </Stack>
      )}

      {address && (
        <Stack gap={2}>
          <Text size={1} weight="semibold">
            The page&apos;s address, to share with the password
          </Text>
          <Text size={1}>
            <code>{address}</code>
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
