// Foundation, edit with care
// =============================================================================
// preview-edit-attr - explicit `data-sanity` targets for whole SECTIONS
// (ported from presacademy 2026-08-28; PORTS.md card 17)
// =============================================================================
// Stega markers give click-to-edit on TEXT. A whole section (its band, its
// images, its empty space) has no text of its own to click, so the Presentation
// overlay cannot draw section-level controls from stega alone. An explicit
// `data-sanity` attribute on each section wrapper fixes that: the overlay
// outlines the section as ONE array item and shows the array controls in the
// canvas (insert before/after through the grouped insert menu, duplicate,
// remove, drag to reorder). That is the Squarespace feel.
//
// Three rules, each of which was learned the hard way somewhere in the family:
//
//  1. PREVIEW SURFACES ONLY. The live site never renders these attributes: the
//     static pages pass no `editDoc`, so SectionRenderer emits no wrapper and
//     no attribute there. `npm run parity compare` is the gate on that promise.
//  2. The attribute must sit on a REAL block box. The overlay outlines the
//     element's rect, and a `display: contents` element has no rect.
//  3. The field name must be the array the sections actually live in. In this
//     template that is `pageBuilder` on every type (singletons and custom
//     `page` docs alike), which is simpler than the sibling repos, where
//     singletons and page docs disagree. Point the overlay at the wrong array
//     and every control silently edits nothing.
//
// Drag-and-drop needs no extra props in @sanity/visual-editing 5.4.5: it is on
// as soon as the attribute exists.
// =============================================================================
import { createDataAttribute } from '@sanity/visual-editing/create-data-attribute';

export interface EditDoc {
  /** The PUBLISHED document id (no `drafts.` prefix). */
  id: string;
  /** The document _type, e.g. "page" or "aboutPage". */
  type: string;
  /** The array field holding the sections. One name in this template. */
  field?: 'pageBuilder';
}

/** The `data-sanity` value that targets one section array item on a doc. */
export function sectionEditAttr(doc: EditDoc, key: string): string {
  return createDataAttribute({
    id: doc.id.replace(/^drafts\./, ''),
    type: doc.type,
    baseUrl: '/studio',
  })(`${doc.field ?? 'pageBuilder'}[_key=="${key}"]`).toString();
}

/**
 * The `data-sanity` value that targets a field on ANY document - the
 * WordPress-template-part gesture (2026-08-28). PreviewLayout wraps the shared
 * Header and Footer in this attribute pointed at `siteSettings`, so in Edit
 * mode the chrome outlines as one editable surface and a click switches the
 * Presentation edit panel to the owning document, opened at `path`.
 */
export function docEditAttr(id: string, type: string, path: string): string {
  return createDataAttribute({
    id: id.replace(/^drafts\./, ''),
    type,
    baseUrl: '/studio',
  })(path).toString();
}
