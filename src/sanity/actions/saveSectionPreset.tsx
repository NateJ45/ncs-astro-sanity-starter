// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { useMemo, useState } from 'react';
import { useClient, type DocumentActionComponent, type DocumentActionProps } from 'sanity';
import { BlockElementIcon } from '@sanity/icons';
import { Box, Button, Card, Flex, Stack, Text, TextInput, useToast } from '@sanity/ui';
import { sectionLabel } from '../../lib/page-checks';
import { PAGE_CHECK_CONFIG } from '../pageBuilderConfig';
import { regenerateKeys } from '../pageOps';

// =============================================================================
// "Save a section as preset..." - capture one band of a page for reuse
// =============================================================================
// THE PROBLEM. An editor spends twenty minutes getting a call-to-action band
// right, then wants the same band on four more pages and rebuilds it by hand
// each time (or duplicates a whole page to get at one strip of it).
//
// WHY A DOCUMENT ACTION. The obvious home for this is the ... menu on the
// section itself, in the sections list or on the preview overlay. Sanity does
// not open either of those menus to a plugin: array-item menus are built from
// the array input's own options, and the visual-editing overlay's toolbar is
// internal. A document action is the surface we DO own, so the action opens a
// dialog that lists the page's sections and lets the editor pick one.
//
// IT READS THE DRAFT. Whatever the editor can see in the form is what gets
// saved, including edits that are not published yet. That is the point: a
// section is usually saved right after it is made.
//
// IT WRITES A PUBLISHED `sectionPreset`, not a draft. A preset is a tool, not
// content: nothing about it goes on the website, so a "publish your saved
// section before you can use it" step would be ceremony with no meaning.
//
// EVERY `_key` IS REGENERATED on the way in (and again on the way out, when a
// preset is added to a page), so a preset can be added to the same page twice
// without colliding with itself. See src/sanity/pageOps.ts.
// =============================================================================

const API = { apiVersion: '2025-01-01' } as const;

/** One row in the picker: a section of the page being saved from. */
interface SectionChoice {
  key: string;
  type: string;
  label: string;
  /** First few words found in the section, so two of a kind are tellable apart. */
  hint: string;
  value: Record<string, unknown>;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * The first bit of real text inside a section, for the picker row. Walks
 * breadth-first so a heading beats a paragraph buried three levels down.
 */
export function previewText(value: unknown, limit = 60): string {
  const queue: unknown[] = [value];
  const skip = new Set(['_type', '_key', '_ref', '_id', 'variant', 'tone', 'layout', 'appearance']);
  while (queue.length > 0) {
    const node = queue.shift();
    if (Array.isArray(node)) {
      queue.push(...node);
      continue;
    }
    if (!isRecord(node)) continue;
    for (const [key, child] of Object.entries(node)) {
      if (skip.has(key)) continue;
      if (typeof child === 'string' && child.trim()) {
        const text = child.trim().replace(/\s+/g, ' ');
        return text.length > limit ? `${text.slice(0, limit - 1)}...` : text;
      }
    }
    for (const [key, child] of Object.entries(node)) {
      if (!skip.has(key) && (Array.isArray(child) || isRecord(child))) queue.push(child);
    }
  }
  return '';
}

/**
 * The page's sections, as pickable rows. Every builder array this repo uses is
 * read, in render order, and the rows are numbered straight on across them so
 * the numbering matches what the editor sees on the page.
 */
function choicesFrom(doc: unknown): SectionChoice[] {
  const page = isRecord(doc) ? doc : {};
  const choices: SectionChoice[] = [];
  let position = 0;
  for (const field of PAGE_CHECK_CONFIG.sectionArrays) {
    const sections = Array.isArray(page[field]) ? (page[field] as unknown[]) : [];
    sections.forEach((section, i) => {
      if (!isRecord(section) || typeof section._type !== 'string') return;
      position += 1;
      choices.push({
        key: typeof section._key === 'string' ? section._key : `${field}-${i}`,
        type: section._type,
        label: `${position}. ${sectionLabel(section._type)}`,
        hint: previewText(section),
        value: section,
      });
    });
  }
  return choices;
}

export const SaveSectionPresetAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const client = useClient(API);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const doc = props.draft ?? props.published;
  const choices = useMemo(() => choicesFrom(doc), [doc]);
  const picked = choices.find((c) => c.key === pickedKey) ?? null;

  const close = () => {
    setOpen(false);
    setPickedKey(null);
    setName('');
    props.onComplete?.();
  };

  const pick = (choice: SectionChoice) => {
    setPickedKey(choice.key);
    // A sensible name the editor can accept or type over: the section's own
    // words when it has any, otherwise the kind of section it is.
    setName(choice.hint || sectionLabel(choice.type));
  };

  const save = async () => {
    if (!picked) return;
    setSaving(true);
    try {
      const section = regenerateKeys(picked.value) as Record<string, unknown>;
      await client.create({
        _type: 'sectionPreset',
        title: name.trim() || sectionLabel(picked.type),
        sectionType: picked.type,
        section: [section],
      });
      toast.push({
        status: 'success',
        title: `Saved "${name.trim() || sectionLabel(picked.type)}"`,
        description: 'Find it under Saved sections to add it to any page.',
        duration: 8000,
      });
      close();
    } catch (err) {
      console.error('[save-section-preset] failed', err);
      toast.push({
        status: 'error',
        title: 'Could not save that section',
        description: 'Nothing was changed. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    label: 'Save a section as preset...',
    icon: BlockElementIcon,
    disabled: choices.length === 0,
    title:
      choices.length === 0
        ? 'This page has no sections to save yet.'
        : "Keep one of this page's sections so you can add it to another page.",
    onHandle: () => setOpen(true),
    dialog: open && {
      type: 'dialog' as const,
      header: 'Save a section as preset',
      width: 'medium' as const,
      onClose: close,
      content: (
        <Stack space={4}>
          <Text size={1} muted>
            Pick a section from this page. It is copied, so changing the saved copy later never
            changes this page, and changing this page never changes the copy.
          </Text>
          <Stack space={2}>
            {choices.map((choice) => (
              <Card
                key={choice.key}
                as="button"
                padding={3}
                radius={2}
                tone={choice.key === pickedKey ? 'primary' : 'default'}
                pressed={choice.key === pickedKey}
                border
                style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
                onClick={() => pick(choice)}
              >
                <Stack space={2}>
                  <Text size={1} weight="semibold">
                    {choice.label}
                  </Text>
                  {choice.hint && (
                    <Text size={1} muted textOverflow="ellipsis">
                      {choice.hint}
                    </Text>
                  )}
                </Stack>
              </Card>
            ))}
          </Stack>
          {picked && (
            <Stack space={3}>
              <Text size={1} weight="semibold">
                Name this saved section so you can find it again
              </Text>
              <TextInput
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                placeholder={sectionLabel(picked.type)}
              />
            </Stack>
          )}
        </Stack>
      ),
      footer: (
        <Box padding={2}>
          <Flex gap={2} justify="flex-end">
            <Button mode="ghost" text="Cancel" onClick={close} disabled={saving} />
            <Button
              tone="primary"
              text={saving ? 'Saving...' : 'Save section'}
              disabled={!picked || saving}
              onClick={() => void save()}
            />
          </Flex>
        </Box>
      ),
    },
  };
};
