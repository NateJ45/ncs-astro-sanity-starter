// scaffold-file: documents
// Safe to edit by hand
// =============================================================================
// libraryDocument - "Document": a file people can download (PORTS.md card 197)
// =============================================================================
// Price lists, forms, policies, reports, minutes, newsletters, brochures. One file each, with a
// date and a group name. The Documents block shows the newest of a group, worked out at build
// time (src/lib/documents.ts), so there is nothing to switch over: upload the new one and
// publish. An expiry date takes a file down by itself (the site rebuilds every morning).
//
// Built from FBC Auburn's downloads collection (bulletins, forms, policies) as the generic
// version: the group is a word the editor types, not a fixed list.
//
// THE DATASET IS PUBLIC, and so is every uploaded file: a document with a private phone number
// or a client's details is public the moment it is uploaded.
// =============================================================================

import { defineType, defineField } from 'sanity';
import { DownloadIcon } from '@sanity/icons/Download';
import { previewDate, previewSubtitle } from '../../lib/studio-icons';
import { today } from '../../lib/documents';
import { publishAtField } from './_publishAt';

export const libraryDocument = defineType({
  name: 'libraryDocument',
  title: 'Document',
  type: 'document',
  icon: DownloadIcon,
  initialValue: () => ({ date: today(new Date()) }),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'What people see, like "Price list 2027" or "Volunteer sign-up form".',
      validation: (R) => R.required().max(100),
    }),
    defineField({
      name: 'category',
      title: 'Group (optional)',
      type: 'string',
      description:
        'A word to file it under, like "Forms" or "Reports". A Documents block can show one group, or every group. Type it the same way each time.',
      validation: (R) => R.max(40),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      description: 'The newest date shows first.',
      options: { dateFormat: 'MMMM D, YYYY' },
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'file',
      title: 'File',
      type: 'file',
      description:
        'A PDF is best: it opens on every phone. Anything uploaded here is public, so leave out private phone numbers and details that are not meant for everyone.',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'note',
      title: 'Short note (optional)',
      type: 'string',
      description: 'A few words under the title, like "Due back by June 1".',
    }),
    defineField({
      name: 'expires',
      title: 'Take it down after (optional)',
      type: 'date',
      description:
        'The last day it shows. The website drops it the next morning. Leave empty to keep it up.',
      options: { dateFormat: 'MMMM D, YYYY' },
    }),
    // Free-tier scheduled publishing; see ./_publishAt.ts. No tab bar on this type, so no group.
    { ...publishAtField(), group: undefined },
  ],
  orderings: [
    { title: 'Newest first', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'title', category: 'category', date: 'date', expires: 'expires' },
    prepare: ({ title, category, date, expires }) => ({
      title: title || 'New document',
      // "October 12, 2026 · Forms", and "Taken down" once it has expired.
      subtitle: previewSubtitle(
        previewDate(date) || 'No date yet',
        category,
        expires && expires < today(new Date()) ? 'Taken down' : '',
      ),
    }),
  },
});
