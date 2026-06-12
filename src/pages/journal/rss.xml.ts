// Safe to edit by hand
// Journal RSS feed. Uses @astrojs/rss (already a project dependency).
// Respects the sectionVisibility.showJournal gate — returns an empty item
// list when the journal section is hidden, matching the same gate that
// journal/index.astro and journal/[slug].astro enforce.

import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getAllJournalEntries, getSiteSettings } from '@/lib/queries';
import { getSectionVisibility } from '@/lib/sectionVisibility';
import { site } from '@/data/site';

export const GET: APIRoute = async (context) => {
  const [entries, siteSettings] = await Promise.all([
    getAllJournalEntries().catch(() => []),
    getSiteSettings().catch(() => null),
  ]);

  const visible = getSectionVisibility(siteSettings?.sectionVisibility);

  const items = visible.journal
    ? (entries ?? []).map((entry: any) => ({
        title: entry.title ?? '(untitled)',
        link: `/journal/${entry.slug?.current ?? ''}`,
        pubDate: entry.publishedAt ? new Date(entry.publishedAt) : undefined,
        description: entry.excerpt ?? undefined,
      }))
    : [];

  return rss({
    title: `${siteSettings?.title ?? site.name} Journal`,
    description: 'Notes from the studio.',
    site: context.site ?? site.url,
    items,
  });
};
