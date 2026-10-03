// Safe to edit by hand, but normally WRITTEN BY `npm run apply-brand` from the
// `layout` block of brand/brand.config.json. Edit the config, not this file.
// Defaults (inline, bleed, standard, standard) reproduce the original layout.
import { resolveLayout } from '@/lib/site-layout';

export const layout = resolveLayout({
  header: 'inline',
  hero: 'bleed',
  density: 'standard',
  cards: 'standard',
});
