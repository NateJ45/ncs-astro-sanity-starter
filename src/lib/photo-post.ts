// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// "Post a photo": the pure half (Studio kit, PORTS.md card 125)
// =============================================================================
// The Quick update tool's photo action (src/sanity/kit/PostPhoto.tsx) takes a
// photo from the phone's camera or gallery, uploads it to Sanity with a
// description, and adds it to a gallery on a page or to a new post. It only
// ever writes a DRAFT: nothing reaches the website until the editor opens the
// page and presses Publish.
//
// This file holds what can be checked without a browser or a Studio: the form's
// checks, the size a photo is shrunk to, the GROQ that finds the galleries, the
// gallery choices, the photo value, and the patch path. src/lib/photo-post.test.ts
// tests all of it.
// =============================================================================

/** Where a gallery lives in a document, with the starter's names as defaults. */
export interface GallerySpec {
  /** The page-builder array field. Default 'pageBuilder'. */
  builderField: string;
  /** The gallery section's type. Default 'gallerySection'. */
  sectionType: string;
  /** The section's photos array. Default 'images'. */
  field: string;
  /** The photo's description (alt text) field. Default 'alt'. */
  altField: string;
  /** The photo's caption field, or null when the gallery has none. Default 'caption'. */
  captionField: string | null;
}

export const DEFAULT_GALLERY: GallerySpec = {
  builderField: 'pageBuilder',
  sectionType: 'gallerySection',
  field: 'images',
  altField: 'alt',
  captionField: 'caption',
};

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const KEY = /^[A-Za-z0-9_-]{1,64}$/;

/** The spec with defaults filled in; throws on a name that is not a plain field name. */
export function gallerySpec(partial?: Partial<GallerySpec>): GallerySpec {
  const spec = { ...DEFAULT_GALLERY, ...partial };
  for (const name of [spec.builderField, spec.sectionType, spec.field, spec.altField]) {
    if (!IDENT.test(name)) throw new Error(`postPhoto: "${name}" is not a plain field name`);
  }
  if (spec.captionField !== null && !IDENT.test(spec.captionField)) {
    throw new Error(`postPhoto: "${spec.captionField}" is not a plain field name`);
  }
  return spec;
}

/**
 * GROQ for every document of $types that has at least one gallery, with each
 * gallery's key, heading and photo count. Run it with the drafts perspective
 * so a gallery added in an unpublished draft shows too. Field names come from
 * gallerySpec() (checked), never from the editor.
 */
export function galleryQuery(spec: GallerySpec): string {
  const b = spec.builderField;
  return (
    `*[_type in $types && count(${b}[_type == "${spec.sectionType}"]) > 0]` +
    `{_id, _type, "title": coalesce(title, heading, name), ` +
    `"galleries": ${b}[_type == "${spec.sectionType}"]{_key, heading, "count": count(${spec.field})}}` +
    ` | order(_type asc, title asc)`
  );
}

export interface GalleryDoc {
  _id: string;
  _type: string;
  title?: string | null;
  galleries?: Array<{ _key?: string; heading?: string | null; count?: number | null }> | null;
}

/**
 * Card 143: photos that live straight on a document, not in a page-builder
 * gallery (a room story's own `gallery` list). The tool then offers each such
 * document as a place for the photo.
 */
export interface StorySpec {
  /** Document types that hold a photo list of their own (["project"]). */
  types: string[];
  /** The photo list field on that type. Default 'gallery'. */
  field: string;
  /** The photo's description field. Default 'alt'. */
  altField: string;
  /** The photo's caption field, or null. Default 'caption'. */
  captionField: string | null;
  /** The word for one of them in the list ("Room story"). Default: the type's title. */
  noun?: string;
}

/** The spec with defaults; throws on a field name that is not plain. */
export function storySpec(partial: Partial<StorySpec> & { types: string[] }): StorySpec {
  const spec = {
    field: 'gallery',
    altField: 'alt',
    captionField: 'caption' as string | null,
    ...partial,
  };
  for (const n of [spec.field, spec.altField, spec.captionField ?? 'x'])
    if (!IDENT.test(n)) throw new Error('postPhoto: a story field name is not valid');
  return spec;
}

/** GROQ for every document of $types, with its photo count. Run with the drafts perspective. */
export function storyQuery(spec: StorySpec): string {
  return (
    `*[_type in $types]{_id, _type, "title": coalesce(title, heading, name), ` +
    `"count": count(coalesce(${spec.field}, []))} | order(title asc)`
  );
}

export interface StoryDoc {
  _id: string;
  _type: string;
  title?: string | null;
  count?: number | null;
}

/** One choice per document (a draft and its published copy count once), labelled "Name (n photos)". */
export function storyChoices(
  docs: StoryDoc[],
  typeTitle: (type: string) => string = (t) => t,
  noun?: string,
): GalleryChoice[] {
  const out: GalleryChoice[] = [];
  const seen = new Set<string>();
  // A draft is listed before nothing; prefer it, since it is the newer text.
  const sorted = [...docs].sort(
    (a, b) => Number(b._id.startsWith('drafts.')) - Number(a._id.startsWith('drafts.')),
  );
  for (const d of sorted) {
    const docId = publishedId(d._id);
    if (seen.has(docId)) continue;
    seen.add(docId);
    const n = d.count ?? 0;
    const name = (d.title ?? '').trim() || typeTitle(d._type);
    out.push({
      docId,
      docType: d._type,
      sectionKey: '',
      story: true,
      label: `${noun ? noun + ': ' : ''}${name} (${n} photo${n === 1 ? '' : 's'})`,
    });
  }
  return out;
}

export interface GalleryChoice {
  /** The document's published id. */
  docId: string;
  docType: string;
  sectionKey: string;
  /** Card 143: the photo goes on the document's own list (no gallery section). */
  story?: boolean;
  /** "Home: Photos from Sunday (12 photos)". */
  label: string;
}

/** The published id ("drafts.x" and "x" both give "x"). */
export const publishedId = (id: string): string => id.replace(/^drafts\./, '');

/**
 * One choice per gallery, labelled the way an editor names it. `typeTitle`
 * names a page without a title of its own (a singleton such as Home).
 */
export function galleryChoices(
  docs: GalleryDoc[],
  typeTitle: (type: string) => string = (t) => t,
): GalleryChoice[] {
  const out: GalleryChoice[] = [];
  const seen = new Set<string>();
  for (const d of docs) {
    const docId = publishedId(d._id);
    const page = (d.title ?? '').trim() || typeTitle(d._type);
    const list = d.galleries ?? [];
    list.forEach((g, i) => {
      if (!g._key || !KEY.test(g._key)) return;
      const id = `${docId}:${g._key}`;
      if (seen.has(id)) return;
      seen.add(id);
      const name = (g.heading ?? '').trim() || (list.length > 1 ? `Gallery ${i + 1}` : 'Gallery');
      const n = g.count ?? 0;
      out.push({
        docId,
        docType: d._type,
        sectionKey: g._key,
        label: `${page}: ${name} (${n} photo${n === 1 ? '' : 's'})`,
      });
    });
  }
  return out;
}

/** The array path of one gallery's photos, for setIfMissing and append. */
export function galleryPath(spec: GallerySpec, sectionKey: string): string {
  if (!KEY.test(sectionKey)) throw new Error('postPhoto: that gallery key is not valid');
  return `${spec.builderField}[_key=="${sectionKey}"].${spec.field}`;
}

/** The image value written into a gallery (or a post's cover). */
export function photoValue(
  spec: Pick<GallerySpec, 'altField' | 'captionField'>,
  assetId: string,
  alt: string,
  caption: string,
  key: string,
): Record<string, unknown> {
  const v: Record<string, unknown> = {
    _type: 'image',
    _key: key,
    asset: { _type: 'reference', _ref: assetId },
    [spec.altField]: alt.trim(),
  };
  if (spec.captionField && caption.trim()) v[spec.captionField] = caption.trim();
  return v;
}

export interface PhotoFormValues {
  hasPhoto: boolean;
  alt: string;
  /** 'post', a gallery choice id ("docId:key"), or '' for none picked. */
  target: string;
  title: string;
}

/** A file name, not a description: "IMG_2041.jpg", "photo.png", "DSC0042". */
const FILE_NAME = /^(img|dsc|pxl|photo|image|screenshot)?[\s_-]*\d*\.?(jpe?g|png|heic|webp|gif)?$/i;

/**
 * The form's checks, in plain words. A description is required (the site's
 * photos all carry one, card 111) and must read as words, not a file name.
 */
export function photoFormErrors(v: PhotoFormValues): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.hasPhoto) e.photo = 'Take a photo or choose one first.';
  const alt = v.alt.trim();
  if (!alt) e.alt = 'Describe the photo in a few words. People who cannot see it hear this.';
  else if (alt.length < 5 || FILE_NAME.test(alt.replace(/\s+/g, ''))) {
    e.alt = 'Say what is in the photo, for example "The choir singing on Easter morning".';
  }
  if (!v.target) e.target = 'Pick where the photo goes.';
  if (v.target === 'post' && !v.title.trim()) e.title = 'Give the post a title.';
  return e;
}

/** The size to shrink a photo to: its long side at most `max`, never enlarged. */
export function fitWithin(
  width: number,
  height: number,
  max = 2560,
): { width: number; height: number } {
  if (!(width > 0 && height > 0)) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Should the photo be redrawn before upload? Camera photos (JPEG, HEIC, WebP)
 * are: redrawing makes them smaller on a phone signal AND drops the hidden
 * EXIF data, which on a phone photo includes where it was taken. GIFs (they
 * may move) and SVGs are sent as they are.
 */
export function shouldRedraw(type: string): boolean {
  return /^image\/(jpe?g|heic|heif|webp|png|avif)$/i.test(type);
}
