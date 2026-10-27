// Safe to edit by hand
// =============================================================================
// InlineText - type straight onto the page (PORTS.md card 185, 2026-10-26)
// =============================================================================
// In Edit mode, point at any words a visitor reads (a heading, a subhead, a
// button label, a paragraph) and click: the caret lands where you clicked and
// you type right there, the way a Squarespace page edits. The words go to the
// DRAFT as you type, through the same comlink door every other control here
// uses (`useDraftDocument`, so no token in the browser and the Studio's undo
// covers it), and the form panel beside the preview follows along.
//
// HOW IT WORKS, in the order an editor meets it:
//
//   1. ARM ON HOVER. This component mounts (renders nothing) on every element
//      the overlay resolved to a text field. When the pointer enters one, it
//      reads the draft and checks the element shows EXACTLY the stored value:
//      one text node equal to the string, or for portable text a paragraph
//      whose words and bold/italic equal the stored block. Only then does the
//      element get `contenteditable`, BEFORE the click, so the browser's own
//      mousedown places the caret where the pointer is. Anything the page shows
//      differently from what is stored (a formatted date, a heading split
//      around its accent word, a link inside a paragraph) is never armed, and
//      the click just opens the form panel as before.
//   2. EDIT ON FOCUS. The invisible click-to-edit markers (stega) are taken out
//      of the text with `deleteData` AFTER the caret, so the caret does not
//      move, and `data-inline-editing` goes on the element: the soft-refresh
//      morph leaves it alone (src/lib/preview-morph.ts) and instant text skips
//      it (useInstantText.ts), so nothing writes under the caret.
//   3. WRITE WHILE TYPING, throttled: the first keystroke at once, then the
//      newest value at most every 250ms (`createTrailingWriter`), and the last
//      one when the editor lets go. Fewer patches than keystrokes, which is
//      fewer than the form panel sends for the same typing.
//   4. LET GO on Enter, Escape, Tab or a click elsewhere. Escape KEEPS the
//      words (they are already in the draft, and the Studio's undo takes them
//      back); throwing typing away on a stray key is the worse failure. The
//      markers go back on a plain field; a paragraph whose words changed gets
//      the server's render, which the edit already asked for.
//
// What is deliberately NOT typed into here (the form panel still edits it):
// lists, links and other annotations, a third decorator, inline objects, text
// inside a <button>, <summary>, <label> or form control (the browser gives
// those clicks to the control), a section copied on the client that has not
// rendered yet (`data-preview-clone`), and any element whose shown text is not
// the stored value. The pure decisions are in src/lib/preview-inline-edit.ts.
// =============================================================================
import { useEffect, useMemo } from 'react';
import type { OverlayComponentProps } from '@sanity/visual-editing';
import type { InlineRun } from '@/lib/inline-rich';
import { htmlToRuns, normalizeRuns, runsToHtml } from '@/lib/inline-rich-write';
import {
  INLINE_EDIT_ATTRIBUTE,
  INLINE_EDIT_DONE_EVENT,
  blockChildrenFromRuns,
  classifyInlinePath,
  createTrailingWriter,
  editableBlockRuns,
  sameRuns,
  stegaRanges,
  typedPlainValue,
  withoutStega,
  type InlineTarget,
  type StoredSpan,
  type TrailingWriter,
} from '@/lib/preview-inline-edit';
import { valueAtPath, type PathSegment } from '@/lib/sanity-path';
import { setAt, unsetAt, useDraftDocument, type DraftPatch } from './useDraftDocument.ts';

/** The browser hands clicks inside these to the control, not to the text. */
const NOT_INSIDE = 'button, summary, select, option, label, textarea, input, [data-preview-clone]';

/** Inline tags a paragraph's bold and italic render as. */
const MARK_TAGS = new Set(['STRONG', 'B', 'EM', 'I']);

/** The draft door, as the session needs it. */
interface Door {
  readNow: () => Promise<Record<string, unknown> | null>;
  write: (patches: DraftPatch[]) => Promise<boolean>;
}

// -----------------------------------------------------------------------------
// Reading the editing surface
// -----------------------------------------------------------------------------

/**
 * Read an element as runs. `clean` is false when it holds anything a paragraph
 * of bold and italic cannot be (an icon, a link, a nested block), which is
 * what keeps such an element from being armed in the first place.
 */
function readRuns(root: Element): { runs: InlineRun[]; clean: boolean } {
  const runs: InlineRun[] = [];
  let clean = true;
  const walk = (node: Node, strong: boolean, em: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      runs.push({ text: withoutStega(node.nodeValue ?? ''), strong, em });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.tagName === 'BR') {
      runs.push({ text: ' ', strong, em });
      return;
    }
    const weight = el.style?.fontWeight ?? '';
    const styled = weight !== '' || (el.style?.fontStyle ?? '') !== '';
    if (!MARK_TAGS.has(el.tagName) && !(el.tagName === 'SPAN' && styled)) clean = false;
    const nextStrong =
      strong ||
      el.tagName === 'STRONG' ||
      el.tagName === 'B' ||
      weight === 'bold' ||
      /^[6-9]00$/.test(weight);
    const nextEm =
      em || el.tagName === 'EM' || el.tagName === 'I' || el.style?.fontStyle === 'italic';
    el.childNodes.forEach((child) => walk(child, nextStrong, nextEm));
  };
  root.childNodes.forEach((child) => walk(child, false, false));
  return { runs, clean };
}

/** The element's own text, when it is nothing but text (comments allowed). */
function onlyText(el: Element): string | null {
  let out = '';
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) out += child.nodeValue ?? '';
    else if (child.nodeType !== Node.COMMENT_NODE) return null;
  }
  return out;
}

/** Every text node under an element, in order. */
function textNodes(root: Node): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) out.push(node as Text);
  return out;
}

// -----------------------------------------------------------------------------
// The one editing session (module level: several overlay elements can point at
// the same paragraph, one per span, and they must share one surface)
// -----------------------------------------------------------------------------

interface Armed {
  surface: HTMLElement;
  target: InlineTarget;
  door: Door;
  /** Plain: the stored string. Block: the stored block's children. */
  original: string | StoredSpan[];
  /** Re-run the hover check (after letting go while still hovered). */
  rearm: () => void;
  editing: boolean;
  cleanup: Array<() => void>;
}

let armed: Armed | null = null;

function listen<K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  type: K,
  fn: (event: HTMLElementEventMap[K]) => void,
  into: Array<() => void>,
): void {
  el.addEventListener(type, fn as EventListener);
  into.push(() => el.removeEventListener(type, fn as EventListener));
}

function disarm(): void {
  if (!armed || armed.editing) return;
  armed.cleanup.forEach((off) => off());
  armed.surface.removeAttribute('contenteditable');
  armed = null;
}

/** Make the surface editable before the click, so the caret lands natively. */
function arm(state: Omit<Armed, 'editing' | 'cleanup'>): void {
  if (armed?.surface === state.surface) return;
  if (armed?.editing) return;
  disarm();
  const { surface, target } = state;
  const record: Armed = { ...state, editing: false, cleanup: [] };
  armed = record;
  if (target.kind === 'plain') {
    // Plain-text-only where the browser has it: no bold shortcut, no rich
    // paste, no stray <div> on Enter. Older browsers get `true` and the
    // beforeinput filter below does the same job.
    try {
      surface.contentEditable = 'plaintext-only';
    } catch {
      surface.contentEditable = 'true';
    }
  } else surface.contentEditable = 'true';
  listen(surface, 'pointerleave', () => disarm(), record.cleanup);
  listen(surface, 'focus', () => begin(record), record.cleanup);
}

function begin(record: Armed): void {
  if (armed !== record || record.editing) return;
  record.editing = true;
  const { surface, target, door } = record;
  const off: Array<() => void> = [];

  // Take the click-to-edit markers out of the text, after the caret. Kept per
  // node (the encoder appends one run to each string) so they can go back
  // when the editor lets go.
  const payloads = new Map<Text, string>();
  const originals = new Map<Text, string>();
  for (const node of textNodes(surface)) {
    const before = node.data;
    let removed = '';
    // Last run first, so each deletion leaves the earlier offsets valid.
    for (const [start, end] of stegaRanges(before)) {
      removed = before.slice(start, end) + removed;
      node.deleteData(start, end - start);
    }
    if (removed) payloads.set(node, removed);
    originals.set(node, node.data);
  }
  surface.setAttribute(INLINE_EDIT_ATTRIBUTE, '');
  const outline = surface.style.outline;
  // The overlay already draws the outline; the browser's focus ring on top of
  // it would be a second box.
  surface.style.outline = 'none';

  let changed = false;
  // Nothing is written unless the editor actually typed: clicking a heading and
  // clicking away must not create a draft.
  let typed = false;
  let writer: TrailingWriter<unknown>;
  let lastChildren: StoredSpan[] = Array.isArray(record.original) ? record.original : [];

  if (target.kind === 'plain') {
    writer = createTrailingWriter<unknown>(
      (value) => {
        changed = true;
        void door.write(setAt(target.path, value));
      },
      undefined,
      undefined,
      undefined,
      typeof record.original === 'string' ? record.original.trim() : undefined,
    );
  } else {
    const childrenPath: PathSegment[] = [...target.blockPath, 'children'];
    writer = createTrailingWriter<unknown>(
      (children) => {
        changed = true;
        lastChildren = children as StoredSpan[];
        void door.write(setAt(childrenPath, children));
      },
      undefined,
      undefined,
      (a, b) => JSON.stringify(a) === JSON.stringify(b),
    );
  }

  // Trimmed: a template that writes `<a>\n  {label}\n</a>` puts layout
  // whitespace around the words, and that whitespace is not the field's.
  const plainValue = (): string =>
    typedPlainValue(
      surface.textContent ?? '',
      typeof record.original === 'string' ? record.original : '',
      target.kind === 'plain' && target.multiline,
    ).trim();

  const blockChildren = (): StoredSpan[] =>
    blockChildrenFromRuns(normalizeRuns(readRuns(surface).runs), lastChildren);

  const onInput = () => {
    typed = true;
    if (target.kind === 'plain') {
      const value = plainValue();
      // A momentarily empty field (select all, then type) is not written:
      // the next keystroke brings the real value, and an empty write would
      // flash the section's fallback in the form panel.
      if (value.trim() !== '') writer.push(value);
    } else writer.push(blockChildren());
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing) return;
    const mod = event.metaKey || event.ctrlKey;
    if (event.key === 'Enter' || event.key === 'Escape') {
      // One line of copy in a page: Enter finishes, it does not add a line.
      // Escape finishes too and keeps the words (see the header).
      event.preventDefault();
      surface.blur();
      return;
    }
    if (mod && /^[biu]$/i.test(event.key)) {
      // Bold and italic only exist in a paragraph; underline nowhere.
      if (target.kind === 'plain' || event.key.toLowerCase() === 'u') event.preventDefault();
    }
    // Typing belongs to the text: page shortcuts (an accordion's Space, a
    // carousel's arrows) must not hear it.
    if (event.key !== 'Tab') event.stopPropagation();
  };

  const onBeforeInput = (event: InputEvent) => {
    const kind = event.inputType;
    if (kind === 'insertParagraph' || kind === 'insertLineBreak' || kind === 'insertFromDrop') {
      event.preventDefault();
      return;
    }
    if (kind.startsWith('format')) {
      const allowed = target.kind === 'block' && (kind === 'formatBold' || kind === 'formatItalic');
      if (!allowed) event.preventDefault();
    }
  };

  const onPaste = (event: ClipboardEvent) => {
    // What lands is exactly what will be stored: plain text in a plain field,
    // bold and italic and nothing else in a paragraph.
    event.preventDefault();
    const data = event.clipboardData;
    if (!data) return;
    if (target.kind === 'block') {
      const html = data.getData('text/html');
      const runs = html
        ? htmlToRuns(html)
        : normalizeRuns([{ text: data.getData('text/plain'), strong: false, em: false }]);
      document.execCommand('insertHTML', false, runsToHtml(runs));
      return;
    }
    let text = data.getData('text/plain').replace(/\r\n?/g, '\n');
    if (!target.multiline) text = text.replace(/\s*\n\s*/g, ' ');
    document.execCommand('insertText', false, text);
  };

  const onDrop = (event: DragEvent) => event.preventDefault();

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    off.forEach((fn) => fn());
    if (!typed) writer.cancel();
    else if (target.kind === 'plain') {
      const value = plainValue();
      if (value === '') {
        writer.cancel();
        changed = true;
        void door.write(unsetAt(target.path));
      } else {
        writer.push(value);
        writer.flush();
      }
    } else {
      writer.push(blockChildren());
      writer.flush();
    }

    surface.removeAttribute(INLINE_EDIT_ATTRIBUTE);
    surface.style.outline = outline;

    // Put the markers back so click-to-edit and instant text keep finding
    // this field. A plain field's payload is for the whole string, so it goes
    // on the end, where the encoder put it. A paragraph's markers belong to
    // its spans; they go back only when the paragraph is untouched, and
    // otherwise the server's render (already on its way for the write)
    // brings fresh ones.
    let rerender = false;
    if (target.kind === 'plain') {
      surface.normalize();
      const first = textNodes(surface)[0];
      const payload = [...payloads.values()][0] ?? '';
      if (payload) {
        if (first) first.appendData(payload);
        else surface.appendChild(document.createTextNode(payload));
      }
    } else if (!changed) {
      const untouched = [...originals].every(
        ([node, data]) => node.isConnected && surface.contains(node) && node.data === data,
      );
      if (untouched) payloads.forEach((payload, node) => node.appendData(payload));
      else rerender = true;
    }

    window.dispatchEvent(new CustomEvent(INLINE_EDIT_DONE_EVENT, { detail: { rerender } }));
    record.editing = false;
    const hovered = surface.matches(':hover');
    disarm();
    if (hovered) record.rearm();
  };

  listen(surface, 'input', onInput, off);
  listen(surface, 'keydown', onKeyDown, off);
  listen(surface, 'beforeinput', onBeforeInput, off);
  listen(surface, 'paste', onPaste, off);
  listen(surface, 'drop', onDrop, off);
  listen(surface, 'blur', finish, off);
  // If the element is removed while being typed into (a fallback full swap),
  // send what was typed rather than lose it.
  const watch = new MutationObserver(() => {
    if (!surface.isConnected) finish();
  });
  watch.observe(document.getElementById('main') ?? document.body, {
    childList: true,
    subtree: true,
  });
  off.push(() => watch.disconnect());
}

// -----------------------------------------------------------------------------
// The overlay component: one per text element, renders nothing
// -----------------------------------------------------------------------------

/** Find and verify the editing surface for a hovered element, or null. */
async function resolveSurface(
  element: HTMLElement,
  target: InlineTarget,
  door: Door,
): Promise<{ surface: HTMLElement; original: string | StoredSpan[] } | null> {
  if (element.closest(NOT_INSIDE) || element.isContentEditable) return null;
  const doc = await door.readNow();
  if (!doc) return null;

  if (target.kind === 'plain') {
    const stored = valueAtPath(doc, target.path);
    if (typeof stored !== 'string' || stored.trim() === '') return null;
    // Exactly the stored words, give or take the template's own whitespace
    // around them. Anything else (formatted, truncated, split) is not armed.
    const shown = onlyText(element);
    if (shown === null || withoutStega(shown).trim() !== stored.trim()) return null;
    return { surface: element, original: stored };
  }

  const block = valueAtPath(doc, target.blockPath);
  const runs = editableBlockRuns(block);
  if (!runs) return null;
  // The clicked span renders inside its paragraph, perhaps in a <strong>:
  // climb out of the mark tags to the element that holds the whole block.
  let surface: HTMLElement | null = element;
  while (surface && MARK_TAGS.has(surface.tagName)) surface = surface.parentElement;
  if (!surface || surface.closest(NOT_INSIDE)) return null;
  const shown = readRuns(surface);
  if (!shown.clean || !sameRuns(shown.runs, runs)) return null;
  const children = (block as { children?: StoredSpan[] }).children ?? [];
  return { surface, original: children };
}

export default function InlineText(props: OverlayComponentProps): React.ReactNode {
  const { node, element, type } = props;
  const target = useMemo(() => classifyInlinePath(node.path, type), [node.path, type]);
  const { readNow, write } = useDraftDocument(node.id);

  useEffect(() => {
    if (!target || !(element instanceof HTMLElement)) return;
    const door: Door = { readNow, write };
    let alive = true;
    const tryArm = () => {
      void resolveSurface(element, target, door).then((found) => {
        // The pointer may have moved on while the draft was read.
        if (!alive || !found || !found.surface.matches(':hover')) return;
        arm({ surface: found.surface, target, door, original: found.original, rearm: tryArm });
      });
    };
    element.addEventListener('pointerenter', tryArm);
    // Mounted under a pointer that is already there (the overlay mounts these
    // as elements scroll into view).
    if (element.matches(':hover')) tryArm();
    return () => {
      alive = false;
      element.removeEventListener('pointerenter', tryArm);
    };
  }, [element, target, readNow, write]);

  return null;
}
