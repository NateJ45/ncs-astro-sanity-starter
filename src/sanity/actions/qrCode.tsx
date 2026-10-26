// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// "QR code" in a document's menu (PORTS.md card 171)
// =============================================================================
// On every short link and every document with a page of its own (a page, a
// journal post, Home), this opens a dialog with the code and two buttons: download an
// SVG (sharp at any size, for a print shop or Publisher) and a PNG (for Word,
// Canva or a slide).
//
// WHAT THE CODE POINTS AT. A short link's code holds the short address
// ("https://<site domain>/spring"); a page's holds its full address on the site's
// own domain (src/data/site.ts), never the Studio's preview address. Codes
// made before the site's own domain is set point at the temporary address,
// and the dialog says so: those are the ones to make again after the move. A
// short link's code also survives a page being renamed, since the short link
// follows the page.
//
// The library (qrcode-generator, MIT, no dependencies) is imported only here,
// lazily when the dialog opens, so it never reaches the public site and does
// not slow the Studio's first load. The file-making is src/lib/qr.ts.
// =============================================================================
import { useEffect, useMemo, useState } from 'react';
import type { DocumentActionComponent, DocumentActionDescription } from 'sanity';
import { Box, Button, Card, Flex, Stack, Text } from '@sanity/ui';
import { DownloadIcon } from '@sanity/icons/Download';
import { ThLargeIcon } from '@sanity/icons/ThLarge';
import { site } from '../../data/site';
import { withTrailingSlash } from '../../lib/href';
import { qrFileName, qrPngScale, qrSvg, QUIET_ZONE, type QrGrid } from '../../lib/qr';
import { shortLinkUrl } from '../../lib/short-links';
import { pathForDoc } from '../urls';

/** True while the website is still on its temporary workers.dev address. */
const TEMPORARY_DOMAIN = /\.workers\.dev$/.test(site.domain);

/** Types with an address that never get a code. */
const NO_QR_TYPES = new Set(['privatePage', 'notFoundPage']);

/** The address a document's QR code holds, or null when it has none. */
export function qrTargetFor(type: string, doc: unknown): string | null {
  if (!doc) return null;
  if (type === 'shortLink') {
    return shortLinkUrl(site.url, (doc as { address?: unknown }).address);
  }
  // Private pages are not shared by QR (the password would have to travel with
  // it), and nobody prints a code for the not-found page.
  if (NO_QR_TYPES.has(type)) return null;
  const path = pathForDoc(type, doc);
  if (path === null) return null;
  return `${site.url}${withTrailingSlash(path)}`;
}

function download(name: string, blob: Blob) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function pngFrom(grid: QrGrid): Promise<Blob | null> {
  const scale = qrPngScale(grid);
  const n = grid.getModuleCount();
  const size = (n + QUIET_ZONE * 2) * scale;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (grid.isDark(r, c)) {
        ctx.fillRect((c + QUIET_ZONE) * scale, (r + QUIET_ZONE) * scale, scale, scale);
      }
    }
  }
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

function QrDialogBody({ url, isShortLink }: { url: string; isShortLink: boolean }) {
  const [grid, setGrid] = useState<QrGrid | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let gone = false;
    import('qrcode-generator')
      .then((mod) => {
        const qrcode = (mod as unknown as { default?: unknown }).default ?? mod;
        // 'M' corrects about 15% damage: a fold or a smudge on a flyer.
        const qr = (
          qrcode as unknown as (
            t: 0,
            e: 'M',
          ) => QrGrid & {
            addData(s: string): void;
            make(): void;
          }
        )(0, 'M');
        qr.addData(url);
        qr.make();
        if (!gone) setGrid(qr);
      })
      .catch(() => !gone && setFailed(true));
    return () => {
      gone = true;
    };
  }, [url]);

  const svg = useMemo(
    () => (grid ? qrSvg(grid, { title: `QR code for ${url}` }) : ''),
    [grid, url],
  );
  const name = qrFileName(url);

  return (
    <Stack gap={4} padding={4}>
      <Text size={1}>
        Phone cameras that scan this code open <strong>{url}</strong>
      </Text>
      <Flex justify="center">
        <Card
          padding={2}
          radius={2}
          shadow={1}
          style={{ background: '#fff', width: 240, height: 240, lineHeight: 0 }}
        >
          {grid ? (
            // Generated here from the address above, never from pasted text.
            <div
              style={{ width: '100%', height: '100%' }}
              aria-label={`QR code for ${url}`}
              role="img"
              dangerouslySetInnerHTML={{
                __html: svg.replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"'),
              }}
            />
          ) : (
            <Box padding={4}>
              <Text size={1} muted>
                {failed
                  ? 'The QR code could not be made. Check your connection and try again.'
                  : 'Making the code...'}
              </Text>
            </Box>
          )}
        </Card>
      </Flex>
      <Flex gap={2} justify="center" wrap="wrap">
        <Button
          icon={DownloadIcon}
          text="Download SVG (for printing)"
          tone="primary"
          disabled={!grid}
          onClick={() => download(`${name}.svg`, new Blob([svg], { type: 'image/svg+xml' }))}
        />
        <Button
          icon={DownloadIcon}
          text="Download PNG (for Word or slides)"
          mode="ghost"
          disabled={!grid}
          onClick={() => {
            if (!grid) return;
            void pngFrom(grid).then((b) => b && download(`${name}.png`, b));
          }}
        />
      </Flex>
      <Text size={1} muted>
        Print it at least 2 cm (about an inch) wide, and test it with your phone before printing a
        whole run.
      </Text>
      {isShortLink ? (
        <Text size={1} muted>
          This code holds the short link, so you can change where it goes later and the printed code
          keeps working.
        </Text>
      ) : (
        <Text size={1} muted>
          This code holds the page’s full address. If you might rename the page, make a short link
          for it instead and use that code.
        </Text>
      )}
      {TEMPORARY_DOMAIN && (
        <Card padding={3} radius={2} tone="caution">
          <Text size={1}>
            The website is still on its temporary address. Codes made now point there, so make them
            again once the website moves to its own address.
          </Text>
        </Card>
      )}
    </Stack>
  );
}

/**
 * Document action: "QR code". Registered in sanity.config.ts after the other
 * page actions; returns null for documents with no public address.
 */
export const qrCodeAction: DocumentActionComponent = (props) => {
  const [open, setOpen] = useState(false);
  const url = qrTargetFor(props.type, props.published);
  // Only types that can have a public address get the action at all.
  const hasAddress =
    props.type === 'shortLink' || pathForDoc(props.type, { slug: { current: 'x' } }) !== null;
  if (!hasAddress || NO_QR_TYPES.has(props.type)) return null;
  return {
    label: 'QR code',
    icon: ThLargeIcon,
    disabled: !url,
    title: url
      ? 'Download a QR code for flyers and print.'
      : 'Publish it first. The QR code opens the published address.',
    onHandle: () => setOpen(true),
    dialog:
      open && url
        ? {
            type: 'dialog',
            header: 'QR code',
            onClose: () => {
              setOpen(false);
              props.onComplete?.();
            },
            content: <QrDialogBody url={url} isShortLink={props.type === 'shortLink'} />,
          }
        : null,
  } satisfies DocumentActionDescription;
};
