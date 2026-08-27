import type { APIRoute } from 'astro';
import { validatePreviewUrl } from '@sanity/preview-url-secret';
import { perspectiveCookieName } from '@sanity/preview-url-secret/constants';
import {
  getPreviewClient,
  previewConfig,
  previewUnconfiguredResponse,
} from '@/lib/cms-preview';
import { previewCookieValue } from '@/lib/preview-auth';

export const prerender = false;

// Called by the Presentation Tool's preview iframe (never by a visitor) to turn
// on draft mode. Validates the one-time secret Sanity attaches to the preview
// URL, then sets the perspective cookie every preview page checks.
// (Ported from presacademy 2026-08-28.)
export const GET: APIRoute = async (context) => {
  // Before anything else: a clone with no project id or no runtime token cannot
  // validate a secret at all, and the Sanity client would throw. Say why.
  const config = previewConfig();
  if (!config.ok) return previewUnconfiguredResponse(config.missing);

  const client = getPreviewClient(true);
  const { isValid, redirectTo } = await validatePreviewUrl(client, context.request.url);

  if (!isValid) {
    return new Response('Invalid preview secret', { status: 401 });
  }

  // sameSite: 'none' + secure: true is required because the Presentation Tool
  // loads this page inside a cross-context iframe; a Lax or Strict cookie would
  // silently fail to stick.
  //
  // The VALUE is a server-side fingerprint, not the package's convention of
  // 'true'. See src/lib/preview-auth.ts.
  context.cookies.set(perspectiveCookieName, await previewCookieValue(), {
    path: '/',
    httpOnly: true,
    sameSite: 'none',
    secure: true,
  });

  return context.redirect(redirectTo || '/preview');
};
