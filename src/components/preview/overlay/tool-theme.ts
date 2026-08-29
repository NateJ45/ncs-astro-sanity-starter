// Safe to edit by hand
// =============================================================================
// tool-theme - the ONE per-repo thing about the in-canvas controls (card 28)
// =============================================================================
// `styles.ts` beside this file is canonical: every repo in the family draws the
// same tool chrome, and the shapes, radii, shadows and spacing are shared. The
// only thing that is genuinely this project's own is the six values below, so
// they live here, alone, and a fork edits this file and nothing else.
//
// FIXED, AND THEME-INDEPENDENT ON PURPOSE. These controls float over the page,
// so they have to read as TOOLS rather than as content: a white card on a dark
// band still reads as a control, a dark card on a dark band reads as part of the
// design. The values are written as LITERALS rather than `var(--color-...)` for
// the same reason - the site's tokens flip in dark mode, and a tool that flipped
// with them would disappear against the band it sits on.
//
// The hexes here are the light-mode brand tokens from src/styles/globals.css
// (Ink, Cool Gray, the body font). `npm run apply-brand` does NOT rewrite this
// file; a rebrand that changes the ink or the body face should update it by hand
// in the same pass, and nothing breaks if it does not - the controls simply stay
// in the old neutral.
// =============================================================================

/** The palette and type the canonical `styles.ts` draws every control with. */
export interface ToolTheme {
  /** Card and button background. */
  paper: string;
  /** Text, and the filled state of a pressed control. */
  ink: string;
  /** Captions and secondary text. */
  muted: string;
  /** Hairline borders. */
  line: string;
  /** The drop shadow that lifts a floating card off the page. */
  shadow: string;
  /** The font stack, matching the site's body face. */
  font: string;
}

export const TOOL: ToolTheme = {
  paper: '#FFFFFF',
  ink: '#2A2D31',
  muted: '#586577',
  line: 'rgba(42, 45, 49, 0.14)',
  shadow: '0 6px 20px rgba(42, 45, 49, 0.22), 0 1px 2px rgba(42, 45, 49, 0.16)',
  font: '"Inter Variable", system-ui, -apple-system, sans-serif',
};
