// Foundation, edit with care
// CLI configuration for `sanity` commands (deploy, dataset import, typegen).

import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'placeholder-project-id',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  // The studio is published at reid-design.sanity.studio after `npm run studio:deploy`.
  studioHost: 'reid-design',
  deployment: {
    autoUpdates: true,
    appId: 'm91iomqo15juf2gkwn2v68wj',
  },
  // Typegen reads the extracted schema and writes types into the Astro project's src/lib/.
  // Schema is extracted via `sanity schema extract`; types generated via `sanity typegen generate`.
  typegen: {
    path: './schema.json',
    generates: '../src/lib/sanity.types.ts',
  },
});
