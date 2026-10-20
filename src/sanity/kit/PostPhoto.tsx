// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words for a site come from kit.config.ts postPhoto)
// =============================================================================
// "Post a photo" on the Quick update tool (Studio kit, PORTS.md card 125)
// =============================================================================
// The phone job the Studio was missing: take a photo (or pick one from the
// phone's gallery), describe it, and put it in a gallery on a page or in a new
// post. Built for a 375px screen first, like the rest of Quick update.
//
// IT ONLY WRITES A DRAFT. Unlike the Quick update forms (which publish), a
// photo lands in the page's draft, or in a new draft post, and the done screen
// says so and opens it in the full editor, where the editor checks it and
// presses the Studio's own Publish (with its own checks). Nothing here
// publishes.
//
// Before upload the photo is redrawn at no more than 2560px on its long side
// (src/lib/photo-post.ts fitWithin/shouldRedraw): smaller on a phone signal,
// and the redraw drops the photo's hidden EXIF data, which on a phone includes
// WHERE it was taken. If the browser cannot redraw it, the original goes up.
//
// The pure parts (checks, labels, GROQ, paths) are in src/lib/photo-post.ts.
//
// Layout (card 132): the form is a three-stone path in the kit's language. A
// StepTrail across the top (Pick a photo, Say what it shows, Post it) lays a
// stone as each part is filled in, and each part of the form is led by its own
// numbered stone in the same state, with a display-font heading. The inputs
// stay @sanity/ui controls (their focus, keyboard and labels are the Studio's).
// =============================================================================

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useClient, type SanityClient } from 'sanity';
import { Box, Button, Card, Flex, Radio, Stack, Text, TextArea, TextInput } from '@sanity/ui';
import { ArrowLeftIcon } from '@sanity/icons/ArrowLeft';
import { ImageIcon } from '@sanity/icons/Image';
import { UploadIcon } from '@sanity/icons/Upload';
import {
  fitWithin,
  galleryChoices,
  storyChoices,
  storyQuery,
  storySpec,
  type GalleryDoc,
  type StoryDoc,
  galleryPath,
  galleryQuery,
  gallerySpec,
  photoFormErrors,
  photoValue,
  shouldRedraw,
  type GalleryChoice,
} from '../../lib/photo-post';
import { API_VERSION, useStudioLink, useTypeTitle } from './shared';
import {
  ArtTile,
  DoneCard,
  KitAction,
  KitLoading,
  KitNotice,
  KitScope,
  StateStone,
  StepTrail,
} from './ui';
import type { StepState } from '../../lib/studio-look';
import type { PostPhotoConfig } from './types';

/** The three parts of the form, as the trail and the step headings name them. */
export const PHOTO_STEPS = ['Pick a photo', 'Say what it shows', 'Post it'] as const;

/** One part of the form, led by its numbered stone (laid, ringed or waiting) and a display-font heading. */
export function PhotoStep({
  index,
  current,
  children,
}: {
  index: number;
  current: number;
  children: ReactNode;
}) {
  const state: StepState = index < current ? 'done' : index === current ? 'now' : 'todo';
  const id = `photo-step-${index}`;
  return (
    <section
      aria-labelledby={id}
      style={{
        display: 'grid',
        gap: 16,
        paddingTop: 20,
        borderTop: '1px solid var(--ui-rule)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <StateStone state={state} index={index} calm n={index + 1} size={40} />
        <h3
          id={id}
          style={{
            margin: 0,
            fontFamily: 'var(--ui-display)',
            fontWeight: 'var(--ui-display-weight)',
            fontSize: 24,
            lineHeight: 1.15,
            color: 'var(--ui-heading)',
            minWidth: 0,
            overflowWrap: 'anywhere',
          }}
        >
          {PHOTO_STEPS[index]}
          {state === 'done' && <span className="ui-sr"> (done)</span>}
        </h3>
      </div>
      {children}
    </section>
  );
}

const key = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);

/** The photo, redrawn smaller and without EXIF where the browser can; else as it is. */
async function preparePhoto(file: File): Promise<{ blob: Blob; name: string; type: string }> {
  if (!shouldRedraw(file.type) || typeof createImageBitmap !== 'function') {
    return { blob: file, name: file.name || 'photo', type: file.type };
  }
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.fillStyle = '#ffffff'; // a transparent PNG would otherwise turn black as a JPEG
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.88),
    );
    if (!blob) throw new Error('no blob');
    const base = (file.name || 'photo').replace(/\.[^.]+$/, '');
    return { blob, name: `${base}.jpg`, type: 'image/jpeg' };
  } catch {
    return { blob: file, name: file.name || 'photo', type: file.type };
  }
}

type Saved = { id: string; type: string; hadDraft: boolean };

async function addToGallery(
  client: SanityClient,
  spec: ReturnType<typeof gallerySpec>,
  choice: GalleryChoice,
  image: Record<string, unknown>,
  storyField?: string,
): Promise<Saved> {
  const draftId = `drafts.${choice.docId}`;
  const [draft, published] = await Promise.all([
    client.getDocument(draftId),
    client.getDocument(choice.docId),
  ]);
  const base = draft ?? published;
  if (!base) throw new Error('That page is not there any more.');
  const path = choice.story && storyField ? storyField : galleryPath(spec, choice.sectionKey);
  const tx = client.transaction();
  if (!draft && published) {
    // Start the page's draft from the published copy, as the Studio does on a
    // first edit. API fields are dropped; the rest is the page as it is.
    const { _rev, _createdAt, _updatedAt, ...content } = published;
    void _rev;
    void _createdAt;
    void _updatedAt;
    tx.createIfNotExists({ ...content, _id: draftId, _type: published._type });
  }
  tx.patch(draftId, (p) => p.setIfMissing({ [path]: [] }).append(path, [image]));
  await tx.commit({ autoGenerateArrayKeys: false });

  // A gallery removed in the draft makes the patch a silent no-op: say so.
  const check = await client.fetch<number>(
    choice.story && storyField
      ? `count(*[_id == $id][0].${storyField}[_key == $photo])`
      : `count(*[_id == $id][0].${spec.builderField}[_key == $section][0].${spec.field}[_key == $photo])`,
    { id: draftId, section: choice.sectionKey, photo: image._key },
  );
  if (!check) throw new Error('That gallery is not on the page any more. Pick another one.');
  return { id: choice.docId, type: choice.docType, hadDraft: Boolean(draft) };
}

export function PostPhoto({ config, onBack }: { config: PostPhotoConfig; onBack: () => void }) {
  const client = useClient({ apiVersion: API_VERSION });
  const typeTitle = useTypeTitle();
  const linkTo = useStudioLink();
  const spec = useMemo(() => gallerySpec(config.gallery), [config.gallery]);
  const stories = useMemo(
    () => (config.stories ? storySpec(config.stories) : null),
    [config.stories],
  );

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [choices, setChoices] = useState<GalleryChoice[] | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // The galleries, drafts included (a gallery added but not yet published shows).
  useEffect(() => {
    let live = true;
    const drafts = client.withConfig({ perspective: 'drafts' });
    Promise.all([
      config.galleryTypes.length
        ? drafts.fetch<GalleryDoc[]>(galleryQuery(spec), { types: config.galleryTypes })
        : Promise.resolve([] as GalleryDoc[]),
      stories
        ? drafts.fetch<StoryDoc[]>(storyQuery(stories), { types: stories.types })
        : Promise.resolve([] as StoryDoc[]),
    ])
      .then(
        ([docs, storyDocs]) =>
          live &&
          setChoices([
            ...storyChoices(storyDocs ?? [], typeTitle, stories?.noun),
            ...galleryChoices(docs ?? [], typeTitle),
          ]),
      )
      .catch(() => live && setChoices([]));
    return () => {
      live = false;
    };
  }, [client, spec, stories, config.galleryTypes, typeTitle]);

  useEffect(() => {
    if (!file) return setPreviewUrl(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    setFile(f);
    setErrors((e) => ({ ...e, photo: '' }));
  };

  const reset = () => {
    setFile(null);
    setAlt('');
    setCaption('');
    setTitle('');
    setTarget('');
    setErrors({});
    setSaved(null);
    setFailed(null);
  };

  const submit = async () => {
    const found = photoFormErrors({ hasPhoto: Boolean(file), alt, target, title });
    setErrors(found);
    if (Object.keys(found).length || !file) return;
    setFailed(null);
    try {
      setStep('Getting the photo ready...');
      const prepared = await preparePhoto(file);
      setStep('Uploading the photo...');
      const asset = await client.assets.upload('image', prepared.blob, {
        filename: prepared.name,
        contentType: prepared.type,
      });
      setStep('Saving the draft...');
      const chosen = choices?.find((c) => `${c.docId}:${c.sectionKey}` === target);
      const image = photoValue(
        chosen?.story && stories ? stories : spec,
        asset._id,
        alt,
        caption,
        key(),
      );
      if (target === 'post' && config.post) {
        const { _key, ...cover } = image;
        void _key;
        const doc = config.post.build({
          title: title.trim(),
          alt: alt.trim(),
          caption: caption.trim(),
          image: cover,
          now: new Date(),
        });
        const id = crypto.randomUUID();
        await client.create({ ...doc, _id: `drafts.${id}` });
        setSaved({ id, type: doc._type, hadDraft: false });
      } else {
        const choice = choices?.find((c) => `${c.docId}:${c.sectionKey}` === target);
        if (!choice) throw new Error('Pick where the photo goes.');
        setSaved(await addToGallery(client, spec, choice, image, stories?.field));
      }
    } catch (err) {
      setFailed(
        err instanceof Error && /any more|Pick/.test(err.message)
          ? err.message
          : 'That did not save. Check your connection and press the button again.',
      );
    } finally {
      setStep(null);
    }
  };

  if (saved) {
    const open = linkTo({ doc: saved.id, type: saved.type });
    return (
      // Card 131: one stone laid (Saved); Publish lays the rest.
      <KitScope>
        <DoneCard
          states={['done', 'todo', 'todo']}
          title="Saved as a draft."
          lead={
            'Nothing changes on the website until you open it and press Publish.' +
            (saved.hadDraft
              ? ' This page already had changes waiting, so they go live together when you publish.'
              : '')
          }
        >
          <KitAction strong href={open.href} onClick={open.onClick}>
            Open it to check and publish
          </KitAction>
          <KitAction onClick={reset}>Post another photo</KitAction>
          <KitAction quiet onClick={onBack}>
            Back to quick updates
          </KitAction>
        </DoneCard>
      </KitScope>
    );
  }

  const fieldError = (name: string) =>
    errors[name] ? (
      <Text
        id={`photo-${name}-error`}
        size={1}
        style={{ color: 'var(--card-badge-critical-fg-color)' }}
      >
        {errors[name]}
      </Text>
    ) : null;

  // Where the trail stands: no photo yet, then the words, then where it goes.
  const current = !file ? 0 : alt.trim() ? 2 : 1;

  return (
    <KitScope>
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
        <header className="ui-toolhead">
          <div className="ui-toolhead__row">
            <ArtTile meaning="image" size={64} seed={13} />
            <h2 className="ui-toolhead__title" style={{ margin: 0 }}>
              Post a photo
            </h2>
          </div>
          <p className="ui-toolhead__lead" style={{ margin: 0 }}>
            Take a photo or pick one from your phone, say what is in it, and choose where it goes.{' '}
            {config.draftNote ?? 'It is saved as a draft for you to check and publish.'}
          </p>
          {config.note && <KitNotice tone="tip">{config.note}</KitNotice>}
        </header>

        <StepTrail words={PHOTO_STEPS} current={current} />

        {/* 1. The photo. Two hidden inputs: the camera, and the phone's photos. */}
        <PhotoStep index={0} current={current}>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            data-photo-input="camera"
            onChange={(e) => pick(e.currentTarget.files?.[0])}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            hidden
            data-photo-input="gallery"
            onChange={(e) => pick(e.currentTarget.files?.[0])}
          />
          {previewUrl && (
            <Card radius={3} border overflow="hidden">
              <img
                src={previewUrl}
                alt="The photo you picked"
                style={{ display: 'block', width: '100%', maxHeight: 320, objectFit: 'contain' }}
              />
            </Card>
          )}
          <Flex gap={2} wrap="wrap">
            <Box flex={1} style={{ minWidth: 150 }}>
              <Button
                icon={ImageIcon}
                text={file ? 'Take another' : 'Take a photo'}
                mode="ghost"
                fontSize={2}
                padding={4}
                style={{ width: '100%' }}
                onClick={() => cameraRef.current?.click()}
              />
            </Box>
            <Box flex={1} style={{ minWidth: 150 }}>
              <Button
                icon={UploadIcon}
                text={file ? 'Choose a different one' : 'Choose from your photos'}
                mode="ghost"
                fontSize={2}
                padding={4}
                style={{ width: '100%' }}
                onClick={() => galleryRef.current?.click()}
              />
            </Box>
          </Flex>
          {fieldError('photo')}
        </PhotoStep>

        {/* 2. What it shows: the description (required) and a caption. */}
        <PhotoStep index={1} current={current}>
          <Stack gap={3}>
            <Text as="label" htmlFor="photo-alt" size={2} weight="semibold">
              Describe the photo
            </Text>
            <Text size={1} muted style={{ lineHeight: 1.5 }}>
              What is in it, for someone who cannot see it. For example: "
              {config.altExample ?? "The children's choir singing at the Christmas service"}".
            </Text>
            <TextArea
              id="photo-alt"
              rows={3}
              fontSize={3}
              padding={4}
              value={alt}
              aria-invalid={Boolean(errors.alt)}
              aria-describedby={errors.alt ? 'photo-alt-error' : undefined}
              onChange={(e) => setAlt(e.currentTarget.value)}
            />
            {fieldError('alt')}
          </Stack>

          {spec.captionField && (
            <Stack gap={3}>
              <Text as="label" htmlFor="photo-caption" size={2} weight="semibold">
                Caption (if you like)
              </Text>
              <TextInput
                id="photo-caption"
                fontSize={3}
                padding={4}
                value={caption}
                onChange={(e) => setCaption(e.currentTarget.value)}
              />
            </Stack>
          )}
        </PhotoStep>

        {/* 3. Where it goes, then save. */}
        <PhotoStep index={2} current={current}>
          <Stack gap={3} as="fieldset" style={{ border: 0, margin: 0, padding: 0 }}>
            <Text as="legend" size={2} weight="semibold" style={{ marginBottom: 12 }}>
              Where should it go?
            </Text>
            {choices === null ? (
              <KitLoading label="Finding the galleries..." />
            ) : (
              <Stack gap={2}>
                {config.post && (
                  <Card as="label" padding={3} radius={2} border style={{ cursor: 'pointer' }}>
                    <Flex gap={3} align="center">
                      <Radio
                        name="photo-target"
                        value="post"
                        checked={target === 'post'}
                        onChange={() => setTarget('post')}
                      />
                      <Text size={2}>{config.post.label}</Text>
                    </Flex>
                  </Card>
                )}
                {choices.map((c) => {
                  const id = `${c.docId}:${c.sectionKey}`;
                  return (
                    <Card
                      key={id}
                      as="label"
                      padding={3}
                      radius={2}
                      border
                      style={{ cursor: 'pointer' }}
                    >
                      <Flex gap={3} align="center">
                        <Radio
                          name="photo-target"
                          value={id}
                          checked={target === id}
                          onChange={() => setTarget(id)}
                        />
                        <Text size={2}>{c.label}</Text>
                      </Flex>
                    </Card>
                  );
                })}
                {!choices.length && !config.post && (
                  <Text size={1} muted style={{ lineHeight: 1.5 }}>
                    {config.emptyNote ??
                      (stories && !config.galleryTypes.length
                        ? `There is no ${(stories.noun ?? 'document').toLowerCase()} to add a photo to yet. Start one in the full editor first.`
                        : 'No page has a photo gallery yet. Add a "Photo gallery" section to a page in the full editor first.')}
                  </Text>
                )}
              </Stack>
            )}
            {fieldError('target')}
          </Stack>

          {target === 'post' && config.post && (
            <Stack gap={3}>
              <Text as="label" htmlFor="photo-title" size={2} weight="semibold">
                Title for the post
              </Text>
              <TextInput
                id="photo-title"
                fontSize={3}
                padding={4}
                value={title}
                aria-invalid={Boolean(errors.title)}
                onChange={(e) => setTitle(e.currentTarget.value)}
              />
              {fieldError('title')}
            </Stack>
          )}

          {failed && <KitNotice tone="careful">{failed}</KitNotice>}
          <Button
            text={step ?? 'Save as a draft'}
            tone="primary"
            fontSize={2}
            padding={4}
            disabled={Boolean(step)}
            onClick={() => void submit()}
          />
        </PhotoStep>
      </Stack>
    </KitScope>
  );
}
