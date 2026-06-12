// Safe to edit by hand
// Build-time robots.txt endpoint. Generates robots.txt from the canonical
// site URL in src/data/site.ts so the Sitemap line stays in sync automatically.

import type { APIRoute } from 'astro';
import { site } from '@/data/site';

export const GET: APIRoute = () => {
  const body = [
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${site.url}/sitemap-index.xml`,
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
