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
// Card 137: a form may declare a JOB instead of `build` (create, edit, append,
// upload, toggle, schedule), as data; the values are worked out by
// src/lib/studio-quick-jobs.ts. Edit, append, upload and toggle change an
// existing document's published copy (and its draft, if one is open, so the
// two do not drift); create publishes unless `draft: true`; schedule saves a
// draft with its publish time for the publish-due workflow.
//
// Nothing site-specific here: the forms, their words and their documents all
// come from kit.config.ts.
//
// "Post a photo" (card 125, kit.config.ts postPhoto) is the first button when
// it is set up. It is different on purpose: it saves a DRAFT and the editor
// presses Publish (src/sanity/kit/PostPhoto.tsx).
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useClient } from 'sanity';
import type { SanityClient } from 'sanity';
import { Box, Button, Flex, Stack, Text, TextArea, TextInput } from '@sanity/ui';
import { ArrowLeftIcon } from '@sanity/icons/ArrowLeft';
import { BoltIcon } from '@sanity/icons/Bolt';
import { ImageIcon } from '@sanity/icons/Image';
import { PostPhoto } from './PostPhoto';
import { quickFormErrors } from '../../lib/studio-kit';
import {
  answers,
  formValue,
  getPath,
  jobDocument,
  jobItem,
  jobTarget,
  inSeason,
  pickQuery,
  setPath,
  type QuickJob,
} from '../../lib/studio-quick-jobs';
import { API_VERSION, PUBLISHED_EVENT, ToolHeading, useStaffView, useStudioLink } from './shared';
import { TourButton } from './StudioTour';
import { DoneCard, KitAction, KitNotice, KitScope, TileCard } from './ui';
import { liveSteps } from '../../lib/studio-look';
import type { KitConfig, QuickField, QuickForm } from './types';

const INPUT_TYPE: Partial<Record<QuickField['kind'], string>> = {
  string: 'text',
  text: 'text',
  date: 'date',
  datetime: 'datetime-local',
  url: 'url',
  number: 'number',
};

/** The time a schedule job asks for; the kit adds it, the site does not list it. */
const AT_FIELD: QuickField = {
  name: '__publishAt',
  title: 'When should it go up?',
  kind: 'datetime',
  required: true,
  description: 'It is saved now and goes on the website by itself at this time.',
};

/** The fields a form shows: its own, or the one file field of an upload job. */
function formFields(form: QuickForm): QuickField[] {
  const job = form.job;
  if (job?.kind === 'upload') {
    return [
      {
        name: '__file',
        title: job.asset === 'image' ? 'The picture' : 'The file',
        kind: job.asset,
        required: true,
        accept: job.accept,
        path: job.field,
      },
    ];
  }
  if (job?.kind === 'toggle') return [];
  const own = form.fields ?? [];
  return job?.kind === 'schedule' ? [...own, AT_FIELD] : own;
}

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
  onFile,
}: {
  field: QuickField;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onFile: (f: File | null) => void;
}) {
  const id = `quick-${field.name}`;
  const describedBy = error ? `${id}-error` : undefined;
  const common = {
    id,
    value,
    fontSize: 3, // 16px or more, so phones do not zoom into the box
    padding: 4,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy,
    customValidity: error,
  } as const;
  const big = { fontSize: 16, minHeight: 48 } as const;
  let input;
  if (field.kind === 'text') {
    input = <TextArea {...common} rows={4} onChange={(e) => onChange(e.currentTarget.value)} />;
  } else if (field.kind === 'boolean') {
    input = (
      <label htmlFor={id} style={{ display: 'flex', gap: 12, alignItems: 'center', ...big }}>
        <input
          id={id}
          type="checkbox"
          checked={value === 'true'}
          onChange={(e) => onChange(e.currentTarget.checked ? 'true' : 'false')}
          style={{ width: 24, height: 24 }}
        />
        <span>{field.description ?? 'Yes'}</span>
      </label>
    );
  } else if (field.kind === 'select') {
    input = (
      <select
        id={id}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.currentTarget.value)}
        style={{ ...big, padding: '10px 12px', borderRadius: 4, width: '100%' }}
      >
        <option value="">Choose one</option>
        {(field.options ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.title}
          </option>
        ))}
      </select>
    );
  } else if (field.kind === 'file' || field.kind === 'image') {
    input = (
      <input
        id={id}
        type="file"
        accept={field.accept ?? (field.kind === 'image' ? 'image/*' : undefined)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        onChange={(e) => onFile(e.currentTarget.files?.[0] ?? null)}
        style={{ ...big, width: '100%' }}
      />
    );
  } else {
    input = (
      <TextInput
        {...common}
        type={(INPUT_TYPE[field.kind] ?? 'text') as 'text'}
        inputMode={field.kind === 'url' ? 'url' : field.kind === 'number' ? 'decimal' : undefined}
        onChange={(e) => onChange(e.currentTarget.value)}
      />
    );
  }
  return (
    <Stack gap={3} data-tour={`quick-field-${field.name}`}>
      {field.kind === 'boolean' ? (
        <Text size={2} weight="semibold">
          {field.title}
        </Text>
      ) : (
        <Text as="label" htmlFor={id} size={2} weight="semibold">
          {field.title}
          {field.required ? '' : ' (if you like)'}
        </Text>
      )}
      {field.description && field.kind !== 'boolean' && (
        <Text size={1} muted style={{ lineHeight: 1.5 }}>
          {field.description}
        </Text>
      )}
      {input}
      {error && (
        <Text id={`${id}-error`} size={1} style={{ color: 'var(--card-badge-critical-fg-color)' }}>
          {error}
        </Text>
      )}
    </Stack>
  );
}

type Patch = ReturnType<SanityClient['patch']>;

/** Patch the published copy, and the draft too when one is open, so they agree. */
async function patchBoth(
  client: SanityClient,
  id: string,
  type: string,
  apply: (p: Patch) => Patch,
) {
  const draft = await client.getDocument(`drafts.${id}`);
  const tx = client.transaction().createIfNotExists({ _id: id, _type: type });
  tx.patch(apply(client.patch(id)));
  if (draft) tx.patch(apply(client.patch(`drafts.${id}`)));
  await tx.commit();
}

/** Run a card 137 job. Returns the document to open afterwards and whether it went live. */
async function runJob(
  client: SanityClient,
  job: QuickJob,
  fields: QuickField[],
  values: Record<string, string>,
  files: Record<string, File>,
  current: Record<string, unknown> | null,
): Promise<{ id: string; type: string; live: boolean }> {
  const assets: Record<string, string> = {};
  for (const f of fields) {
    const file = files[f.name];
    if (file && (f.kind === 'file' || f.kind === 'image')) {
      const a = await client.assets.upload(f.kind, file, { filename: file.name });
      assets[f.name] = a._id;
    }
  }
  const own = fields.filter((f) => f !== AT_FIELD);
  switch (job.kind) {
    case 'create':
    case 'schedule': {
      const doc = jobDocument(job, own, values, assets);
      const id = crypto.randomUUID();
      if (job.kind === 'schedule') {
        setPath(doc, job.at ?? 'publishAt', new Date(values[AT_FIELD.name]).toISOString());
        await client.create({ ...doc, _id: `drafts.${id}` });
        return { id, type: job.type, live: false };
      }
      await client.create({ ...doc, _id: job.draft ? `drafts.${id}` : id });
      return { id, type: job.type, live: !job.draft };
    }
    case 'edit':
    case 'upload': {
      const set = answers(own, values, assets);
      // An emptied box clears the field (files and switches are always set).
      const unset = own
        .filter((f) => f.kind !== 'file' && f.kind !== 'image' && f.kind !== 'boolean')
        .map((f) => f.path ?? f.name)
        .filter((p) => !(p in set));
      const id = job.doc ?? '';
      const type = job.type ?? (job.kind === 'edit' ? job.pick?.type : undefined) ?? id;
      await patchBoth(client, id, type, (p) =>
        unset.length ? p.set(set).unset(unset) : p.set(set),
      );
      return { id, type, live: true };
    }
    case 'append': {
      const item = jobItem(job, own, values, assets);
      const where = `${job.array}${job.at === 'end' ? '[-1]' : '[0]'}`;
      await patchBoth(client, job.doc, job.type ?? job.doc, (p) =>
        p
          .setIfMissing({ [job.array]: [] })
          .insert(job.at === 'end' ? 'after' : 'before', where, [item]),
      );
      return { id: job.doc, type: job.type ?? job.doc, live: true };
    }
    case 'link':
      throw new Error('A link job has no form.');
    case 'toggle': {
      const on = getPath(current, job.field) === true;
      await patchBoth(client, job.doc, job.type ?? job.doc, (p) => p.set({ [job.field]: !on }));
      return { id: job.doc, type: job.type ?? job.doc, live: true };
    }
  }
}

/** An edit job with `pick`: the list of documents to choose from (card 137). */
function PickList({
  pick,
  onPick,
}: {
  pick: NonNullable<Extract<QuickJob, { kind: 'edit' }>['pick']>;
  onPick: (id: string) => void;
}) {
  const client = useClient({ apiVersion: API_VERSION });
  const [rows, setRows] = useState<{ _id: string; title: string }[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let gone = false;
    client
      .fetch<{ _id: string; title: string }[]>(pickQuery(pick), { type: pick.type })
      .then((r) => !gone && setRows(r))
      .catch(() => !gone && setFailed(true));
    return () => {
      gone = true;
    };
  }, [client, pick]);
  if (failed)
    return <Text size={2}>The list did not load. Check your connection and go back.</Text>;
  if (!rows)
    return (
      <Text size={2} muted>
        Getting the list...
      </Text>
    );
  if (!rows.length) return <Text size={2}>There is nothing to choose from yet.</Text>;
  return (
    <Stack gap={3} data-tour="quick-pick">
      <Text size={2} weight="semibold">
        {pick.label ?? 'Which one?'}
      </Text>
      {rows.map((r) => (
        <Button
          key={r._id}
          text={String(r.title)}
          mode="ghost"
          fontSize={2}
          padding={4}
          justify="flex-start"
          onClick={() => onPick(r._id)}
        />
      ))}
    </Stack>
  );
}

function QuickFormView({ form: given, onBack }: { form: QuickForm; onBack: () => void }) {
  const client = useClient({ apiVersion: API_VERSION });
  const linkTo = useStudioLink();
  const start = useMemo(() => new Date(), []);
  // Card 137: an edit job that picks its document first.
  const [picked, setPicked] = useState<string | null>(null);
  const form = useMemo<QuickForm>(
    () =>
      given.job?.kind === 'edit' && !given.job.doc && picked
        ? {
            ...given,
            job: { ...given.job, doc: picked, type: given.job.type ?? given.job.pick?.type },
          }
        : given,
    [given, picked],
  );
  const fields = useMemo(() => formFields(form), [form]);
  const job = form.job;
  const needsPick = job?.kind === 'edit' && !job.doc && job.pick ? job.pick : null;
  const reads = job && 'doc' in job && job.doc ? job.doc : null;
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.initial?.(start) ?? ''])),
  );
  const [files, setFiles] = useState<Record<string, File>>({});
  const [current, setCurrent] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(Boolean(reads));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState<{ id: string; type: string; live: boolean } | null>(null);

  // Edit and toggle jobs start from what is there now (the draft if one is open).
  useEffect(() => {
    if (!reads) return;
    let gone = false;
    void (async () => {
      try {
        const doc =
          (await client.getDocument(`drafts.${reads}`)) ?? (await client.getDocument(reads)) ?? {};
        if (gone) return;
        setCurrent(doc as Record<string, unknown>);
        if (job?.kind === 'edit') {
          setValues((old) => {
            const next = { ...old };
            for (const f of fields) {
              const v = formValue(f, getPath(doc, f.path ?? f.name));
              if (v) next[f.name] = v;
            }
            return next;
          });
        }
      } catch {
        if (!gone) setFailed(true);
      } finally {
        if (!gone) setLoading(false);
      }
    })();
    return () => {
      gone = true;
    };
  }, [reads, client, job, fields]);

  const submit = async () => {
    const found = quickFormErrors(fields, values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setFailed(false);
    try {
      if (job) {
        const done = await runJob(client, job, fields, values, files, current);
        if (done.live) window.dispatchEvent(new Event(PUBLISHED_EVENT));
        setSaved(done);
      } else if (form.build) {
        const clean = Object.fromEntries(
          fields.map((f) => [f.name, normalise(f, values[f.name] ?? '')]),
        );
        const doc = await form.build(clean, { now: new Date(), client });
        const id = crypto.randomUUID();
        await client.create({ ...doc, _id: id });
        window.dispatchEvent(new Event(PUBLISHED_EVENT));
        setSaved({ id, type: doc._type, live: true });
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  if (saved) {
    const target = job ? jobTarget(job, saved.id) : { doc: saved.id, type: saved.type };
    const open = target ? linkTo(target) : null;
    const lead = saved.live
      ? 'The website updates itself in a few minutes. Home shows when it is live.'
      : job?.kind === 'schedule'
        ? 'It goes on the website by itself at the time you picked. Home lists it under Coming up.'
        : 'It is saved as a draft. Open it and press Publish when it is ready.';
    return (
      // Card 131: the path laid so far, Saved and now Building, instead of a green box.
      <KitScope>
        <DoneCard
          states={saved.live ? liveSteps('on-its-way') : ['done', 'todo', 'todo']}
          title={form.doneTitle ?? (saved.live ? 'Done. It is published.' : 'Saved.')}
          lead={form.doneMessage ?? lead}
        >
          <KitAction strong onClick={onBack}>
            Back to quick updates
          </KitAction>
          {open && (
            <KitAction href={open.href} onClick={open.onClick}>
              Open it in the full editor
            </KitAction>
          )}
        </DoneCard>
      </KitScope>
    );
  }

  const isOn = job?.kind === 'toggle' && getPath(current, job.field) === true;
  const submitText =
    form.submitLabel ??
    (job?.kind === 'toggle'
      ? isOn
        ? 'Turn it off'
        : 'Turn it on'
      : job?.kind === 'schedule'
        ? 'Save it for that time'
        : 'Put it on the website');

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
      {needsPick ? (
        <PickList
          pick={needsPick}
          onPick={(id) => {
            setLoading(true);
            setPicked(id);
          }}
        />
      ) : loading ? (
        <Text size={2} muted>
          Getting what is there now...
        </Text>
      ) : (
        <>
          {job?.kind === 'toggle' && (
            <KitScope>
              <KitNotice
                tone={isOn ? 'tip' : 'plain'}
                title={isOn ? (job.onLabel ?? 'It is on') : (job.offLabel ?? 'It is off')}
              >
                {isOn ? 'Press the button to turn it off.' : 'Press the button to turn it on.'}
              </KitNotice>
            </KitScope>
          )}
          {fields.map((f) => (
            <FieldInput
              key={f.name}
              field={f}
              value={values[f.name] ?? ''}
              error={errors[f.name]}
              onChange={(v) => setValues((old) => ({ ...old, [f.name]: v }))}
              onFile={(file) => {
                setFiles((old) => {
                  const next = { ...old };
                  if (file) next[f.name] = file;
                  else delete next[f.name];
                  return next;
                });
                setValues((old) => ({ ...old, [f.name]: file?.name ?? '' }));
              }}
            />
          ))}
        </>
      )}
      {failed && (
        <KitScope>
          <KitNotice tone="careful" title="That did not save">
            Check your connection and press the button again.
          </KitNotice>
        </KitScope>
      )}
      <Button
        text={busy ? 'Saving...' : submitText}
        tone="primary"
        fontSize={2}
        padding={4}
        disabled={busy || loading || Boolean(needsPick)}
        onClick={() => void submit()}
        data-tour="quick-submit"
      />
    </Stack>
  );
}

export function makeQuickUpdateTool(config: KitConfig) {
  const forms = config.quickUpdate ?? [];
  return function QuickUpdateTool() {
    const [open, setOpen] = useState<QuickForm | 'photo' | null>(null);
    const { staffView } = useStaffView(config);
    const linkTo = useStudioLink();
    const photo = config.postPhoto;
    // Card 137: a form with `when` shows only in its season.
    const shown = forms.filter((f) => inSeason(f.when, new Date()));
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
              <TourButton tool="quick-update" staff={staffView} />
              <KitScope>
                <div style={{ display: 'grid', gap: 14 }} data-tour="quick-list">
                  {photo && (
                    <TileCard
                      dataQuick="post-photo"
                      meaning="image"
                      icon={ImageIcon}
                      title="Post a photo"
                      lead={
                        photo.tileLead ??
                        'From your camera or your photos, into a gallery or a new post. Saved as a draft for you to publish.'
                      }
                      onClick={() => setOpen('photo')}
                    />
                  )}
                  {shown.map((f) => {
                    const link = f.job?.kind === 'link' ? linkTo(f.job.target) : null;
                    return (
                      <TileCard
                        key={f.id}
                        dataQuick={f.id}
                        meaning={f.meaning}
                        icon={f.icon}
                        title={f.title}
                        lead={f.detail}
                        href={link?.href}
                        onClick={link ? link.onClick : () => setOpen(f)}
                      />
                    );
                  })}
                </div>
              </KitScope>
            </>
          )}
        </Stack>
      </Box>
    );
  };
}
