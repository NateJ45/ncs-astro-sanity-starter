import type { APIRoute } from 'astro';
import { perspectiveCookieName } from '@sanity/preview-url-secret/constants';

export const prerender = false;

// The "Exit preview" link target (PreviewLayout renders it). presentationTool's
// previewMode.disable is a documented no-op in this Sanity version, so leaving
// draft mode is this plain endpoint: clear the perspective cookie and send the
// browser to the real site.
export const GET: APIRoute = async (context) => {
  context.cookies.delete(perspectiveCookieName, { path: '/' });
  return context.redirect('/');
};
