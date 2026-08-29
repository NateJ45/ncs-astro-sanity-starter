// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// styles - the look of the in-canvas controls (2026-08-28)
// =============================================================================
// These controls float OVER the page inside the Presentation preview, so they
// have to read as tools rather than as content. That means a fixed light chrome
// in both themes (a white card on a dark band still reads as a control, a dark
// card on a dark band reads as part of the design), the site's own type, and
// nothing that could be mistaken for something a visitor will see.
//
// PLAIN OBJECTS, NOT @sanity/ui. The Studio's component kit would drag
// styled-components and its theme into the PREVIEW ISLAND, which is bundled with
// the site. The whole layer is a few dozen inline styles instead; that is the
// entire cost of keeping the public bundle where it was.
//
// CANONICAL, WITH ONE SEAM. presacademy and WCP each carry a near-identical copy
// of this file whose only real difference is the six-value palette at the top:
// one is Ink on Paper, the other is navy on white. That palette now lives in
// ./tool-theme.ts, which is the per-repo half; everything below is the same
// everywhere and is owned here. A fork edits tool-theme.ts and nothing else.
//
// SOME OF WHAT IS BELOW IS UNUSED IN THIS REPO, ON PURPOSE. `handleAnchor`,
// `panel`, `panelHead`, `closeButton`, `optionRow`, `optionDot` and `groupLabel`
// dress the SURFACE CARD that hangs off a section's corner handle in the sibling
// repos. This template has no such card and will not grow one (PORTS.md card 26
// and CLAUDE.md #9: blocks carry no colour field), but the vocabulary belongs to
// the family rather than to one site, and re-deriving it in the next repo is
// exactly what a library of record exists to prevent. They are plain top-level
// consts, so the bundler drops the ones nobody imports.
// =============================================================================
import type { CSSProperties } from 'react';
import { TOOL } from './tool-theme.ts';

export { TOOL };

/** Everything a floating strip looks like, minus where it sits. */
const barBase: CSSProperties = {
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 8px',
  borderRadius: '999px',
  background: TOOL.paper,
  border: `1px solid ${TOOL.line}`,
  boxShadow: TOOL.shadow,
  font: `500 12px/1.2 ${TOOL.font}`,
  color: TOOL.ink,
  flexWrap: 'wrap',
};

/**
 * The strip inside a TEXT element's outline (a heading, a subhead). Those
 * elements are comfortably bigger than the strip, so it sits in their corner.
 */
export const bar: CSSProperties = {
  ...barBase,
  right: '8px',
  bottom: '8px',
  maxWidth: 'calc(100% - 16px)',
};

/**
 * The ANCHOR a panel hangs from when its trigger is a small square handle pinned
 * to a section's top-right: the panel drops from the handle's bottom edge and
 * grows leftwards, which keeps it on screen.
 *
 * FLUSH, WITH NO DEAD GAP (2026-08-28). The visible card is offset from the
 * handle by `paddingTop` on THIS box rather than by `top: calc(100% + 6px)`, so
 * the six pixels between handle and card belong to the overlay too. Pointer
 * events on this element are `all` (it is rendered through the host's
 * `PointerEvents`), which is what makes the host treat a pointer crossing that
 * strip as "still on overlay chrome" - see the deferred-leave branch of
 * `mouseleave` in the host's controller.ts, which only defers when
 * `findOverlayElement(relatedTarget)` finds an overlay ancestor.
 */
export const handleAnchor: CSSProperties = {
  position: 'absolute',
  right: 0,
  top: '100%',
  paddingTop: '6px',
  zIndex: 3,
};

/** A panel of choices: a small labelled card, not a bare row of dots. */
export const panel: CSSProperties = {
  width: '208px',
  maxWidth: 'calc(100vw - 24px)',
  borderRadius: '10px',
  background: TOOL.paper,
  border: `1px solid ${TOOL.line}`,
  boxShadow: TOOL.shadow,
  font: `400 13px/1.4 ${TOOL.font}`,
  color: TOOL.ink,
  textAlign: 'left',
  overflow: 'hidden',
};

/** The panel's title bar: what this is, and the way out of it. */
export const panelHead: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  padding: '8px 8px 8px 10px',
  borderBottom: `1px solid ${TOOL.line}`,
};

/** The close control. Square, quiet, and big enough to hit. */
export const closeButton: CSSProperties = {
  appearance: 'none',
  border: '1px solid transparent',
  background: 'transparent',
  color: TOOL.muted,
  borderRadius: '6px',
  width: '22px',
  height: '22px',
  lineHeight: 1,
  padding: 0,
  cursor: 'pointer',
  font: `600 13px/1 ${TOOL.font}`,
  flex: '0 0 auto',
};

/** One choice: a colour dot, its name, and a mark when it is the current one. */
export function optionRow(selected: boolean, hovered: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    boxSizing: 'border-box',
    padding: '5px 10px',
    appearance: 'none',
    border: 'none',
    borderLeft: `2px solid ${selected ? TOOL.ink : 'transparent'}`,
    background: hovered ? TOOL.line : 'transparent',
    color: TOOL.ink,
    font: `${selected ? 600 : 400} 13px/1.3 ${TOOL.font}`,
    textAlign: 'left',
    cursor: 'pointer',
  };
}

/** The dot inside an option row. Same split-fill idea as the Studio swatch. */
export function optionDot(background: string, size = 16): CSSProperties {
  return {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '999px',
    border: `1px solid ${TOOL.line}`,
    background,
    flex: '0 0 auto',
  };
}

/** The little uppercase heading over a group of rows inside a panel. */
export const groupLabel: CSSProperties = {
  display: 'block',
  padding: '8px 10px 4px',
  borderTop: `1px solid ${TOOL.line}`,
  font: `600 10px/1.2 ${TOOL.font}`,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: TOOL.muted,
};

/**
 * A short explanatory line inside a panel, where a group of rows would be.
 *
 * Added 2026-08-28 for ncs-church-starter's surface card, which has to say WHY
 * it is offering nothing when a section carries a background photo: that
 * section paints white text over the picture and never wears its surface
 * classes, so the choices would be a knob attached to nothing. A control that
 * hides itself silently reads as a bug; one that says why reads as a rule.
 */
export const note: CSSProperties = {
  margin: 0,
  padding: '2px 10px 10px',
  color: TOOL.muted,
  font: `400 12px/1.4 ${TOOL.font}`,
};

/** A card that opens from a control: the word picker, the text editor. */
export const card: CSSProperties = {
  position: 'absolute',
  minWidth: '240px',
  maxWidth: 'min(420px, calc(100vw - 32px))',
  padding: '12px',
  borderRadius: '10px',
  background: TOOL.paper,
  border: `1px solid ${TOOL.line}`,
  boxShadow: TOOL.shadow,
  font: `400 13px/1.45 ${TOOL.font}`,
  color: TOOL.ink,
  textAlign: 'left',
};

/** A plain text button, used for every label in the layer. */
export const button: CSSProperties = {
  appearance: 'none',
  border: `1px solid ${TOOL.line}`,
  background: TOOL.paper,
  color: TOOL.ink,
  borderRadius: '999px',
  padding: '4px 10px',
  font: `600 12px/1.2 ${TOOL.font}`,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

/** The same button, filled, for the one primary action on a card. */
export const primaryButton: CSSProperties = {
  ...button,
  background: TOOL.ink,
  color: TOOL.paper,
  borderColor: TOOL.ink,
};

/** Small muted caption text inside a bar or a card. */
export const caption: CSSProperties = {
  font: `600 10px/1.2 ${TOOL.font}`,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: TOOL.muted,
};

/** The editing surface in the text popover: textarea and contenteditable alike. */
export const field: CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  minHeight: '64px',
  maxHeight: '40vh',
  overflowY: 'auto',
  padding: '8px 10px',
  borderRadius: '6px',
  border: `1px solid ${TOOL.line}`,
  background: TOOL.paper,
  color: TOOL.ink,
  font: `400 14px/1.5 ${TOOL.font}`,
  resize: 'none',
  outline: 'none',
};
