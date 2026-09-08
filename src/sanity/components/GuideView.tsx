import { Badge, Box, Card, Flex, Heading, Stack, Text } from '@sanity/ui';
import type { ComponentType } from 'react';
import { useWorkspace } from 'sanity';
import { useRouter } from 'sanity/router';
import { guides, SITE, type DiyLevel, type GuideBlock, type PathLink } from '../guides/content';

// =============================================================================
// GuideView — read-only Help pane rendered inside the Studio structure
// =============================================================================
// PORTS.md card 41. The pattern was worked out in wcp-website over many
// sessions with a non-technical volunteer, and generalised here via
// stonesteps-50k. This copy assumes ONE workspace (wcp has two and swaps the
// path segment; there is nothing to swap to in a single-workspace Studio).
//
// The chip colours read Sanity UI's own theme variables with a neutral
// fallback, so a fork inherits something sane and can hardcode its brand if it
// wants the guides to feel like the site.
//
// The guides themselves are DATA in ../guides/content.ts, held in the repo
// rather than in Sanity, so they can never be deleted by accident and a future
// maintainer inherits them with the code.
// =============================================================================
// One instance per guide (bound to a slug at structure-build time via
// makeGuideView), so there is no prop-plumbing to get wrong. Renders the typed
// guide blocks with @sanity/ui primitives.
// =============================================================================

// Inline formatting for guide text. Three marks, kept deliberately small:
//  - **bold**   — emphasis on a concept ("nothing is live until you publish").
//  - `chip`     — a THING YOU CLICK in the Studio (a button, a menu entry, a
//                 tab). Renders as a small button-look chip, so "click
//                 `Publish`" visually matches the green button on screen and
//                 the eye can skim a step for its clickable part.
//  - _italic_   — a light aside. Underscores inside words (snake_case) are
//                 left alone; the mark needs a space/start before the opener.
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|(?<![\w])_[^_]+_(?![\w]))/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`'))
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                background: 'var(--card-badge-default-bg-color, #f1f3f6)',
                border: '1px solid var(--card-border-color, #e2e8f0)',
                borderRadius: 6,
                padding: '0 0.4em',
                fontSize: '0.92em',
                fontWeight: 600,
                lineHeight: 1.45,
                whiteSpace: 'nowrap',
              }}
            >
              {part.slice(1, -1)}
            </span>
          );
        if (part.startsWith('_') && part.endsWith('_') && part.length > 2)
          return <em key={i}>{part.slice(1, -1)}</em>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function DiyBadge({ level }: { level?: DiyLevel }) {
  if (level === 'self')
    return (
      <Badge tone="positive" fontSize={1} padding={2}>
        You can do this yourself
      </Badge>
    );
  if (level === 'ask')
    return (
      <Badge tone="caution" fontSize={1} padding={2}>
        Check with {SITE.contactName} first
      </Badge>
    );
  if (level === 'mixed')
    return (
      <Badge tone="primary" fontSize={1} padding={2}>
        Mostly yourself, see below
      </Badge>
    );
  return null;
}

// The "Where in the Studio" breadcrumb card. With a `link` it is a real door:
// the whole card navigates to the target pane/document/tool. Same router rule
// as WelcomePane's TaskCard: the deployed embedded Studio is HASH-routed, so
// clicks must go through router.navigateUrl (a raw <a href="/public/..">
// leaves the Studio and 404s); the href is a best-effort real URL so
// middle-click / open-in-new-tab still works.
function PathCard({ items, link }: { items: string[]; link?: PathLink }) {
  const router = useRouter();
  const { basePath } = useWorkspace();
  const inner = (
    <Flex align="flex-start" gap={3}>
      <span
        aria-hidden
        style={{
          background: 'var(--card-badge-primary-bg-color, #e8eaee)',
          color: 'var(--card-link-fg-color, #586577)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 30,
          height: 30,
          borderRadius: 9,
          fontSize: 15,
          flexShrink: 0,
        }}
      >
        🧭
      </span>
      <Stack space={2} style={{ paddingTop: 4, flex: 1 }}>
        <Flex align="center" gap={2}>
          <Text size={1} weight="semibold" style={{ flex: 1 }}>
            Where in the Studio
          </Text>
          {link && (
            <Text
              size={1}
              weight="semibold"
              style={{ color: 'var(--card-link-fg-color, #586577)' }}
            >
              Take me there →
            </Text>
          )}
        </Flex>
        <Text size={2}>{items.join('   →   ')}</Text>
      </Stack>
    </Flex>
  );
  if (!link) {
    return (
      <Card tone="primary" padding={4} radius={3} border>
        {inner}
      </Card>
    );
  }
  // One workspace here, so the base path is simply the Studio's own. (WCP has
  // two and swaps the last segment; there is nothing to swap to on this site.)
  const base = basePath;
  const path =
    'doc' in link
      ? `${base}/intent/edit/id=${link.doc};type=${link.type ?? link.doc}`
      : 'pane' in link
        ? `${base}/structure/${link.pane}`
        : `${base}/${link.tool}`;
  const isHashRouted = typeof window !== 'undefined' && window.location.hash.startsWith('#/');
  const href = isHashRouted ? `${window.location.pathname}#${path}` : path;
  return (
    <Card
      as="a"
      tone="primary"
      padding={4}
      radius={3}
      border
      href={href}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      onClick={(event: React.MouseEvent) => {
        // Let modified clicks (new tab etc.) fall through to the href.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        router.navigateUrl({ path });
      }}
    >
      {inner}
    </Card>
  );
}

function BlockView({ block }: { block: GuideBlock }) {
  switch (block.kind) {
    case 'h':
      return (
        <Heading as="h2" size={2}>
          {block.text}
        </Heading>
      );
    case 'p':
      return (
        <Text size={2} muted style={{ lineHeight: 1.6 }}>
          <RichText text={block.text} />
        </Text>
      );
    // Steps and bullets draw their OWN markers (a numbered disc / a dot):
    // @sanity/ui's Text carries a CSS reset that strips native ol/ul list
    // markers, so semantic lists rendered as bare unnumbered lines (spotted by
    // Nathan on the alert-banner guide, 2026-08-24). Explicit markers are
    // reset-proof, and the numbered disc reads better anyway.
    case 'steps':
      return (
        <Stack as="ol" space={3} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {block.items.map((item, i) => (
            <Flex as="li" key={i} gap={3} align="flex-start">
              <span
                aria-hidden
                style={{
                  background: 'var(--card-badge-primary-bg-color, #e8eaee)',
                  color: 'var(--card-link-fg-color, #586577)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {i + 1}
              </span>
              <Text size={2} style={{ lineHeight: 1.6 }}>
                <RichText text={item} />
              </Text>
            </Flex>
          ))}
        </Stack>
      );
    case 'bullets':
      return (
        <Stack as="ul" space={3} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {block.items.map((item, i) => (
            <Flex as="li" key={i} gap={3} align="flex-start">
              <span
                aria-hidden
                style={{
                  background: '#166FA8',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  flexShrink: 0,
                  marginTop: 8,
                }}
              />
              <Text size={2} style={{ lineHeight: 1.6 }}>
                <RichText text={item} />
              </Text>
            </Flex>
          ))}
        </Stack>
      );
    case 'path':
      return <PathCard items={block.items} link={block.link} />;
    case 'callout':
      return (
        <Card tone={block.tone ?? 'default'} padding={4} radius={3} border>
          <Stack space={3}>
            {block.title && (
              <Text size={1} weight="semibold">
                {block.title}
              </Text>
            )}
            <Text size={2} style={{ lineHeight: 1.5 }}>
              <RichText text={block.text} />
            </Text>
          </Stack>
        </Card>
      );
    case 'seealso':
      return (
        <Text size={1} muted>
          See also: {block.items.join('  ·  ')}
        </Text>
      );
    default:
      return null;
  }
}

// Returns a component bound to one guide slug (used by structure.ts).
export function makeGuideView(slug: string): ComponentType {
  return function GuideView() {
    const guide = guides.find((g) => g.slug === slug);
    if (!guide) {
      return (
        <Box padding={4}>
          <Text>Guide not found.</Text>
        </Box>
      );
    }
    return (
      <Box padding={4}>
        <Box style={{ maxWidth: 680, margin: '0 auto' }}>
          <Flex align="center" gap={3} style={{ flexWrap: 'wrap' }}>
            {/* The hub-style icon chip: soft sky tint behind the guide's emoji. */}
            <span
              aria-hidden
              style={{
                background: 'var(--card-badge-primary-bg-color, #e8eaee)',
                color: 'var(--card-link-fg-color, #586577)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 12,
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              {guide.icon}
            </span>
            <Heading as="h1" size={4}>
              {guide.title}
            </Heading>
            <DiyBadge level={guide.diy} />
          </Flex>
          <Box marginTop={3}>
            <Text size={2} muted style={{ lineHeight: 1.6 }}>
              {guide.lead}
            </Text>
          </Box>
          <Stack space={4} marginTop={5}>
            {guide.body.map((block, i) => (
              <BlockView key={i} block={block} />
            ))}
          </Stack>
        </Box>
      </Box>
    );
  };
}
