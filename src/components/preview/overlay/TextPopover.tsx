// Safe to edit by hand
// =============================================================================
// TextPopover - type the line where the line is (card 28)
// =============================================================================
// Eighty per cent of editing is changing some words. Today that means clicking
// the words, watching the form panel scroll to the right box, and typing there
// while looking away from the thing being changed. This is the same edit without
// the look-away: a pencil on the element, a card anchored to it, the current
// value already in the box.
//
// TWO KINDS OF FIELD, one card:
//   - the two document-level hero strings on the bespoke pages (faq, contact,
//     journal, privacy, 404) are plain strings, so the card holds a TEXTAREA.
//     Enter saves, Shift+Enter is a newline, Escape cancels.
//   - the six curated subheads are rich twins (src/lib/inline-rich.ts): one
//     paragraph, bold and italic, nothing else. The card holds a
//     CONTENTEDITABLE with two buttons.
//
// WHERE THE INTERESTING LOGIC IS. Everything that decides what gets STORED lives
// in src/lib/inline-rich-write.ts and is unit-tested there: the allow-list HTML
// parser (used on paste, so a paragraph pasted out of Word keeps its bold and
// loses its fonts, colours and tables), the mirror that turns runs back into
// markup, and the builder for the one-block portable text the twin holds. The
// only thing this file adds is `domToRuns`, a dozen lines that read the live
// editing surface, because re-parsing the browser's own markup would be a round
// trip for nothing.
//
// The rich twin is written even when the section currently shows its PLAIN
// string: the twin is seeded from that string, so an editor's first emphasis in
// this card keeps every word that was already there and the plain field stays
// untouched underneath as the fallback. Clearing the box unsets the twin and the
// plain string renders again - the same behaviour as emptying the twin's box in
// the form.
// =============================================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import type { OverlayComponentProps } from '@sanity/visual-editing';
import type { InlineRun } from '@/lib/inline-rich';
import { htmlToRuns, normalizeRuns, runsToHtml, runsToInlineRich } from '@/lib/inline-rich-write';
import { resolveTextTarget, type TextTarget } from '@/lib/section-fields';
import { setAt, unsetAt, useDraftDocument } from './useDraftDocument.ts';
import { usePopover } from './usePopover.ts';
import { TOOL, bar, button, card, caption, field, primaryButton } from './styles.ts';

/** Tags whose boundary is a space once the value is one paragraph. */
const BLOCKISH = new Set(['div', 'p', 'li', 'blockquote']);

/** Read the live editing surface into runs. The counterpart of `seedBox`. */
function domToRuns(root: Node): InlineRun[] {
  const runs: InlineRun[] = [];
  const walk = (node: Node, strong: boolean, em: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      runs.push({ text: node.nodeValue ?? '', strong, em });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === 'br') {
      runs.push({ text: ' ', strong, em });
      return;
    }
    if (BLOCKISH.has(tag) && runs.length) runs.push({ text: ' ', strong, em });
    const weight = el.style?.fontWeight ?? '';
    const nextStrong =
      strong || tag === 'b' || tag === 'strong' || weight === 'bold' || /^[6-9]00$/.test(weight);
    const nextEm = em || tag === 'i' || tag === 'em' || el.style?.fontStyle === 'italic';
    el.childNodes.forEach((child) => walk(child, nextStrong, nextEm));
  };
  root.childNodes.forEach((child) => walk(child, false, false));
  return normalizeRuns(runs);
}

/** Fill the editing surface from runs, building real nodes rather than markup. */
function seedBox(box: HTMLElement, runs: InlineRun[]): void {
  box.replaceChildren(
    ...runs.map((run) => {
      const text = document.createTextNode(run.text);
      if (!run.strong && !run.em) return text;
      const inner = run.em ? document.createElement('em') : null;
      const outer = run.strong ? document.createElement('strong') : inner!;
      if (inner && run.strong) outer.appendChild(inner);
      (inner ?? outer).appendChild(text);
      return outer;
    }),
  );
}

export default function TextPopover(props: OverlayComponentProps): React.ReactNode {
  const { node, PointerEvents, focused } = props;
  const { read, write } = useDraftDocument(node.id);
  const [target, setTarget] = useState<TextTarget | null>(null);
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }, []);
  const { onKeyDown } = usePopover(
    open,
    cardRef,
    close,
    target?.kind === 'plain' ? areaRef : boxRef,
  );

  // Resolve what this element edits, and read its current value.
  useEffect(() => {
    let alive = true;
    void read().then((doc) => {
      if (!alive || !doc) return;
      setTarget(resolveTextTarget(doc, node.path));
    });
    return () => {
      alive = false;
    };
  }, [read, node.path]);

  // Seed the box each time the card opens, so a cancelled edit is really gone.
  useEffect(() => {
    if (!open || !target) return;
    if (target.kind === 'plain') {
      if (areaRef.current) areaRef.current.value = target.text;
    } else if (boxRef.current) {
      seedBox(boxRef.current, target.runs);
    }
  }, [open, target]);

  // Selected, not merely on screen: `activated` in this host means "in the
  // viewport", so an ungated control would appear on every matching element at
  // once. Clicking the words is already the gesture for choosing them.
  if (!focused || !target) return null;

  const save = () => {
    if (target.kind === 'plain') {
      const value = (areaRef.current?.value ?? '').replace(/\s+$/, '');
      setTarget({ ...target, text: value });
      void write(value.trim() === '' ? unsetAt(target.path) : setAt(target.path, value));
    } else if (boxRef.current) {
      const runs = domToRuns(boxRef.current);
      const blocks = runsToInlineRich(runs);
      setTarget({ ...target, runs });
      void write(blocks.length ? setAt(target.path, blocks) : unsetAt(target.path));
    }
    close();
  };

  /** Bold and italic, without a toolbar library and without losing the caret. */
  const mark = (command: 'bold' | 'italic') => {
    boxRef.current?.focus({ preventScroll: true });
    try {
      // Ask for tags rather than inline styles; the reader understands both.
      document.execCommand('styleWithCSS', false, 'false');
      document.execCommand(command, false);
    } catch {
      /* an environment without execCommand simply has no shortcut buttons */
    }
  };

  return (
    <>
      <PointerEvents style={bar}>
        <button
          ref={triggerRef}
          type="button"
          style={button}
          aria-expanded={open}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((was) => !was);
          }}
        >
          ✎ Edit here
        </button>
      </PointerEvents>

      {open && (
        <PointerEvents style={{ position: 'absolute', left: 0, top: '100%', zIndex: 2 }}>
          <div
            ref={cardRef}
            role="dialog"
            aria-label={`Edit ${target.label}`}
            tabIndex={-1}
            style={{ ...card, position: 'static', width: '340px' }}
            onKeyDown={onKeyDown}
            onClick={(event) => event.stopPropagation()}
            onBlur={(event) => {
              // Focus leaving the card entirely is a save, the way clicking away
              // from a form field is. Focus moving BETWEEN the card's own
              // controls is not.
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) save();
            }}
          >
            <p style={{ ...caption, margin: '0 0 8px' }}>{target.label}</p>

            {target.kind === 'rich' && (
              <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                {(['bold', 'italic'] as const).map((command) => (
                  <button
                    key={command}
                    type="button"
                    style={{
                      ...button,
                      padding: '2px 10px',
                      fontStyle: command === 'italic' ? 'italic' : 'normal',
                      fontWeight: command === 'bold' ? 800 : 500,
                    }}
                    aria-label={command === 'bold' ? 'Bold' : 'Italic'}
                    // Keep the selection: a button that took focus first would
                    // have nothing to embolden by the time it ran.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={(event) => {
                      event.stopPropagation();
                      mark(command);
                    }}
                  >
                    {command === 'bold' ? 'B' : 'I'}
                  </button>
                ))}
              </div>
            )}

            {target.kind === 'plain' ? (
              <textarea
                ref={areaRef}
                rows={target.rows}
                defaultValue={target.text}
                style={field}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    save();
                  }
                }}
              />
            ) : (
              <div
                ref={boxRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="false"
                style={field}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    save();
                  }
                }}
                onPaste={(event) => {
                  // One paragraph, two marks. Anything else in the clipboard
                  // would be thrown away on save, so throw it away on the way in
                  // and let the editor see what they are going to get. What
                  // survives is exactly what the allow-list parser keeps.
                  event.preventDefault();
                  const html = event.clipboardData.getData('text/html');
                  const runs = html
                    ? htmlToRuns(html)
                    : normalizeRuns([
                        {
                          text: event.clipboardData.getData('text/plain'),
                          strong: false,
                          em: false,
                        },
                      ]);
                  document.execCommand('insertHTML', false, runsToHtml(runs));
                }}
              />
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '10px',
                gap: '8px',
              }}
            >
              <span style={{ color: TOOL.muted, fontSize: '11px' }}>
                {target.kind === 'plain'
                  ? 'Enter saves · Shift+Enter is a new line'
                  : 'Enter saves'}
                {' · Esc cancels'}
              </span>
              <button
                type="button"
                style={primaryButton}
                onClick={(event) => {
                  event.stopPropagation();
                  save();
                }}
              >
                Save
              </button>
            </div>
          </div>
        </PointerEvents>
      )}
    </>
  );
}
