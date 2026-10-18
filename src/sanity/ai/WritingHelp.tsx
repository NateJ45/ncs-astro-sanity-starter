// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// Writing help in the Studio: the buttons (PORTS.md card 122)
// =============================================================================
// Three pieces, all registered by ncsWritingHelp() in ./index.ts:
//
//   WritingHelpInput   a form input wrapper. Under a Google description, a
//                      photo description (alt) or a summary field it adds a
//                      "Suggest" button. Every other input passes straight
//                      through with nothing added.
//   WritingHelpBlock   a Portable Text block wrapper. When the caret is in a
//                      plain paragraph it adds "Improve this paragraph",
//                      which opens a dialog with the suggestion.
//   SuggestionCard     the suggestion itself: the words in an editable box,
//                      then "Use this", "Try again" or "No thanks".
//
// NOTHING IS WRITTEN UNTIL THE EDITOR SAYS SO. A suggestion only lands in the
// field when "Use this" is pressed, and then only in the draft, like typing.
// Publishing stays the editor's own step.
//
// The buttons ask /api/studio/ai/ once per Studio visit whether the site has
// writing help set up (the ANTHROPIC_API_KEY secret). Until it has, they do
// not appear, so a site without the key looks exactly as it did before.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  PatchEvent,
  set,
  unset,
  useClient,
  useFormCallbacks,
  useFormValue,
  type BlockProps,
  type InputProps,
  type Path,
} from 'sanity';
import { Box, Button, Card, Dialog, Flex, Spinner, Stack, Text, TextArea } from '@sanity/ui';
import { AI_PATH, documentText, type AiInput, type AiTask } from '../../lib/studio-ai';
import { studioApi, WORKFLOW_API_VERSION } from '../workflow/studioApi';

export interface WritingHelpOptions {
  /** Field names that get each button. A name matches at any depth. */
  fields: Record<Exclude<AiTask, 'paragraph'>, string[]>;
  /** "Improve this paragraph" in rich text. */
  paragraphs: boolean;
}

export const DEFAULT_WRITING_HELP: WritingHelpOptions = {
  fields: {
    seo: ['seoDescription', 'metaDescription'],
    summary: ['excerpt', 'summary'],
    alt: ['alt'],
  },
  paragraphs: true,
};

const BUTTON: Record<AiTask, string> = {
  seo: 'Suggest a Google description',
  summary: 'Suggest a summary',
  alt: 'Suggest a description of the photo',
  paragraph: 'Improve this paragraph',
};

// -----------------------------------------------------------------------------
// Is writing help set up? Asked once per Studio visit.
// -----------------------------------------------------------------------------

let statusOnce: Promise<boolean> | null = null;

function readStatus(): Promise<boolean> {
  statusOnce ??= fetch(AI_PATH, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { configured?: boolean } | null) => j?.configured === true)
    .catch(() => false);
  return statusOnce;
}

function useWritingHelpOn(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    void readStatus().then((v) => {
      if (live) setOn(v);
    });
    return () => {
      live = false;
    };
  }, []);
  return on;
}

// -----------------------------------------------------------------------------
// Asking for one suggestion
// -----------------------------------------------------------------------------

type Ask =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'ready'; text: string }
  | { kind: 'error'; message: string };

function useSuggestion(payload: () => AiInput) {
  const client = useClient({ apiVersion: WORKFLOW_API_VERSION });
  const [state, setState] = useState<Ask>({ kind: 'idle' });
  const ask = useCallback(async () => {
    setState({ kind: 'busy' });
    const { body } = await studioApi<{ text?: string }>(client, AI_PATH, {
      method: 'POST',
      body: payload(),
    });
    setState(
      body.ok && typeof body.text === 'string'
        ? { kind: 'ready', text: body.text }
        : { kind: 'error', message: body.error ?? 'No suggestion just now. Try again later.' },
    );
  }, [client, payload]);
  return { state, ask, reset: () => setState({ kind: 'idle' }) };
}

/** A readable name for the document, for the prompt's <title>. */
function titleOf(doc: Record<string, unknown> | undefined): string | undefined {
  for (const k of ['title', 'name', 'heading', 'pageTitle', 'seoTitle']) {
    const v = doc?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

// -----------------------------------------------------------------------------
// The suggestion, editable, with its three choices
// -----------------------------------------------------------------------------

export function SuggestionCard({
  text,
  onUse,
  useLabel = 'Use this',
  onAgain,
  onClose,
  note,
}: {
  text: string;
  /** Null when the words cannot go straight in (the editor copies them). */
  onUse: ((text: string) => void) | null;
  useLabel?: string;
  onAgain: () => void;
  onClose: () => void;
  note?: string;
}) {
  const [draft, setDraft] = useState(text);
  useEffect(() => setDraft(text), [text]);
  const [copied, setCopied] = useState(false);
  return (
    <Card padding={3} radius={2} border tone="primary">
      <Stack gap={3}>
        <Text size={1} muted>
          A suggestion. Change any of it before you use it, and check the facts.
        </Text>
        <TextArea
          value={draft}
          rows={Math.min(8, Math.max(2, Math.ceil(draft.length / 70)))}
          onChange={(e) => setDraft(e.currentTarget.value)}
          aria-label="Suggested words"
        />
        {note && (
          <Text size={1} muted>
            {note}
          </Text>
        )}
        <Flex gap={2} wrap="wrap">
          {onUse ? (
            <Button
              text={useLabel}
              tone="primary"
              fontSize={1}
              padding={2}
              disabled={!draft.trim()}
              onClick={() => onUse(draft.trim())}
            />
          ) : (
            <Button
              text={copied ? 'Copied' : 'Copy the words'}
              tone="primary"
              fontSize={1}
              padding={2}
              onClick={() => {
                void navigator.clipboard?.writeText(draft).then(() => setCopied(true));
              }}
            />
          )}
          <Button text="Try again" mode="ghost" fontSize={1} padding={2} onClick={onAgain} />
          <Button text="No thanks" mode="bleed" fontSize={1} padding={2} onClick={onClose} />
        </Flex>
      </Stack>
    </Card>
  );
}

function AskButton({ task, busy, onClick }: { task: AiTask; busy: boolean; onClick: () => void }) {
  return (
    <Flex align="center" gap={2}>
      <Button
        text={busy ? 'Thinking of something...' : BUTTON[task]}
        mode="ghost"
        fontSize={1}
        padding={2}
        disabled={busy}
        onClick={onClick}
      />
      {busy && <Spinner muted />}
    </Flex>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <Text size={1} muted role="status">
      {message}
    </Text>
  );
}

// -----------------------------------------------------------------------------
// Fields: the Google description, summaries, photo descriptions
// -----------------------------------------------------------------------------

const lastName = (path: Path): string | undefined =>
  [...path].reverse().find((s): s is string => typeof s === 'string');

/** Which task a string field gets, or null for every other input. */
export function taskForField(
  props: Pick<InputProps, 'schemaType' | 'path' | 'readOnly'>,
  options: WritingHelpOptions,
): Exclude<AiTask, 'paragraph'> | null {
  if (props.readOnly) return null;
  if ((props.schemaType as { jsonType?: string }).jsonType !== 'string') return null;
  if ((props.schemaType as { options?: { list?: unknown } }).options?.list) return null;
  const name = lastName(props.path);
  if (!name) return null;
  for (const task of ['seo', 'summary', 'alt'] as const) {
    if (options.fields[task].includes(name)) return task;
  }
  return null;
}

function FieldHelp({ props, task }: { props: InputProps; task: Exclude<AiTask, 'paragraph'> }) {
  const doc = useFormValue([]) as Record<string, unknown> | undefined;
  // For a photo description the photo is the field's parent: { asset, alt }.
  const parent = useFormValue(props.path.slice(0, -1)) as { asset?: { _ref?: string } } | undefined;
  const assetRef = parent?.asset?._ref;
  const payload = useCallback(
    (): AiInput => ({
      task,
      title: titleOf(doc),
      context: task === 'alt' ? undefined : documentText(doc),
      text: typeof props.value === 'string' ? props.value : undefined,
      assetRef: task === 'alt' ? assetRef : undefined,
    }),
    [task, doc, props.value, assetRef],
  );
  const { state, ask, reset } = useSuggestion(payload);
  const onChange = (props as { onChange: (p: unknown) => void }).onChange;

  if (task === 'alt' && !assetRef) return null;
  return (
    <Box marginTop={2}>
      {state.kind === 'ready' ? (
        <SuggestionCard
          text={state.text}
          onUse={(text) => {
            onChange(PatchEvent.from(text ? set(text) : unset()));
            reset();
          }}
          onAgain={() => void ask()}
          onClose={reset}
        />
      ) : (
        <Stack gap={2}>
          <AskButton task={task} busy={state.kind === 'busy'} onClick={() => void ask()} />
          {state.kind === 'error' && <ErrorLine message={state.message} />}
        </Stack>
      )}
    </Box>
  );
}

export function makeWritingHelpInput(options: WritingHelpOptions) {
  function Help({ props, task }: { props: InputProps; task: Exclude<AiTask, 'paragraph'> }) {
    const on = useWritingHelpOn();
    return on ? <FieldHelp props={props} task={task} /> : null;
  }
  return function WritingHelpInput(props: InputProps) {
    const task = taskForField(props, options);
    if (!task) return props.renderDefault(props);
    return (
      <Stack gap={0}>
        {props.renderDefault(props)}
        <Help props={props} task={task} />
      </Stack>
    );
  };
}

// -----------------------------------------------------------------------------
// Rich text: "Improve this paragraph"
// -----------------------------------------------------------------------------

interface Span {
  _type?: string;
  text?: string;
  marks?: string[];
}
interface Block {
  _type?: string;
  _key?: string;
  style?: string;
  listItem?: string;
  children?: Span[];
  markDefs?: unknown[];
}

/** The paragraph's words, and whether it is plain (no bold, links or inline objects). */
export function paragraphOf(block: Block | undefined): { text: string; plain: boolean } | null {
  if (!block || block._type !== 'block') return null;
  if (block.style && block.style !== 'normal') return null;
  const children = block.children ?? [];
  const text = children.map((c) => (typeof c.text === 'string' ? c.text : '')).join('');
  const plain =
    (block.markDefs?.length ?? 0) === 0 &&
    children.every((c) => c._type === 'span' && (c.marks?.length ?? 0) === 0);
  return { text, plain };
}

function ParagraphHelp({
  props,
  text,
  plain,
}: {
  props: BlockProps;
  text: string;
  plain: boolean;
}) {
  const doc = useFormValue([]) as Record<string, unknown> | undefined;
  const { onChange } = useFormCallbacks();
  const [open, setOpen] = useState(false);
  const payload = useCallback(
    (): AiInput => ({ task: 'paragraph', title: titleOf(doc), text }),
    [doc, text],
  );
  const { state, ask, reset } = useSuggestion(payload);
  const close = () => {
    setOpen(false);
    reset();
  };
  const block = props.value as Block;

  return (
    <div contentEditable={false} style={{ userSelect: 'none', marginTop: 4 }}>
      <Button
        text={BUTTON.paragraph}
        mode="bleed"
        fontSize={0}
        padding={2}
        onClick={() => {
          setOpen(true);
          void ask();
        }}
      />
      {open && (
        <Dialog
          id={`writing-help-${block._key ?? 'paragraph'}`}
          header="Improve this paragraph"
          onClose={close}
          width={1}
        >
          <Box padding={4}>
            <Stack gap={4}>
              <Stack gap={2}>
                <Text size={1} weight="semibold">
                  Now
                </Text>
                <Text size={1} muted style={{ lineHeight: 1.6 }}>
                  {text}
                </Text>
              </Stack>
              {state.kind === 'busy' && (
                <Flex align="center" gap={2}>
                  <Spinner muted />
                  <Text size={1} muted>
                    Thinking of something...
                  </Text>
                </Flex>
              )}
              {state.kind === 'error' && <ErrorLine message={state.message} />}
              {state.kind === 'ready' && (
                <SuggestionCard
                  text={state.text}
                  useLabel="Use this paragraph"
                  note={
                    plain
                      ? undefined
                      : 'This paragraph has bold, a link or something inside it, which the new words would lose. Copy the words and paste them in yourself.'
                  }
                  onUse={
                    plain
                      ? (words) => {
                          onChange(
                            PatchEvent.from(
                              set(
                                [
                                  {
                                    _type: 'span',
                                    _key: `${block._key ?? 'p'}-ai`,
                                    text: words,
                                    marks: [],
                                  },
                                ],
                                [...props.path, 'children'],
                              ),
                            ),
                          );
                          close();
                        }
                      : null
                  }
                  onAgain={() => void ask()}
                  onClose={close}
                />
              )}
            </Stack>
          </Box>
        </Dialog>
      )}
    </div>
  );
}

export function makeWritingHelpBlock() {
  return function WritingHelpBlock(props: BlockProps) {
    const on = useWritingHelpOn();
    const p = paragraphOf(props.value as Block);
    const show = on && !props.readOnly && props.focused && p && p.text.trim().length >= 40;
    return (
      <>
        {props.renderDefault(props)}
        {show && p && <ParagraphHelp props={props} text={p.text} plain={p.plain} />}
      </>
    );
  };
}
