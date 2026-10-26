// Safe to edit by hand
// =============================================================================
// /api/form-recipient/confirm/ - "Yes, send them to me" (PORTS.md card 174)
// =============================================================================
// The link in the email a new form address gets when an administrator saves it in the Studio
// (src/lib/form-recipients.ts). GET shows one button and changes nothing, so a mail scanner that
// opens the link cannot confirm it; the button POSTs the same signed token, and only then does
// the address start receiving messages. No Studio sign-in: the signed, expiring token is the
// proof, and it only ever confirms the exact address that was saved as pending.
//
// The page's colours come from brand/brand.config.json (light and dark palettes), so it looks
// like the site without loading the site's CSS.
// =============================================================================
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { site } from '@/data/site';
import brand from '../../../../brand/brand.config.json';
import { handleRecipientConfirm, type ConfirmTheme } from '@/lib/form-recipients';
import type { D1Database } from '@/lib/mail-db';
import { secretUsable } from '@/lib/mail-token';

export const prerender = false;

type Palette = Record<string, string | undefined>;

const themeFrom = (p: Palette | undefined): Partial<ConfirmTheme> | undefined =>
  p && {
    background: p['--background'],
    text: p['--foreground'],
    heading: p['--foreground'],
    button: p['--primary'],
    buttonText: p['--primary-foreground'],
  };

const palette = (brand as { palette?: { light?: Palette; dark?: Palette } }).palette;

const handler: APIRoute = async ({ request }) => {
  const e = env as unknown as { CONTACT_DB?: D1Database; MAIL_SECRET?: string };
  return handleRecipientConfirm(request, {
    db: e.CONTACT_DB ?? null,
    secret: secretUsable(e.MAIL_SECRET) ? e.MAIL_SECRET : null,
    siteName: site.name,
    theme: themeFrom(palette?.light),
    darkTheme: themeFrom(palette?.dark),
  });
};

export const GET = handler;
export const POST = handler;
