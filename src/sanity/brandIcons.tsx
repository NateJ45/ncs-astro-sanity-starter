// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The Studio's icon registry and list-row pictures (PORTS.md card 119)
// =============================================================================
// One icon per MEANING (src/lib/studio-icons.ts lists them). The starter draws
// each one with @sanity/icons; a site swaps in its own art for any meaning in
// src/sanity/brandIconArt.tsx (not PORTABLE). Use:
//
//   brandIcon('times')          the icon for a meaning (structure, groups,
//                               templates, document actions, PT decorators)
//   typeIcon('sermon')          the icon a document type is drawn with
//   IconTile / tileFor(key)     a row's picture when the document has no image
//   withBrandPreviews(types)    decorates the schema: type icons, group icons,
//                               a `media` on every document preview
//   brandIcons()                plugin: the same for plugin-registered types and
//                               the tools' icons (the phone sidebar shows them)
//
// Which type, group and tool means what: src/lib/studio-icons.ts defaults plus
// brand/brand.config.json `studio.icons`. Art from a file (a site's SVGs) goes
// through artIcon(url): it draws the file inside a 1em <svg data-sanity-icon>,
// so Sanity sizes it exactly like its own icons in every slot (a bare <img> in a
// preview's media box is stretched to fill it). Multi-colour art keeps its own
// colours; one-colour art should use currentColor so it follows the theme.
// =============================================================================

import type { ComponentType, CSSProperties } from 'react';
import { definePlugin } from 'sanity';
import { useRootTheme } from '@sanity/ui';
import { ActivityIcon } from '@sanity/icons/Activity';
import { ArrowRightIcon } from '@sanity/icons/ArrowRight';
import { BellIcon } from '@sanity/icons/Bell';
import { BlockElementIcon } from '@sanity/icons/BlockElement';
import { BoltIcon } from '@sanity/icons/Bolt';
import { BookIcon } from '@sanity/icons/Book';
import { BookmarkIcon } from '@sanity/icons/Bookmark';
import { CalendarIcon } from '@sanity/icons/Calendar';
import { ClipboardIcon } from '@sanity/icons/Clipboard';
import { ClockIcon } from '@sanity/icons/Clock';
import { CodeIcon } from '@sanity/icons/Code';
import { CogIcon } from '@sanity/icons/Cog';
import { ColorWheelIcon } from '@sanity/icons/ColorWheel';
import { ComposeIcon } from '@sanity/icons/Compose';
import { CubeIcon } from '@sanity/icons/Cube';
import { DocumentIcon } from '@sanity/icons/Document';
import { DocumentsIcon } from '@sanity/icons/Documents';
import { DocumentTextIcon } from '@sanity/icons/DocumentText';
import { DownloadIcon } from '@sanity/icons/Download';
import { EnvelopeIcon } from '@sanity/icons/Envelope';
import { EyeOpenIcon } from '@sanity/icons/EyeOpen';
import { HeartIcon } from '@sanity/icons/Heart';
import { HelpCircleIcon } from '@sanity/icons/HelpCircle';
import { HomeIcon } from '@sanity/icons/Home';
import { ImageIcon } from '@sanity/icons/Image';
import { InfoOutlineIcon } from '@sanity/icons/InfoOutline';
import { LinkIcon } from '@sanity/icons/Link';
import { LockIcon } from '@sanity/icons/Lock';
import { MicrophoneIcon } from '@sanity/icons/Microphone';
import { OlistIcon } from '@sanity/icons/Olist';
import { PackageIcon } from '@sanity/icons/Package';
import { PinIcon } from '@sanity/icons/Pin';
import { SearchIcon } from '@sanity/icons/Search';
import { StackIcon } from '@sanity/icons/Stack';
import { StarIcon } from '@sanity/icons/Star';
import { SunIcon } from '@sanity/icons/Sun';
import { TagIcon } from '@sanity/icons/Tag';
import { TagsIcon } from '@sanity/icons/Tags';
import { TextIcon } from '@sanity/icons/Text';
import { ThListIcon } from '@sanity/icons/ThList';
import { ThumbsUpIcon } from '@sanity/icons/ThumbsUp';
import { TrashIcon } from '@sanity/icons/Trash';
import { RestoreIcon } from '@sanity/icons/Restore';
import { UnknownIcon } from '@sanity/icons/Unknown';
import { UserIcon } from '@sanity/icons/User';
import { UsersIcon } from '@sanity/icons/Users';
import { TransferIcon } from '@sanity/icons/Transfer';
import {
  applyBrandPreviews,
  iconMaps,
  iconTileColors,
  typeIconKey,
  type BrandIconKey,
  type BrandIconsConfig,
  type TileColors,
} from '../lib/studio-icons';
import { STUDIO_COLORS } from './studioTheme';
import { BRAND_ICON_ART } from './brandIconArt';
import type { BrandIcon } from './artIcon';
import brand from '../../brand/brand.config.json';

export { artIcon, type BrandIcon } from './artIcon';

/** The starter's drawing of every meaning. */
const DEFAULT_ICONS: Record<BrandIconKey, BrandIcon> = {
  home: HomeIcon,
  page: DocumentTextIcon,
  pages: DocumentsIcon,
  sections: BlockElementIcon,
  savedSection: BookmarkIcon,
  redirect: ArrowRightIcon,
  notFound: UnknownIcon,
  privacy: LockIcon,
  contact: EnvelopeIcon,
  settings: CogIcon,
  place: PinIcon,
  times: ClockIcon,
  brandKit: ColorWheelIcon,
  overview: ThumbsUpIcon,
  content: ThListIcon,
  event: CalendarIcon,
  notice: BellIcon,
  scripture: BookIcon,
  series: StackIcon,
  give: HeartIcon,
  music: MicrophoneIcon,
  prayer: SunIcon,
  children: CubeIcon,
  person: UserIcon,
  people: UsersIcon,
  download: DownloadIcon,
  question: HelpCircleIcon,
  questionGroup: TagsIcon,
  post: ComposeIcon,
  journal: BookIcon,
  category: TagIcon,
  form: ClipboardIcon,
  testimonial: StarIcon,
  service: PackageIcon,
  value: HeartIcon,
  step: OlistIcon,
  link: LinkIcon,
  image: ImageIcon,
  text: TextIcon,
  document: DocumentIcon,
  search: SearchIcon,
  publishing: CalendarIcon,
  related: TransferIcon,
  guide: InfoOutlineIcon,
  help: HelpCircleIcon,
  trash: TrashIcon,
  restore: RestoreIcon,
  message: EnvelopeIcon,
  preview: EyeOpenIcon,
  checkup: ActivityIcon,
  quickUpdate: BoltIcon,
  table: ThListIcon,
  code: CodeIcon,
};

const brandStudio = (brand as { studio?: { icons?: BrandIconsConfig } }).studio;

/** Type, group and tool meanings: the defaults with brand.config.json on top. */
export const ICON_MAPS = iconMaps(brandStudio?.icons);

/** The tile colours, per scheme. */
export const TILE_COLORS: TileColors = iconTileColors(STUDIO_COLORS, brandStudio?.icons?.tile);

/** The icon for a meaning: the site's art when it has some, else the starter's. */
export function brandIcon(key: BrandIconKey): BrandIcon {
  return BRAND_ICON_ART[key] ?? DEFAULT_ICONS[key];
}

/** The icon a document type is drawn with. */
export function typeIcon(type: string): BrandIcon {
  return brandIcon(typeIconKey(type, ICON_MAPS));
}

// -----------------------------------------------------------------------------
// The tile
// -----------------------------------------------------------------------------

/**
 * A list row's picture when the document has none: the meaning's icon on a
 * square of the brand's tint. It fills Sanity's media box (whatever its size)
 * and reads the scheme from the theme, so it is right in light and dark.
 */
export function IconTile({ icon: key }: { icon: BrandIconKey }) {
  const { scheme } = useRootTheme();
  const c = TILE_COLORS[scheme === 'dark' ? 'dark' : 'light'];
  const Icon = brandIcon(key);
  const box: CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: c.bg,
    color: c.fg,
    borderRadius: 'inherit',
    containerType: 'size',
  };
  // Sanity's media box sizes a [data-sanity-icon] svg by its own font-size
  // rule; an inline size wins, and 80cqmin keeps it in proportion to the box.
  const glyph: CSSProperties = {
    flex: 'none',
    fontSize: '80cqmin',
    width: '1em',
    height: '1em',
    color: c.fg,
  };
  return (
    <span data-brand-tile={key} aria-hidden style={box}>
      <Icon style={glyph} />
    </span>
  );
}

const tiles = new Map<BrandIconKey, ComponentType>();

/** A stable tile component per meaning (a preview's `media` may be a component). */
export function tileFor(key: BrandIconKey): ComponentType {
  let tile = tiles.get(key);
  if (!tile) {
    const Tile = () => <IconTile icon={key} />;
    Tile.displayName = `IconTile(${key})`;
    tiles.set(key, Tile);
    tile = Tile;
  }
  return tile;
}

/** Decorate schema types: icons on types and groups, a picture on every row. */
export function withBrandPreviews<T>(types: T[]): T[] {
  return applyBrandPreviews(types, { maps: ICON_MAPS, icon: brandIcon, tile: tileFor });
}

/**
 * The plugin half. Types registered by plugins (the kit's Trash, the share
 * links) get the same treatment, and every tool gets its meaning's icon: the
 * top bar draws none, but the phone's sidebar does. Register it AFTER the
 * Studio kit, so the kit's own tools are there to be given icons; it changes
 * icons only, never adds, removes or reorders anything.
 */
export const brandIcons = definePlugin({
  name: 'ncs-brand-icons',
  schema: {
    types: (prev) => withBrandPreviews(prev),
  },
  tools: (prev) =>
    prev.map((tool) => {
      const key = ICON_MAPS.tools[tool.name];
      return key ? { ...tool, icon: brandIcon(key) } : tool;
    }),
});
