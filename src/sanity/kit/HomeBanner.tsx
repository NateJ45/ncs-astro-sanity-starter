// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// Home's banner: the welcome at the top of the Studio's Home (PORTS.md card 118)
// =============================================================================
// Replaces card 110's soft-tint header. The Sanity version of the dark welcome
// banner on the family's WordPress dashboards: a panel in the navbar's deep
// brand colour (card 116's chrome theme, so the two match exactly and the text
// colours come with their contrast already checked), holding
//
//   - the date and a greeting by first name, the name in the site's accent;
//   - the site's name in its heading font, and optionally part of it in the
//     site's own display lettering (kitConfig.homeBanner.lettering);
//   - the one reassurance that matters most;
//   - "View the website", opening the live site in a new tab;
//   - the site's mark, and optionally a decorative strip along the foot.
//
// It is navy in BOTH appearances, like the navbar. The site-specific parts are
// all in kitConfig.homeBanner (types.ts); the decisions that need no React
// (which colours are readable, the font rule, the link) are in
// src/lib/studio-banner.ts with tests. Nothing moves: no animation at all, so
// there is nothing for reduced motion to switch off.
//
// It takes plain props (no Studio hooks), so it renders in a bare page too.
// HomeTool.tsx's Welcome reads the user and workspace and hands them in.
// =============================================================================

import { useMemo } from 'react';
import { Box, Button, Card, Heading, Stack, Text, ThemeProvider, useRootTheme } from '@sanity/ui';
import { LaunchIcon } from '@sanity/icons/Launch';
import { buildChromeTheme, STUDIO_COLORS } from '../studioTheme';
import {
  colorLetters,
  fontFaceCss,
  LARGE_CONTRAST,
  letteringStack,
  readableColors,
  readableOn,
  siteHref,
  splitName,
} from '../../lib/studio-banner';
import { todayLine } from '../../lib/studio-home';
import type { HomeBannerConfig } from './types';

export interface HomeBannerProps {
  now: Date;
  /** "Good afternoon" (greeting() in studio-kit.ts). */
  hello: string;
  /** The editor's first name ("there" when unknown). */
  firstName: string;
  /** The site's name (the workspace title). */
  title: string;
  /** The reassurance line under the name. */
  intro: string;
  banner?: HomeBannerConfig;
}

// Layout that @sanity/ui's responsive props cannot express (image sizes, the
// row/stack switch at 900px). Class names are this file's own; nothing here
// reaches into Sanity's markup.
const CSS = `
.ncs-hb{position:relative;overflow:hidden}
.ncs-hb__row{display:flex;flex-direction:column;gap:24px}
.ncs-hb__who{display:flex;flex-direction:column;gap:20px;min-width:0;flex:1}
.ncs-hb__mark{flex:none;width:72px;height:72px;display:grid;place-items:center}
.ncs-hb__mark--disc{border-radius:50%}
.ncs-hb__mark img{display:block;width:100%;height:100%;object-fit:contain}
.ncs-hb__mark--disc img{width:80%;height:80%}
.ncs-hb__go{flex:none;align-self:flex-start}
.ncs-hb__motif{display:block;width:100%;height:auto;user-select:none;pointer-events:none}
.ncs-hb__hello{font-size:1.5rem;line-height:1.25;font-weight:500;margin:0}
@media (min-width:600px){.ncs-hb__who{flex-direction:row;align-items:center;gap:28px}.ncs-hb__mark{width:104px;height:104px}}
@media (min-width:900px){.ncs-hb__row{flex-direction:row;align-items:center;gap:32px}.ncs-hb__go{align-self:center}.ncs-hb__mark{width:120px;height:120px}}
`;

export function HomeBanner({ now, hello, firstName, title, intro, banner = {} }: HomeBannerProps) {
  const root = useRootTheme();
  const font = root.theme.v2?.font;
  const display = font?.heading.family ?? 'serif';
  const body = font?.text.family ?? 'sans-serif';
  // The navbar's own theme (card 116): navy, dark scheme, in either appearance.
  const chrome = useMemo(() => buildChromeTheme({ display, body }), [display, body]);
  const bg = STUDIO_COLORS.chrome.bg;

  // The greeting is 24px (large text), so its accent needs 3:1.
  const accent = readableOn(banner.accent, bg, LARGE_CONTRAST);
  const parts = splitName(title, banner.lettering?.text);
  const face = parts ? fontFaceCss(banner.lettering?.family, banner.lettering?.src) : null;
  const letters =
    parts && face
      ? colorLetters(parts.lettered, readableColors(banner.lettering?.colors, bg))
      : null;
  const href = siteHref(
    banner.siteUrl,
    typeof window === 'undefined' ? undefined : window.location.origin,
  );
  const markSrc = banner.markOnDark ?? banner.mark;

  return (
    <ThemeProvider theme={chrome} scheme="dark">
      <style>{CSS + (face ?? '')}</style>
      <Card radius={4} className="ncs-hb" as="section" aria-label="Welcome">
        <Box padding={[4, 5, 6]}>
          <div className="ncs-hb__row">
            <div className="ncs-hb__who">
              {markSrc && (
                <div
                  className={['ncs-hb__mark', banner.markOnDark ? '' : 'ncs-hb__mark--disc']
                    .join(' ')
                    .trim()}
                  style={banner.markOnDark ? undefined : { background: STUDIO_COLORS.white }}
                >
                  {/* Decorative: the site's name is the heading right beside it. */}
                  <img src={markSrc} alt="" aria-hidden draggable={false} />
                </div>
              )}
              <Stack gap={4} style={{ minWidth: 0 }}>
                <Text size={1} muted weight="semibold" style={{ letterSpacing: '0.04em' }}>
                  {todayLine(now)}
                </Text>
                <p className="ncs-hb__hello" style={{ fontFamily: body }}>
                  {`${hello}, `}
                  <span style={accent ? { color: accent } : undefined}>{firstName}</span>
                </p>
                <Heading
                  as="h1"
                  size={[3, 4, 5]}
                  style={{ lineHeight: 1.15, textWrap: 'balance' }}
                  aria-label={letters ? title : undefined}
                >
                  {parts && letters ? (
                    <>
                      {parts.before}
                      <span
                        aria-hidden
                        style={{
                          fontFamily: letteringStack(banner.lettering!.family, display),
                          fontWeight: 400,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {letters.map((l, i) => (
                          <span key={i} style={l.color ? { color: l.color } : undefined}>
                            {l.char}
                          </span>
                        ))}
                      </span>
                      {parts.after}
                    </>
                  ) : (
                    title
                  )}
                </Heading>
                <Box style={{ maxWidth: 560 }}>
                  <Text size={2} muted style={{ lineHeight: 1.6 }}>
                    {intro}
                  </Text>
                </Box>
              </Stack>
            </div>
            <div className="ncs-hb__go">
              <Button
                as="a"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View the website (opens in a new tab)"
                text="View the website"
                iconRight={LaunchIcon}
                tone="primary"
                fontSize={2}
                padding={4}
              />
            </div>
          </div>
        </Box>
        {banner.motif && (
          // Decorative. Under 600px the narrow version, if the site has one, so the
          // strip keeps its scale on a phone instead of shrinking to beads.
          <picture>
            {banner.motifNarrow && (
              <source media="(max-width: 599px)" srcSet={banner.motifNarrow} />
            )}
            <img
              className="ncs-hb__motif"
              src={banner.motif}
              alt=""
              aria-hidden
              draggable={false}
            />
          </picture>
        )}
      </Card>
    </ThemeProvider>
  );
}
