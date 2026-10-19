// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// mail-template - every email the site sends, in the site's own colours
// (the email backbone, PORTS.md card 121)
// =============================================================================
// One renderer for the newsletter, the "please confirm" email and the RSVP
// confirmation, so they all look like they came from the same place. Input is a
// short list of plain blocks (heading, paragraph, a list of items, a button, a
// note); output is { html, text }: every message goes out with a plain-text
// alternative.
//
// WHY IT LOOKS LIKE 2005 UNDERNEATH. Email clients are not browsers. Outlook on
// Windows renders with Word, Gmail strips <style> in some views, and nothing
// supports flexbox or grid reliably. So: nested <table>s, a 600px column, every
// style inline, bgcolor attributes as well as CSS backgrounds, system fonts.
//
// DARK MODE. Apple Mail and Outlook for Mac honour prefers-color-scheme, so the
// <style> block repaints the classed cells. Gmail's apps and Outlook.com invert
// colours on their own; the template survives that because every coloured cell
// sets BOTH its background and its text colour (no transparent PNG text, no
// colour that only works on white). Outlook.com's own hook, [data-ogsc], gets
// the same overrides.
//
// The brand comes from the site (src/lib/newsletter-content.ts reads
// brand/brand.config.json), never from an editor: rule 9 holds for email too.
// =============================================================================

export interface MailBrand {
  siteName: string;
  /** https://... with no trailing slash. */
  siteUrl: string;
  /** Buttons, the top rule and links. */
  accent: string;
  /** Text on the accent colour. */
  onAccent: string;
  /** Body text. */
  ink: string;
  /** The page behind the card. */
  paper: string;
  /** The card itself. */
  card: string;
  /** Quiet text. */
  muted: string;
  /** Hairlines between items. */
  rule?: string;
  /** Dark-mode equivalents (Apple Mail, Outlook for Mac). */
  dark: { paper: string; card: string; ink: string; muted: string; accent: string };
  /** A web-safe stack; email clients do not load the site's fonts. */
  fontStack: string;
  headingStack: string;
}

export interface MailItem {
  title: string;
  /** A short line above or beside the title: a date, a speaker. */
  meta?: string;
  text?: string;
  url?: string;
  linkLabel?: string;
}

export type MailBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'items'; heading?: string; items: MailItem[] }
  | { kind: 'button'; label: string; url: string }
  | { kind: 'note'; heading?: string; text: string };

export interface MailFooter {
  /** The postal address (CAN-SPAM). One or more lines. */
  address: string;
  /** Why the reader is getting this, in one sentence. */
  reason: string;
  /** Present on every newsletter and list email. */
  unsubscribeUrl?: string;
  /** "Read it on the website", for an issue with an archive page. */
  webUrl?: string;
}

export interface MailDocument {
  brand: MailBrand;
  /** The hidden line inbox previews show after the subject. */
  preheader?: string;
  /** The big line at the top. */
  title: string;
  blocks: MailBlock[];
  footer: MailFooter;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only web and mail links go into an email; anything else is dropped. */
export function safeUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const u = url.trim();
  return /^(https?:\/\/|mailto:)/i.test(u) ? u : null;
}

const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** A paragraph's own line breaks become <br>. */
const para = (text: string) => escapeHtml(text).replace(/\n/g, '<br>');

// -----------------------------------------------------------------------------
// HTML
// -----------------------------------------------------------------------------

function blockHtml(b: MailBlock, brand: MailBrand): string {
  const p = `margin:0 0 16px;font-family:${brand.fontStack};font-size:16px;line-height:1.6;color:${brand.ink};`;
  const h = `margin:24px 0 12px;font-family:${brand.headingStack};font-size:20px;line-height:1.3;font-weight:700;color:${brand.ink};`;
  const link = `color:${brand.accent};text-decoration:underline;`;
  switch (b.kind) {
    case 'heading':
      return `<h2 class="m-ink" style="${h}">${escapeHtml(b.text)}</h2>`;
    case 'paragraph':
      return paragraphs(b.text)
        .map((t) => `<p class="m-ink" style="${p}">${para(t)}</p>`)
        .join('');
    case 'note':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px;"><tr><td class="m-rule" style="border-left:4px solid ${brand.accent};padding:4px 0 4px 16px;">${
        b.heading
          ? `<p class="m-ink" style="${p}font-weight:700;">${escapeHtml(b.heading)}</p>`
          : ''
      }${paragraphs(b.text)
        .map((t) => `<p class="m-ink" style="${p}">${para(t)}</p>`)
        .join('')}</td></tr></table>`;
    case 'button': {
      const url = safeUrl(b.url);
      if (!url) return '';
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td class="m-btn" bgcolor="${brand.accent}" style="background:${brand.accent};border-radius:6px;"><a class="m-btn-a" href="${escapeHtml(url)}" style="display:inline-block;padding:14px 24px;font-family:${brand.fontStack};font-size:16px;font-weight:700;line-height:1.2;color:${brand.onAccent};text-decoration:none;border-radius:6px;">${escapeHtml(b.label)}</a></td></tr></table>`;
    }
    case 'items': {
      if (!b.items.length) return '';
      const rows = b.items
        .map((it) => {
          const url = safeUrl(it.url);
          const title = url
            ? `<a href="${escapeHtml(url)}" style="${link}font-weight:700;">${escapeHtml(it.title)}</a>`
            : `<strong>${escapeHtml(it.title)}</strong>`;
          return `<tr><td class="m-rule" style="padding:12px 0;border-top:1px solid ${brand.rule ?? brand.muted};">${
            it.meta
              ? `<p class="m-muted" style="margin:0 0 4px;font-family:${brand.fontStack};font-size:13px;line-height:1.4;color:${brand.muted};text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(it.meta)}</p>`
              : ''
          }<p class="m-ink" style="margin:0;font-family:${brand.fontStack};font-size:17px;line-height:1.45;color:${brand.ink};">${title}</p>${
            it.text
              ? `<p class="m-ink" style="margin:6px 0 0;font-family:${brand.fontStack};font-size:15px;line-height:1.55;color:${brand.ink};">${para(it.text)}</p>`
              : ''
          }${
            url && it.linkLabel
              ? `<p style="margin:6px 0 0;font-family:${brand.fontStack};font-size:15px;line-height:1.4;"><a href="${escapeHtml(url)}" style="${link}">${escapeHtml(it.linkLabel)}</a></p>`
              : ''
          }</td></tr>`;
        })
        .join('');
      return `${b.heading ? `<h2 class="m-ink" style="${h}">${escapeHtml(b.heading)}</h2>` : ''}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">${rows}</table>`;
    }
  }
}

export function renderEmailHtml(doc: MailDocument): string {
  const { brand, footer } = doc;
  const d = brand.dark;
  const small = `margin:0 0 8px;font-family:${brand.fontStack};font-size:13px;line-height:1.5;color:${brand.muted};`;
  const footLink = `color:${brand.muted};text-decoration:underline;`;
  const web = safeUrl(footer.webUrl);
  const unsub = safeUrl(footer.unsubscribeUrl);
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(doc.title)}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; }
  a { color:${brand.accent}; }
  @media (max-width: 620px) { .m-pad { padding:24px 20px !important; } }
  @media (prefers-color-scheme: dark) {
    .m-paper { background:${d.paper} !important; }
    .m-card { background:${d.card} !important; }
    .m-ink, .m-ink strong { color:${d.ink} !important; }
    .m-muted, .m-muted a { color:${d.muted} !important; }
    .m-rule { border-color:${d.muted} !important; }
    .m-top { background:${d.accent} !important; }
    a { color:${d.accent} !important; }
    .m-btn { background:${d.accent} !important; }
    .m-btn-a { color:${d.paper} !important; }
  }
  [data-ogsc] .m-paper { background:${d.paper} !important; }
  [data-ogsc] .m-card { background:${d.card} !important; }
  [data-ogsc] .m-ink { color:${d.ink} !important; }
  [data-ogsc] .m-muted { color:${d.muted} !important; }
</style>
</head>
<body class="m-paper" style="margin:0;padding:0;background:${brand.paper};">
${doc.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(doc.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>` : ''}
<table role="presentation" class="m-paper" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${brand.paper}" style="background:${brand.paper};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td class="m-top" bgcolor="${brand.accent}" style="background:${brand.accent};height:6px;line-height:6px;font-size:6px;border-radius:8px 8px 0 0;">&nbsp;</td></tr>
<tr><td class="m-card m-pad" bgcolor="${brand.card}" style="background:${brand.card};padding:32px 40px;border-radius:0 0 8px 8px;">
<p class="m-muted" style="margin:0 0 20px;font-family:${brand.headingStack};font-size:15px;line-height:1.3;font-weight:700;letter-spacing:0.02em;color:${brand.muted};"><a href="${escapeHtml(brand.siteUrl)}/" style="color:${brand.muted};text-decoration:none;">${escapeHtml(brand.siteName)}</a></p>
<h1 class="m-ink" style="margin:0 0 20px;font-family:${brand.headingStack};font-size:28px;line-height:1.2;font-weight:700;color:${brand.ink};">${escapeHtml(doc.title)}</h1>
${doc.blocks.map((b) => blockHtml(b, brand)).join('\n')}
</td></tr>
<tr><td class="m-pad" style="padding:24px 40px;">
${web ? `<p class="m-muted" style="${small}"><a href="${escapeHtml(web)}" style="${footLink}">Read this on the website</a></p>` : ''}
<p class="m-muted" style="${small}">${escapeHtml(footer.reason)}</p>
<p class="m-muted" style="${small}">${escapeHtml(brand.siteName)}<br>${para(footer.address)}</p>
${unsub ? `<p class="m-muted" style="${small}"><a href="${escapeHtml(unsub)}" style="${footLink}">Unsubscribe</a>, one click, no questions.</p>` : ''}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// -----------------------------------------------------------------------------
// Plain text
// -----------------------------------------------------------------------------

function blockText(b: MailBlock): string {
  switch (b.kind) {
    case 'heading':
      return `${b.text.toUpperCase()}\n`;
    case 'paragraph':
      return paragraphs(b.text).join('\n\n') + '\n';
    case 'note':
      return `${b.heading ? `${b.heading}\n` : ''}${paragraphs(b.text).join('\n\n')}\n`;
    case 'button': {
      const url = safeUrl(b.url);
      return url ? `${b.label}: ${url}\n` : '';
    }
    case 'items': {
      if (!b.items.length) return '';
      const lines = b.items.map((it) => {
        const url = safeUrl(it.url);
        return [
          `* ${it.title}${it.meta ? ` (${it.meta})` : ''}`,
          it.text ? `  ${it.text.replace(/\n/g, '\n  ')}` : '',
          url ? `  ${url}` : '',
        ]
          .filter(Boolean)
          .join('\n');
      });
      return `${b.heading ? `${b.heading.toUpperCase()}\n` : ''}${lines.join('\n\n')}\n`;
    }
  }
}

export function renderEmailText(doc: MailDocument): string {
  const { footer } = doc;
  const web = safeUrl(footer.webUrl);
  const unsub = safeUrl(footer.unsubscribeUrl);
  return [
    doc.brand.siteName,
    '',
    doc.title,
    '='.repeat(Math.min(doc.title.length, 60)),
    '',
    doc.blocks.map(blockText).filter(Boolean).join('\n'),
    '--',
    web ? `Read this on the website: ${web}` : '',
    footer.reason,
    `${doc.brand.siteName}, ${footer.address.replace(/\n+/g, ', ')}`,
    unsub ? `Unsubscribe: ${unsub}` : '',
  ]
    .filter((line, i, all) => line !== '' || all[i - 1] !== '')
    .join('\n')
    .trim();
}

export function renderEmail(doc: MailDocument): { html: string; text: string } {
  return { html: renderEmailHtml(doc), text: renderEmailText(doc) };
}

// -----------------------------------------------------------------------------
// The brand, from brand/brand.config.json
// -----------------------------------------------------------------------------

interface BrandConfigLike {
  palette?: { light?: Record<string, string>; dark?: Record<string, string> };
  fonts?: { display?: { familyValue?: string }; body?: { familyValue?: string } };
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Email clients cannot load the site's web fonts: keep the stack's fallbacks only. */
export function emailFontStack(familyValue: string | undefined, fallback: string): string {
  const parts = (familyValue ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const rest = parts.slice(1);
  return rest.length ? rest.join(', ').replace(/"/g, "'") : fallback;
}

/**
 * The site's colours, as an email can use them. Only plain hex survives every
 * client, so a token in another notation (oklch, rgba) falls back to a safe
 * neutral instead of disappearing.
 */
export function brandFromConfig(
  cfg: BrandConfigLike,
  siteName: string,
  siteUrl: string,
): MailBrand {
  const l = cfg.palette?.light ?? {};
  const dk = cfg.palette?.dark ?? {};
  const pick = (p: Record<string, string>, keys: string[], fallback: string) => {
    for (const k of keys) if (HEX.test(p[k] ?? '')) return p[k];
    return fallback;
  };
  return {
    siteName,
    siteUrl: siteUrl.replace(/\/+$/, ''),
    accent: pick(l, ['--primary', '--link'], '#1F4E79'),
    onAccent: pick(l, ['--primary-foreground'], '#FFFFFF'),
    ink: pick(l, ['--foreground'], '#1A1A1A'),
    paper: pick(l, ['--muted', '--background'], '#F4F4F2'),
    card: pick(l, ['--card', '--background'], '#FFFFFF'),
    muted: pick(l, ['--muted-foreground'], '#5A5F6B'),
    rule: pick(l, ['--border', '--border-soft'], '#DDDDDD'),
    dark: {
      paper: pick(dk, ['--background'], '#15171C'),
      card: pick(dk, ['--card', '--background'], '#1E2128'),
      ink: pick(dk, ['--foreground'], '#F2F3F5'),
      muted: pick(dk, ['--muted-foreground'], '#B5B9C2'),
      accent: pick(dk, ['--primary', '--link'], '#9CC3EA'),
    },
    fontStack: emailFontStack(cfg.fonts?.body?.familyValue, 'Helvetica, Arial, sans-serif'),
    headingStack: emailFontStack(cfg.fonts?.display?.familyValue, 'Georgia, serif'),
  };
}
