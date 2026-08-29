// Safe to edit by hand
// =============================================================================
// HeadingAccentPicker - pick the accent word by clicking it (card 28)
// =============================================================================
// The Studio's own steps for the accent word are: write the heading, copy one
// word out of it into a box, and "if nothing changes, the word is not in the
// heading, so check the spelling". Three steps, one of which is a warning about
// a typo. Clicking the word removes all three: the stored value is a slice of
// the heading by construction, so it cannot miss.
//
// THE PAGE DOM IS NEVER TOUCHED. The words are redrawn INSIDE the card as
// buttons, from the heading as the document stores it. Splitting the real
// heading element into spans would mean editing the rendered page from an
// overlay, and the rendered page is the thing being previewed.
//
// Clicking the word that is already accented clears it, which is the same
// gesture as un-bolding: press the thing that is on to turn it off.
//
// THE ONE PLACE THIS CONTROL CANNOT REACH, stated plainly. A heading whose
// accent word HAS matched renders the stega-cleaned string (the accepted cost
// written up in src/lib/heading-accent.ts), so that element carries no path and
// the overlay never offers anything on it. The picker is therefore the way IN to
// an accent and the way to fix one that does not match; changing a word that
// currently matches is still done in the form. Adding a preview-only handle to
// close that gap is possible and deliberately not done - see PORTS.md card 28.
//
// The word splitting, and the rule that punctuation stays on the label but off
// the stored value, live in src/lib/heading-accent.ts beside the matcher they
// have to agree with.
// =============================================================================
import { useEffect, useRef, useState } from 'react';
import type { OverlayComponentProps } from '@sanity/visual-editing';
import { isAccentedWord, splitHeadingWords } from '@/lib/heading-accent';
import { resolveAccentTarget, type AccentTarget } from '@/lib/section-fields';
import { valueAtPath } from '@/lib/sanity-path';
import { setAt, unsetAt, useDraftDocument } from './useDraftDocument.ts';
import { usePopover } from './usePopover.ts';
import { TOOL, bar, button, card, caption } from './styles.ts';

interface Loaded {
  target: AccentTarget;
  heading: string;
  accent: string;
}

export default function HeadingAccentPicker(props: OverlayComponentProps): React.ReactNode {
  const { node, PointerEvents, element, focused } = props;
  const { read, write } = useDraftDocument(node.id);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { onKeyDown } = usePopover(open, cardRef, () => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  });

  useEffect(() => {
    let alive = true;
    void read().then((doc) => {
      if (!alive || !doc) return;
      const target = resolveAccentTarget(doc, node.path);
      if (!target) {
        setLoaded(null);
        return;
      }
      const stored = valueAtPath(doc, target.headingPath);
      const accent = valueAtPath(doc, target.accentPath);
      setLoaded({
        target,
        // The STORED heading, not the rendered one: no stega, and no accent
        // markup already applied. The element's own text is the fallback for a
        // heading rendering something the document does not hold.
        heading: typeof stored === 'string' && stored !== '' ? stored : (element.textContent ?? ''),
        accent: typeof accent === 'string' ? accent : '',
      });
    });
    return () => {
      alive = false;
    };
  }, [read, node.path, element]);

  // Selected, not merely on screen: `activated` in this host means "in the
  // viewport", so an ungated control would appear on every heading at once.
  // Clicking the heading is already the gesture for choosing it.
  if (!focused || !loaded) return null;

  const tokens = splitHeadingWords(loaded.heading);
  if (!tokens.some((t) => t.word)) return null;

  const choose = (value: string, clearing: boolean) => {
    setLoaded((current) => (current ? { ...current, accent: clearing ? '' : value } : current));
    const path = loaded.target.accentPath;
    void write(clearing ? unsetAt(path) : setAt(path, value));
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
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
          {loaded.accent ? 'Change the accent word' : 'Accent a word'}
        </button>
      </PointerEvents>

      {open && (
        <PointerEvents style={{ position: 'absolute', right: '8px', top: '100%', zIndex: 2 }}>
          <div
            ref={cardRef}
            role="dialog"
            aria-label="Choose a word to accent"
            tabIndex={-1}
            style={{ ...card, position: 'static' }}
            onKeyDown={onKeyDown}
            onClick={(event) => event.stopPropagation()}
          >
            <p style={{ ...caption, margin: '0 0 8px' }}>Click a word</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', alignItems: 'baseline' }}>
              {tokens.map((token, i) =>
                token.word ? (
                  <button
                    key={i}
                    type="button"
                    style={{
                      ...button,
                      padding: '2px 6px',
                      font: `600 14px/1.4 ${TOOL.font}`,
                      background: isAccentedWord(token, loaded.accent) ? TOOL.ink : TOOL.paper,
                      color: isAccentedWord(token, loaded.accent) ? TOOL.paper : TOOL.ink,
                      borderColor: isAccentedWord(token, loaded.accent) ? TOOL.ink : TOOL.line,
                    }}
                    aria-pressed={isAccentedWord(token, loaded.accent)}
                    onClick={(event) => {
                      event.stopPropagation();
                      choose(token.value, isAccentedWord(token, loaded.accent));
                    }}
                  >
                    {token.text}
                  </button>
                ) : (
                  <span key={i} aria-hidden="true" style={{ width: '2px' }} />
                ),
              )}
            </div>
            <p style={{ margin: '10px 0 0', color: TOOL.muted, fontSize: '12px' }}>
              {loaded.accent
                ? 'Click the accented word again to make the heading plain.'
                : 'One word per heading. It takes the brand accent colour.'}
            </p>
          </div>
        </PointerEvents>
      )}
    </>
  );
}
