// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words come from kit.config.ts)
// =============================================================================
// Quick update: the jobs an editor does from a phone (Studio kit, card 111)
// =============================================================================
// A few big buttons (kitConfig.quickUpdate), each opening a short form with only
// the fields that job needs: no page builder, no tabs, nothing to scroll past.
// Built for a 375px screen first. Saving PUBLISHES straight away (the whole
// point is "put it up now"), so each form's `build` in kit.config.ts must return
// a complete, valid document; the form checks its own fields first with
// quickFormErrors() (src/lib/studio-kit.ts). Afterwards the editor can open the
// new document in the full editor to add more.
//
// Nothing site-specific here: the forms, their words and their documents all
// come from kit.config.ts.
//
// "Post a photo" (card 125, kit.config.ts postPhoto) is the first button when
// it is set up. It is different on purpose: it saves a DRAFT and the editor
// presses Publish (src/sanity/kit/PostPhoto.tsx).
// =============================================================================

import { useMemo, useState } from 'react';
import { useClient } from 'sanity';
import { Box, Button, Flex, Stack, Text, TextArea, TextInput } from '@sanity/ui';
import { ArrowLeftIcon } from '@sanity/icons/ArrowLeft';
import { BoltIcon } from '@sanity/icons/Bolt';
import { ImageIcon } from '@sanity/icons/Image';
import { PostPhoto } from './PostPhoto';
import { quickFormErrors } from '../../lib/studio-kit';
import { API_VERSION, PUBLISHED_EVENT, ToolHeading, useStudioLink } from './shared';
import { DoneCard, KitAction, KitNotice, KitScope, TileCard } from './ui';
import { liveSteps } from '../../lib/studio-look';
import type { KitConfig, QuickField, QuickForm } from './types';

const INPUT_TYPE: Record<QuickField['kind'], string> = {
  string: 'text',
  text: 'text',
  date: 'date',
  datetime: 'datetime-local',
  url: 'url',
};

/** A datetime-local value ("2026-10-18T09:00") as ISO; anything else unchanged. */
function normalise(field: QuickField, value: string): string {
  const v = value.trim();
  if (field.kind === 'datetime' && v && !Number.isNaN(Date.parse(v))) {
    return new Date(v).toISOString();
  }
  return v;
}

function FieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: QuickField;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const id = `quick-${field.name}`;
  const common = {
    id,
    value,
    fontSize: 3, // 16px or more, so phones do not zoom into the box
    padding: 4,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${id}-error` : undefined,
    customValidity: error,
  } as const;
  return (
    <Stack gap={3}>
      <Text as="label" htmlFor={id} size={2} weight="semibold">
        {field.title}
        {field.required ? '' : ' (if you like)'}
      </Text>
      {field.description && (
        <Text size={1} muted style={{ lineHeight: 1.5 }}>
          {field.description}
        </Text>
      )}
      {field.kind === 'text' ? (
        <TextArea {...common} rows={4} onChange={(e) => onChange(e.currentTarget.value)} />
      ) : (
        <TextInput
          {...common}
          type={INPUT_TYPE[field.kind] as 'text'}
          inputMode={field.kind === 'url' ? 'url' : undefined}
          onChange={(e) => onChange(e.currentTarget.value)}
        />
      )}
      {error && (
        <Text id={`${id}-error`} size={1} style={{ color: 'var(--card-badge-critical-fg-color)' }}>
          {error}
        </Text>
      )}
    </Stack>
  );
}

function QuickFormView({ form, onBack }: { form: QuickForm; onBack: () => void }) {
  const client = useClient({ apiVersion: API_VERSION });
  const linkTo = useStudioLink();
  const start = useMemo(() => new Date(), []);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(form.fields.map((f) => [f.name, f.initial?.(start) ?? ''])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState<{ id: string; type: string } | null>(null);

  const submit = async () => {
    const found = quickFormErrors(form.fields, values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setFailed(false);
    try {
      const clean = Object.fromEntries(
        form.fields.map((f) => [f.name, normalise(f, values[f.name] ?? '')]),
      );
      const doc = await form.build(clean, { now: new Date(), client });
      const id = crypto.randomUUID();
      await client.create({ ...doc, _id: id });
      window.dispatchEvent(new Event(PUBLISHED_EVENT));
      setSaved({ id, type: doc._type });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  if (saved) {
    const open = linkTo({ doc: saved.id, type: saved.type });
    return (
      // Card 131: the path laid so far, Saved and now Building, instead of a green box.
      <KitScope>
        <DoneCard
          states={liveSteps('on-its-way')}
          title="Done. It is published."
          lead={
            form.doneMessage ??
            'The website updates itself in a few minutes. Home shows when it is live.'
          }
        >
          <KitAction strong onClick={onBack}>
            Back to quick updates
          </KitAction>
          <KitAction href={open.href} onClick={open.onClick}>
            Open it in the full editor
          </KitAction>
        </DoneCard>
      </KitScope>
    );
  }

  return (
    <Stack gap={5}>
      <Flex>
        <Button
          icon={ArrowLeftIcon}
          text="Back"
          mode="bleed"
          fontSize={2}
          padding={3}
          onClick={onBack}
        />
      </Flex>
      <Stack gap={3}>
        <Text as="h2" size={4} weight="semibold">
          {form.title}
        </Text>
        {form.detail && (
          <Text size={2} muted style={{ lineHeight: 1.6 }}>
            {form.detail}
          </Text>
        )}
      </Stack>
      {form.fields.map((f) => (
        <FieldInput
          key={f.name}
          field={f}
          value={values[f.name] ?? ''}
          error={errors[f.name]}
          onChange={(v) => setValues((old) => ({ ...old, [f.name]: v }))}
        />
      ))}
      {failed && (
        <KitScope>
          <KitNotice tone="careful" title="That did not save">
            Check your connection and press the button again.
          </KitNotice>
        </KitScope>
      )}
      <Button
        text={busy ? 'Saving...' : (form.submitLabel ?? 'Put it on the website')}
        tone="primary"
        fontSize={2}
        padding={4}
        disabled={busy}
        onClick={() => void submit()}
      />
    </Stack>
  );
}

export function makeQuickUpdateTool(config: KitConfig) {
  const forms = config.quickUpdate ?? [];
  return function QuickUpdateTool() {
    const [open, setOpen] = useState<QuickForm | 'photo' | null>(null);
    const photo = config.postPhoto;
    return (
      <Box padding={[3, 4, 5]} style={{ overflowY: 'auto', height: '100%' }}>
        <Stack gap={5} style={{ maxWidth: 560, margin: '0 auto' }}>
          {open === 'photo' && photo ? (
            <PostPhoto config={photo} onBack={() => setOpen(null)} />
          ) : open && open !== 'photo' ? (
            <QuickFormView key={open.id} form={open} onBack={() => setOpen(null)} />
          ) : (
            <>
              <ToolHeading
                icon={BoltIcon}
                meaning="post"
                label="Quick update"
                lead="The quick jobs, made for a phone. Pick one, fill in a few boxes, and it goes on the website."
              >
                Quick update
              </ToolHeading>
              <KitScope>
                <div style={{ display: 'grid', gap: 14 }}>
                  {photo && (
                    <TileCard
                      dataQuick="post-photo"
                      meaning="image"
                      icon={ImageIcon}
                      title="Post a photo"
                      lead="From your camera or your photos, into a gallery or a new post. Saved as a draft for you to publish."
                      onClick={() => setOpen('photo')}
                    />
                  )}
                  {forms.map((f) => (
                    <TileCard
                      key={f.id}
                      meaning={f.meaning}
                      icon={f.icon}
                      title={f.title}
                      lead={f.detail}
                      onClick={() => setOpen(f)}
                    />
                  ))}
                </div>
              </KitScope>
            </>
          )}
        </Stack>
      </Box>
    );
  };
}
