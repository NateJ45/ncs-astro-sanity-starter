// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// previewShare - one record per private preview link (PORTS.md card 117)
// =============================================================================
// Written by the "Share a preview" dialog, read by the Worker on every visit to
// the link (src/lib/preview-share-server.ts). It holds NO token: the signed
// link exists only in the dialog and the clipboard. Its id is
// `previewShare.<nonce>`, a path id Sanity serves to signed-in requests only.
// Registered so the Studio and `npm run audit:data` know the type; it is never
// listed in the desk and never offered under "Create".
// =============================================================================
import { defineField, defineType } from 'sanity';
import { LinkIcon } from '@sanity/icons/Link';
import { SHARE_RECORD_TYPE } from '../../lib/preview-share';

export const previewShareType = defineType({
  name: SHARE_RECORD_TYPE,
  title: 'Preview link',
  type: 'document',
  icon: LinkIcon,
  readOnly: true,
  fields: [
    defineField({ name: 'title', title: 'Page', type: 'string' }),
    defineField({ name: 'docId', title: 'Document id', type: 'string' }),
    defineField({ name: 'docType', title: 'Document type', type: 'string' }),
    defineField({ name: 'path', title: 'Preview path', type: 'string' }),
    defineField({ name: 'days', title: 'Days', type: 'number' }),
    defineField({ name: 'expiresAt', title: 'Works until', type: 'datetime' }),
    defineField({ name: 'createdBy', title: 'Made by (user id)', type: 'string' }),
    defineField({ name: 'revoked', title: 'Stopped', type: 'boolean' }),
  ],
  preview: {
    select: { title: 'title', expiresAt: 'expiresAt', revoked: 'revoked' },
    prepare: ({ title, expiresAt, revoked }) => ({
      title: title || 'Preview link',
      subtitle: revoked
        ? 'Stopped'
        : expiresAt
          ? `Works until ${String(expiresAt).slice(0, 10)}`
          : '',
    }),
  },
});
