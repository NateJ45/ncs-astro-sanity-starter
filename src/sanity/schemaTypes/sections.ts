// Foundation, edit with care
// The page-builder block library. Each block is a reusable section that editors
// can add, reorder, and remove on any page. Every block renders through a
// site component in src/components/sections/, so anything built here matches
// the rest of the site automatically.
//
// The SectionRenderer (src/components/SectionRenderer.astro) owns the alternating
// background cadence and dividers, so reordering can never break the rhythm.
// That is why no block has a "background color" field: the renderer decides.
//
// SECTION_TYPES (exported at the bottom) is the single source of truth for which
// blocks a page-builder array accepts. Use it everywhere a pageBuilder array is
// defined so every builder offers the same library.

import {
  defineType,
  defineField,
  defineArrayMember,
  type ArrayOptions,
  type ValidationContext,
} from 'sanity';
import { BlockElementIcon } from '@sanity/icons/BlockElement';
import { ImageIcon } from '@sanity/icons/Image';
import { ImagesIcon } from '@sanity/icons/Images';
import { BulbOutlineIcon } from '@sanity/icons/BulbOutline';
import { StarIcon } from '@sanity/icons/Star';
import { ComponentIcon } from '@sanity/icons/Component';
import { RemoveIcon } from '@sanity/icons/Remove';
import { PlayIcon } from '@sanity/icons/Play';
import { ThLargeIcon } from '@sanity/icons/ThLarge';
import { EarthGlobeIcon } from '@sanity/icons/EarthGlobe';
import { CodeBlockIcon } from '@sanity/icons/CodeBlock';
import { CodeTextInput } from '../components/CodeTextInput';
import { codeWarningMessage } from '../../lib/custom-code';
import { makeEmbedPasteInput } from '../components/EmbedPasteInput';
import {
  describePlan,
  planEmbed,
  plansOwnSize,
  type EmbedInput,
  type EmbedWords,
} from '../../lib/embed-providers';
import { site } from '../../data/site';
import {
  FAST_START_MESSAGE,
  HERO_VIDEO_ACCEPT,
  checkFastStart,
  heroVideoProblem,
} from '../../lib/hero-video';
import { SyncIcon } from '@sanity/icons/Sync';
import {
  columnsField,
  headingAccentField,
  scriptAccentField,
  hideWhenRich,
  lookField,
  richTwin,
} from './_appearanceFields';
import { sideOptions } from '../../lib/layout-variants';
import { rsvpSection } from './rsvpSection';
import { ClipboardIcon } from '@sanity/icons/Clipboard';
// The builder kit (PORTS.md card 173): columns, buttons, a wide photo, fold-outs,
// tabs, a countdown, a dated notice, a timeline, a letter and the event blocks.
import { BUILDER_INSERT_GROUPS, builderSectionSchemas } from './builderSections';
import { withSiteGroups, type InsertGroup } from '../../lib/insert-groups';

// The photo hero's video checks (PORTS.md card 189), shared by the main clip and the phone copy: an
// error for a type the hero cannot play, a warning over the size budget, and a warning when an .mp4
// is not saved for fast start (reads the first 64 KB of the upload). Rules in src/lib/hero-video.ts.
const heroVideoCheck =
  (kind: 'main' | 'phone') =>
  async (value: { asset?: { _ref?: string } } | undefined, context: ValidationContext) => {
    const ref = value?.asset?._ref;
    if (!ref) return true;
    const asset = await context
      .getClient({ apiVersion: '2024-01-01' })
      .fetch<{ url?: string; mimeType?: string; size?: number } | null>(
        '*[_id == $id][0]{ url, mimeType, size }',
        { id: ref },
      );
    const problem = heroVideoProblem(asset, kind);
    if (problem?.level === 'error') return problem.message;
    const slowStart =
      asset?.url && asset.mimeType === 'video/mp4'
        ? (await checkFastStart(asset.url)) === false
        : false;
    const warnings = [problem?.message, slowStart ? FAST_START_MESSAGE : undefined].filter(Boolean);
    return warnings.length ? { message: warnings.join(' '), level: 'warning' as const } : true;
  };

/** Hidden unless the opening banner's style is "Photo behind the words" (card 189). */
const unlessPhotoStyle = ({ parent }: { parent?: { heroStyle?: string } }) =>
  parent?.heroStyle !== 'photo';

// Shared image field with required alt text (accessibility + SEO).
const imageWithAlt = (name = 'image', title = 'Image') =>
  defineField({
    name,
    title,
    type: 'image',
    options: { hotspot: true },
    fields: [
      defineField({
        name: 'alt',
        title: 'Alt text',
        type: 'string',
        description: 'Describe the photo in a few words, for screen readers and search engines.',
        validation: (R) => R.required(),
      }),
    ],
  });

// Short rich-text body: paragraphs, bold/italic, links, simple headings/lists.
const proseBody = (name = 'body', title = 'Text') =>
  defineField({
    name,
    title,
    type: 'array',
    of: [
      defineArrayMember({
        type: 'block',
        styles: [
          { title: 'Normal', value: 'normal' },
          { title: 'Heading', value: 'h2' },
          { title: 'Subheading', value: 'h3' },
          { title: 'Quote', value: 'blockquote' },
        ],
        lists: [
          { title: 'Bullet', value: 'bullet' },
          { title: 'Numbered', value: 'number' },
        ],
        marks: {
          decorators: [
            { title: 'Bold', value: 'strong' },
            { title: 'Italic', value: 'em' },
          ],
          annotations: [
            {
              name: 'link',
              type: 'object',
              title: 'Link',
              fields: [
                defineField({
                  name: 'href',
                  title: 'URL',
                  type: 'url',
                  validation: (R) => R.uri({ allowRelative: true }),
                }),
              ],
            },
          ],
        },
      }),
    ],
  });

// ── 1. Hero ──────────────────────────────────────────────────────────────────
export const heroSection = defineType({
  name: 'heroSection',
  title: 'Hero (big page opener)',
  type: 'object',
  icon: ComponentIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (small line above)', type: 'string' }),
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'scriptAccent',
      title: 'Handwritten accent word (optional)',
      type: 'string',
      description:
        'One word from the headline to render in the script font. Must match exactly. Leave blank to skip.',
    }),
    defineField({ name: 'subhead', title: 'Subhead', type: 'text', rows: 2 }),
    imageWithAlt('backgroundImage', 'Background photo (optional)'),
    // The photo hero (PORTS.md card 189, from FBC Auburn): the background photo across the whole
    // opening with the words over it in white, under a shade that keeps them readable. Standard
    // leaves the site's usual hero exactly as it was. PhotoHero.astro draws it.
    defineField({
      name: 'heroStyle',
      title: 'Style',
      type: 'string',
      description:
        "Standard is the site's usual opening. Photo behind the words puts the background photo across the whole opening with the words over it in white, with an optional short-facts card and a silent background video. It needs a background photo; without one the opening shows as standard.",
      initialValue: 'standard',
      options: {
        list: [
          { title: 'Standard', value: 'standard' },
          { title: 'Photo behind the words', value: 'photo' },
        ],
        layout: 'radio',
      },
    }),
    // The card beside the words (Photo behind the words only): a few short facts and a link, for
    // example opening hours, the next date or the price from. On a phone it follows the words.
    defineField({
      name: 'glance',
      title: 'Short-facts card (optional)',
      type: 'object',
      description:
        'A small card beside the words: a title, up to four short lines and a link. Leave it empty for no card.',
      hidden: unlessPhotoStyle,
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({ name: 'title', title: 'Card title', type: 'string' }),
        defineField({
          name: 'lines',
          title: 'Lines',
          type: 'array',
          of: [defineArrayMember({ type: 'string' })],
          validation: (R) => R.max(4),
          description: 'Short facts, one per line. Four at most.',
        }),
        defineField({ name: 'link', title: 'Link (optional)', type: 'ctaBlock' }),
      ],
    }),
    // A short silent clip over the photo (Photo behind the words only). The photo is its poster
    // and what shows when the clip does not play (reduced motion, Save-Data, a slow connection,
    // print). Rules: src/lib/hero-video.ts. The phone copy plays under 768px: Sanity does not
    // transcode files, so the small copy is its own upload.
    defineField({
      name: 'backgroundVideo',
      title: 'Background video (optional)',
      type: 'file',
      description:
        'A short clip that plays silently behind the words. Best: 15 to 30 seconds, landscape, steady, no sound, an .mp4 under 3 MB (720p is plenty), exported with "Fast start" or "Web optimized" turned on so it starts playing straight away. Keep the background photo too: it shows first, and it is all some visitors see. Add the phone video below as well, so phones get a small copy.',
      options: { accept: HERO_VIDEO_ACCEPT },
      hidden: unlessPhotoStyle,
      validation: (R) => R.custom(heroVideoCheck('main')),
    }),
    defineField({
      name: 'backgroundVideoPhone',
      title: 'Phone video (optional)',
      type: 'file',
      description:
        'A small copy of the same clip for phones, so a visitor on a phone signal is not waiting on the big file. Export it again at 640 pixels wide, no sound, 15 to 20 seconds, with "Fast start" or "Web optimized" turned on. It should come out under 1 MB. Phones play the main video if this is empty.',
      options: { accept: HERO_VIDEO_ACCEPT },
      hidden: unlessPhotoStyle,
      validation: (R) => R.custom(heroVideoCheck('phone')),
    }),
    defineField({ name: 'primaryCta', title: 'Main button', type: 'ctaBlock' }),
    defineField({ name: 'secondaryCta', title: 'Second button (optional)', type: 'ctaBlock' }),
    defineField({
      name: 'size',
      title: 'Height',
      type: 'string',
      initialValue: 'short',
      options: {
        list: [
          { title: 'Tall', value: 'tall' },
          { title: 'Short', value: 'short' },
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: {
    select: { title: 'headline', media: 'backgroundImage' },
    prepare: ({ title, media }) => ({ title: title || 'Hero', subtitle: 'Hero', media }),
  },
});

// ── 2. Rich text ───────────────────────────────────────────────────────────--
export const richTextSection = defineType({
  name: 'richTextSection',
  title: 'Text block',
  type: 'object',
  icon: BlockElementIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'heading', title: 'Heading (optional)', type: 'string' }),
    scriptAccentField('heading'),
    headingAccentField(),
    proseBody('body', 'Text'),
    defineField({
      name: 'width',
      title: 'Width',
      type: 'string',
      initialValue: 'normal',
      options: {
        list: [
          { title: 'Normal', value: 'normal' },
          { title: 'Narrow (easier reading)', value: 'narrow' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'align',
      title: 'Alignment',
      type: 'string',
      initialValue: 'left',
      options: {
        list: [
          { title: 'Left', value: 'left' },
          { title: 'Centered', value: 'center' },
        ],
        layout: 'radio',
      },
    }),
    lookField('richTextSection'),
  ],
  preview: {
    select: { title: 'heading', body: 'body' },
    prepare: ({ title }) => ({ title: title || 'Text block', subtitle: 'Text' }),
  },
});

// ── 3. Image + text ──────────────────────────────────────────────────────────
export const imageTextSection = defineType({
  name: 'imageTextSection',
  title: 'Image + text (side by side)',
  type: 'object',
  icon: ImageIcon,
  fields: [
    imageWithAlt('image', 'Image'),
    defineField({
      name: 'imageSide',
      title: 'Which side is the image on?',
      type: 'string',
      initialValue: 'left',
      // Wording only. The stored values and the default are unchanged; the
      // labels come from the shared registry so both halves of a media pair
      // read the same way. See src/lib/layout-variants.ts.
      options: { list: sideOptions('Image'), layout: 'radio' },
    }),
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    proseBody('body', 'Text'),
    defineField({ name: 'cta', title: 'Button (optional)', type: 'ctaBlock' }),
    lookField('imageTextSection'),
  ],
  preview: {
    select: { title: 'heading', media: 'image' },
    prepare: ({ title, media }) => ({
      title: title || 'Image + text',
      subtitle: 'Image + text',
      media,
    }),
  },
});

// ── 4. Gallery ───────────────────────────────────────────────────────────────
export const gallerySection = defineType({
  name: 'gallerySection',
  title: 'Photo gallery (grid)',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({ name: 'heading', title: 'Heading (optional)', type: 'string' }),
    defineField({
      name: 'images',
      title: 'Photos',
      type: 'array',
      validation: (R) => R.min(1),
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              validation: (R) => R.required(),
            }),
            defineField({ name: 'caption', title: 'Caption (optional)', type: 'string' }),
          ],
        }),
      ],
    }),
    columnsField('gallerySection'),
    lookField('gallerySection'),
  ],
  preview: {
    select: { images: 'images', heading: 'heading' },
    prepare: ({ images, heading }) => ({
      title: heading || 'Photo gallery',
      subtitle: `Gallery${Array.isArray(images) ? ` (${images.length})` : ''}`,
      media: Array.isArray(images) && images[0] ? images[0] : ImagesIcon,
    }),
  },
});

// ── 5. Quote ─────────────────────────────────────────────────────────────────
export const quoteSection = defineType({
  name: 'quoteSection',
  title: 'Quote / testimonial',
  type: 'object',
  icon: StarIcon,
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 3,
      validation: (R) => R.required(),
    }),
    defineField({ name: 'attribution', title: 'Who said it', type: 'string' }),
    defineField({
      name: 'detail',
      title: 'Their detail (optional)',
      type: 'string',
      description: 'Context that adds credibility. Example: "Location" or "Project type".',
    }),
    lookField('quoteSection'),
  ],
  preview: {
    select: { title: 'quote', subtitle: 'attribution' },
    prepare: ({ title, subtitle }) => ({
      title: title ? `"${title.slice(0, 50)}"` : 'Quote',
      subtitle: subtitle || 'Quote',
    }),
  },
});

// ── 6. Stat row ──────────────────────────────────────────────────────────────
export const statSection = defineType({
  name: 'statSection',
  title: 'Numbers row (stats)',
  type: 'object',
  icon: ThLargeIcon,
  fields: [
    defineField({ name: 'heading', title: 'Heading (optional)', type: 'string' }),
    defineField({
      name: 'stats',
      title: 'Numbers',
      type: 'array',
      validation: (R) => R.max(4),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'statItem',
          fields: [
            defineField({
              name: 'number',
              title: 'Number',
              type: 'number',
              validation: (R) => R.required(),
            }),
            defineField({
              name: 'suffix',
              title: 'Suffix (optional)',
              type: 'string',
              description: 'Optional suffix after the number. Examples: "+", "%", "yrs".',
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (R) => R.required(),
            }),
          ],
          // The title is DERIVED, never selected straight from `number`.
          // Sanity lowercases a preview title to index it, so a title that is a
          // number throws "toLowerCase is not a function" and the whole array
          // field renders as a red Unhandled Runtime Error. Found by
          // `npm run audit:studio` check 2.
          preview: {
            select: { number: 'number', suffix: 'suffix', label: 'label' },
            prepare: ({ number, suffix, label }) => ({
              title: `${number ?? ''}${suffix ?? ''}` || 'Number',
              subtitle: label,
            }),
          },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Numbers row' }) },
});

// ── 7. CTA band ──────────────────────────────────────────────────────────────
export const ctaBandSection = defineType({
  name: 'ctaBandSection',
  title: 'Call-to-action band',
  type: 'object',
  icon: BulbOutlineIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      validation: (R) => R.required(),
    }),
    scriptAccentField('headline'),
    headingAccentField(),
    defineField({
      name: 'subhead',
      title: 'Subhead',
      type: 'text',
      rows: 2,
      hidden: hideWhenRich('subheadRich'),
    }),
    richTwin('subheadRich', 'Subhead'),
    defineField({ name: 'cta', title: 'Button', type: 'ctaBlock' }),
    imageWithAlt('backgroundImage', 'Background photo (optional)'),
  ],
  preview: {
    select: { title: 'headline', media: 'backgroundImage' },
    prepare: ({ title, media }) => ({
      title: title || 'Call to action',
      subtitle: 'CTA band',
      media,
    }),
  },
});

// ── 8. Video ─────────────────────────────────────────────────────────────────
export const videoSection = defineType({
  name: 'videoSection',
  title: 'Video',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'url',
      title: 'Video link (YouTube or Vimeo)',
      type: 'url',
      validation: (R) => R.required().uri({ scheme: ['http', 'https'] }),
      description: 'Paste the share link from YouTube or Vimeo.',
    }),
    defineField({ name: 'heading', title: 'Heading (optional)', type: 'string' }),
    defineField({ name: 'caption', title: 'Caption (optional)', type: 'string' }),
    lookField('videoSection'),
  ],
  preview: {
    select: { title: 'heading', url: 'url' },
    prepare: ({ title, url }) => ({ title: title || 'Video', subtitle: url || 'Video' }),
  },
});

// ── 9. Spacer / divider ──────────────────────────────────────────────────────
export const spacerSection = defineType({
  name: 'spacerSection',
  title: 'Spacer / divider',
  type: 'object',
  icon: RemoveIcon,
  fields: [
    defineField({
      name: 'variant',
      title: 'Style',
      type: 'string',
      initialValue: 'ornament',
      options: {
        list: [
          { title: 'Accent ornament', value: 'ornament' },
          { title: 'Plain line', value: 'line' },
          { title: 'Just space (invisible)', value: 'space' },
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: { prepare: () => ({ title: 'Spacer / divider' }) },
});

// ── 10. Logo strip ──────────────────────────────────────────────────────────
// A row or grid of client/partner logos. SELF_CONTAINED — manages its own surface.
export const logoStripSection = defineType({
  name: 'logoStripSection',
  title: 'Logo strip (trusted by / as seen in)',
  type: 'object',
  icon: EarthGlobeIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow (optional)',
      type: 'string',
      description: 'Examples: "Trusted by" or "As seen in".',
    }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
    defineField({
      name: 'logos',
      title: 'Logos',
      type: 'array',
      validation: (R) => R.min(2).max(12),
      description: 'Add between 2 and 12 logos. Each needs an alt text for screen readers.',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              description: 'Company or outlet name, for screen readers and search engines.',
              validation: (R) => R.required(),
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      initialValue: 'row',
      options: {
        list: [
          { title: 'Row (single line, scrollable on small screens)', value: 'row' },
          { title: 'Grid (wraps across rows)', value: 'grid' },
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: {
    select: { logos: 'logos', eyebrow: 'eyebrow', headline: 'headline' },
    prepare: ({ logos, eyebrow, headline }) => ({
      title: headline || eyebrow || 'Logo strip',
      subtitle: `Logo strip${Array.isArray(logos) ? ` (${logos.length})` : ''}`,
      media: Array.isArray(logos) && logos[0] ? logos[0] : EarthGlobeIcon,
    }),
  },
});

// ── 11. Custom code or embed (PORTS.md card 121) ─────────────────────────────
// A provider's page by URL (sandboxed iframe, unchanged), or pasted code. Pasted
// code runs in ITS OWN BOX by default (CustomCodeFrame: srcdoc iframe, no
// allow-same-origin), so it cannot read the site's cookies or storage, where the
// embedded Studio keeps an editor's session. "Runs directly on the page" is the
// opt-out for trusted provider snippets, and the Checkup lists every page using
// it. Field NAMES are unchanged (rule 1): embedUrl, embedCode, heightHint.
// SELF_CONTAINED: manages its own surface. Trust model: docs/agent/custom-code.md.
// Paste-and-go (PORTS.md card 172): EmbedPasteInput puts one paste box above the
// fields and fills them in; src/lib/embed-providers.ts recognizes the service,
// sizes it, and keeps unknown script code off the page. Nothing new is stored
// (rule 15). EMBED_WORDS is this site's wording for the Studio sentence.
const EMBED_WORDS: EmbedWords = {
  approver: 'your web designer',
  examples: 'YouTube, Google Maps, Spotify or Calendly',
};
const embedPlanFor = (parent: unknown) =>
  planEmbed((parent ?? {}) as EmbedInput, site.embeds.approvedScriptOrigins);
export const embedSection = defineType({
  name: 'embedSection',
  title: 'Custom code or embed',
  type: 'object',
  icon: CodeBlockIcon,
  components: {
    input: makeEmbedPasteInput({
      words: EMBED_WORDS,
      approvedOrigins: site.embeds.approvedScriptOrigins,
    }),
  },
  description:
    'Show a form, map, calendar or small widget from another website, or paste code you were given (by a provider, or by an AI). Check it in Preview before you publish.',
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
    defineField({ name: 'subhead', title: 'Subhead (optional)', type: 'text', rows: 2 }),
    defineField({
      name: 'embedUrl',
      title: 'Web address to show',
      type: 'url',
      description:
        'For providers that give you a link to embed: Calendly, Cal.com, Tally, Google Forms. Paste the full address. Use this OR the code box below, not both.',
      validation: (R) => [
        R.uri({ scheme: ['http', 'https'] }),
        // A link the block cannot show (a Maps share link, a Facebook page) says
        // what to paste instead. The website would show nothing for it.
        R.custom((value, context) => {
          if (!value) return true;
          const plan = embedPlanFor(context.parent);
          return plan.kind === 'problem' ? describePlan(plan, EMBED_WORDS) : true;
        }),
      ],
    }),
    defineField({
      name: 'embedCode',
      title: 'Custom code',
      type: 'text',
      rows: 12,
      components: { input: CodeTextInput },
      description:
        'Paste HTML, with any CSS and JavaScript inside it. It runs in its own box on the page, so it cannot change the rest of the website or see anything private. The box grows to fit what is inside.',
      validation: (R) => [
        R.custom((value, context) => {
          const parent = context.parent as { embedUrl?: string } | undefined;
          if (value && parent?.embedUrl) {
            return 'Fill in either the web address or the custom code, not both.';
          }
          return true;
        }),
        R.custom((value, context) => {
          const parent = context.parent as { runsOnPage?: boolean } | undefined;
          return codeWarningMessage(value, parent?.runsOnPage === true);
        }).warning(),
        // The guard rail: script code from a service the website does not know
        // stays in its own box even with the switch on. Say so, in plain words.
        R.custom((value, context) => {
          if (!value) return true;
          const plan = embedPlanFor(context.parent);
          return plan.kind === 'box' && plan.blocked ? describePlan(plan, EMBED_WORDS) : true;
        }).warning(),
      ],
    }),
    defineField({
      name: 'runsOnPage',
      title: 'Runs directly on the page',
      type: 'boolean',
      initialValue: false,
      hidden: ({ parent }) => !(parent as { embedCode?: string } | undefined)?.embedCode,
      description:
        'Leave this off. Turn it on only for code from a provider you trust that will not work in its own box, such as some giving or booking widgets. When on, the code can do anything the website can, including reading what a signed-in editor is doing. The Checkup lists every page where this is on.',
    }),
    defineField({
      name: 'heightHint',
      title: 'Height',
      type: 'string',
      initialValue: 'medium',
      // A known service (a video, a map, a podcast) is sized for the editor.
      hidden: ({ parent }) => plansOwnSize(embedPlanFor(parent)),
      description:
        'For a web address, how tall the box is. Custom code sizes itself; this is only the space it holds while it loads.',
      options: {
        list: [
          { title: 'Short (around 400px)', value: 'short' },
          { title: 'Medium (around 640px)', value: 'medium' },
          { title: 'Tall (around 900px)', value: 'tall' },
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: {
    select: { title: 'headline', eyebrow: 'eyebrow', url: 'embedUrl', onPage: 'runsOnPage' },
    prepare: ({ title, eyebrow, url, onPage }) => ({
      title: title || eyebrow || 'Custom code or embed',
      subtitle: url
        ? `Web address: ${String(url).slice(0, 50)}`
        : onPage
          ? 'Custom code (runs directly on the page)'
          : 'Custom code (in its own box)',
    }),
  },
});

// ── Synced section (the authoring kit, PORTS.md card 109) ────────────────────
// "Edit once, everywhere." A synced section holds no words of its own: it points
// at a saved section (a `sectionPreset` document), and the page shows whatever
// that saved section holds today. Change the saved section, publish it, and every
// page using it changes on the next rebuild. A plain copy (the "Add a copy"
// button in the pattern picker) is the opposite: it never changes again.
//
// Rendering: the GROQ projection resolves the reference into a `sections`
// array (src/lib/queries.ts) and SectionRenderer expands it in place
// (expandSyncedSections in src/lib/authoring.ts), so the alternating-surface
// cadence runs across the expanded list exactly as if the sections were typed in.
// Like every block, it carries no colour or surface field (rule 9).
//
// Deliberately NOT in pageSectionSchemas, so a saved section can never hold a
// synced section: that is what makes a loop (A shows B shows A) impossible.
export const syncedSection = defineType({
  name: 'syncedSection',
  title: 'Synced section',
  type: 'object',
  icon: SyncIcon,
  description:
    'Shows a saved section. Edit the saved section once and every page using it changes.',
  fields: [
    defineField({
      name: 'preset',
      title: 'Saved section to show',
      type: 'reference',
      to: [{ type: 'sectionPreset' }],
      description:
        'Pick a saved section. To change what it says, open the saved section itself (Content, then Saved sections) and publish it: every page that uses it updates together.',
    }),
  ],
  preview: {
    select: { title: 'preset.title', sections: 'preset.section' },
    prepare: ({ title, sections }) => {
      const count = Array.isArray(sections) ? sections.length : 0;
      return {
        title: title ? `Synced: ${title}` : 'Synced: nothing picked yet',
        subtitle: title
          ? `${count === 1 ? '1 section' : `${count} sections`}. Edit the saved section to change every page using it.`
          : 'Pick a saved section to show here.',
      };
    },
  },
});

// ── Form (the form builder, PORTS.md card 194) ────────────────────────────────
// Shows one `form` document (schemaTypes/form.ts). The block holds only the
// reference: the words live on the form, so one form can sit on several pages.
// What visitors send goes to /api/form/ and the site's D1 database, never here.
// CONTENT type: SectionRenderer hands it the page's alternating surface.
export const formSection = defineType({
  name: 'formSection',
  title: 'Form',
  type: 'object',
  icon: ClipboardIcon,
  description:
    'Shows one of your forms. Make the form first under Content > Forms, then pick it here. Answers are emailed to the person the form names and listed under Messages; they are never saved in this editor.',
  fields: [
    defineField({
      name: 'form',
      title: 'Which form',
      type: 'reference',
      to: [{ type: 'form' }],
      validation: (R) => R.required(),
    }),
  ],
  preview: {
    select: { title: 'form.title', mode: 'form.mode' },
    prepare: ({ title, mode }) => ({
      title: title || 'Form: none picked yet',
      subtitle: mode === 'private' ? 'Private form' : 'Form',
    }),
  },
});

// ── Exports ──────────────────────────────────────────────────────────────────

// All section schema objects, to register in the schema index.
export const pageSectionSchemas = [
  heroSection,
  richTextSection,
  imageTextSection,
  gallerySection,
  quoteSection,
  statSection,
  ctaBandSection,
  videoSection,
  spacerSection,
  logoStripSection,
  embedSection,
  // The email backbone (card 127): replies kept in D1, never in Sanity.
  rsvpSection,
  // The form builder (card 194): answers kept in D1, never in Sanity.
  formSection,
  // The builder kit (builderSections.ts, PORTS.md card 173).
  ...builderSectionSchemas,
];

// The general blocks on their own. A saved section accepts these (plus the rich
// blocks) but NOT a synced section; see syncedSection above.
export const LIBRARY_SECTION_TYPES = pageSectionSchemas.map((s) => ({ type: s.name }));

// The list a pageBuilder array uses for `of`. Single source of truth so every
// builder offers the same blocks: the general library plus the synced section.
export const SECTION_TYPES = [...LIBRARY_SECTION_TYPES, { type: syncedSection.name }];

/**
 * Where the insert menu's grid view finds a picture of each block type (the
 * authoring kit, card 109). The pictures are shot from /styleguide/sections/ by
 * `npm run thumbnails` into public/section-thumbnails/ and served by the site
 * itself, which is the Studio's own origin. A type without a picture (a block a
 * fork added and has not shot yet) falls back to its icon, so nothing breaks.
 */
export const sectionThumbnailUrl = (type: string): string | undefined =>
  type === 'syncedSection' ? undefined : `/section-thumbnails/${type}.jpg`;

// =============================================================================
// The grouped, searchable insert menu (2026-08-28, PORTS.md card 17)
// =============================================================================
// Every pageBuilder array shares one insert-menu configuration, so "add a
// section" reads the same everywhere: a search box, and blocks sorted into four
// plain-language groups instead of one long alphabetical list.
//
// This matters most OUTSIDE the Studio form. With the preview stack installed,
// the Presentation overlay opens this same menu IN THE CANVAS when an editor
// uses a section's insert-before/insert-after control, so the grouping is what
// an editor sees while looking at the page.
//
// `filter: true` turns on the search box. Groups list type names; a group whose
// types are all absent from a given array simply does not appear, which is what
// lets one config serve the curated per-page lists in richSections.ts. Any type
// not named in a group falls under "All".
//
// SITE_INSERT_GROUPS (PORTS.md card 173): the groups a library file adds, merged
// into the base list by withSiteGroups() (src/lib/insert-groups.ts). A fork that adds its own block library
// (say, a church's service times and giving blocks) appends ITS groups here, or
// spreads them in, and never edits the base list below: a group with a name that
// already exists gains the types, a new name becomes a new group at the end.
const SITE_INSERT_GROUPS: InsertGroup[] = [...BUILDER_INSERT_GROUPS];

export const SECTION_INSERT_MENU: ArrayOptions['insertMenu'] = {
  filter: true,
  // Grid first, so the picker opens on pictures; the list view stays one click
  // away and keeps the search box (the authoring kit, card 109).
  views: [{ name: 'grid', previewImageUrl: sectionThumbnailUrl }, { name: 'list' }],
  groups: withSiteGroups(
    [
      {
        name: 'basics',
        title: 'Basics',
        of: ['heroSection', 'richTextSection', 'imageTextSection', 'spacerSection'],
      },
      {
        name: 'proof',
        title: 'Proof and trust',
        of: [
          'quoteSection',
          'testimonialsSection', // scaffold: testimonials
          'statSection',
          'logoStripSection',
          'guaranteeSection',
          'faqSection', // scaffold: faq
        ],
      },
      {
        // The authoring kit (card 109). A saved section can also be dropped in as
        // a COPY from the "Insert a saved section" button under the sections list.
        name: 'saved',
        title: 'Saved and synced',
        of: ['syncedSection'],
      },
      {
        name: 'media',
        title: 'Media',
        of: ['gallerySection', 'videoSection', 'embedSection'],
      },
      {
        name: 'signups',
        title: 'Sign-ups',
        of: ['rsvpSection', 'formSection'],
      },
      {
        name: 'business',
        title: 'About the business',
        of: [
          'servicesGridSection', // scaffold: services
          'processSection', // scaffold: process
          'storySection', // scaffold: about
          'valuesSection', // scaffold: philosophy
          'founderSection', // scaffold: about
          'teamSection',
          'serviceAreaSection',
          'dynamicListSection',
          'ctaBandSection',
        ],
      },
    ],
    SITE_INSERT_GROUPS,
  ),
};

/** The `options` block every pageBuilder array should carry. */
export const sectionArrayOptions: ArrayOptions = { insertMenu: SECTION_INSERT_MENU };

// Reusable "extra sections" field for pages that keep their own structure but
// want an append zone for library blocks. The consuming schema must declare an
// `extra` field group. SectionRenderer renders the array; self-contained blocks
// manage their own surface so no extra page context is needed.
export const additionalSectionsField = defineField({
  name: 'additionalSections',
  title: 'Extra sections',
  type: 'array',
  group: 'extra',
  description:
    'Optional. Add blocks from the library to the bottom of this page (a banner, a gallery, a call to action). Leave empty to keep the page exactly as it is.',
  of: SECTION_TYPES,
  options: sectionArrayOptions,
});
