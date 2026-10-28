// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// submenuWidthFix - give the canvas section menu's submenus their width back
// (2026-10-27)
// =============================================================================
// Right-click a section in the preview and the menu's "Move" (and "Insert
// before / after") submenu opened as an empty 8px sliver.
//
// Upstream cause, @sanity/visual-editing 6.1.3 with @sanity/ui 4.4.9: the
// context menu's submenus are @sanity/ui `MenuGroup` popovers with
// `constrainSize` and no portal, so they render INSIDE the parent menu, whose
// box scrolls (`overflow: auto`). The popover's size step then measures the
// room left inside that parent menu, which beside it is none, and writes
// `max-width: 0px` inline. Found on reid-design-site and first-baptist-auburn
// alike (PORTS.md card 201); it is not a site's CSS.
//
// The menu items themselves are fine (they are in the DOM, four of them), so
// lifting the inline cap is the whole fix. A stylesheet `!important` beats an
// inline style without one. Only the submenu popovers are touched; the
// top-level menu keeps its own 120-160px bounds.
//
// Drop this when a visual-editing release portals or unconstrains its submenus:
// right-click a section, hover Move, and the menu shows without it.
// =============================================================================

const STYLE_ID = 'ncs-overlay-submenu-width';

/** Add the rule once; returns a function that removes it. */
export function installSubmenuWidthFix(doc: Document = document): () => void {
  if (doc.getElementById(STYLE_ID)) return () => {};
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = '[data-ui="MenuGroup__popover"]{max-width:none !important;}';
  doc.head.appendChild(style);
  return () => style.remove();
}
