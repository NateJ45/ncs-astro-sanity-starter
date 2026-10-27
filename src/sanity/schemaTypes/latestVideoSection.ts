// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// latestVideoSection - "Latest video": the newest upload from a YouTube channel (card 197)
// =============================================================================
// An editor pastes the channel once and the site shows its newest video, with no key and no
// manual update: the id is read from the channel's public feed at BUILD time
// (src/lib/youtube-feed.ts) and the site rebuilds on every publish and on its schedule. The
// block draws nothing at all when no channel is set or YouTube cannot be reached, so a blank
// field or a bad day on YouTube never leaves an empty box on the page.
//
// Built for FBC Auburn's "Last Sunday" replay; this is the version with no church words in it.
// Rule 9: no colour or surface field; the page's rhythm decides the band.
// =============================================================================
import { defineField, defineType } from 'sanity';
import { PlayIcon } from '@sanity/icons/Play';
import { channelIdFrom } from '../../lib/youtube-feed';

export const latestVideoSection = defineType({
  name: 'latestVideoSection',
  title: 'Latest video (from YouTube)',
  type: 'object',
  icon: PlayIcon,
  description:
    'Shows the newest video from your YouTube channel and keeps itself up to date. Nothing shows until you paste the channel ID below.',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'Latest video',
      validation: (R) => R.max(90),
    }),
    defineField({
      name: 'intro',
      title: 'A line under the heading (optional)',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'channelId',
      title: 'YouTube channel ID',
      type: 'string',
      description:
        'A code that starts with UC and is 24 characters long. In YouTube, open your channel, then Customize channel, Basic info, Channel URL and copy the part after /channel/. Pasting the whole /channel/ link works too. A @name link does not.',
      validation: (R) => [
        R.custom((value) =>
          !value || channelIdFrom(String(value))
            ? true
            : 'That is not a channel ID. It starts with UC and is 24 characters long, not a @name.',
        ),
        R.custom((value) =>
          value ? true : 'Add the channel ID, or this block shows nothing on the website.',
        ).warning(),
      ],
    }),
    defineField({
      name: 'showChannelLink',
      title: 'Show a link to all videos on YouTube',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: { heading: 'heading', channelId: 'channelId' },
    prepare: ({ heading, channelId }) => ({
      title: heading || 'Latest video',
      subtitle: channelId ? 'Newest video from your channel' : 'No channel yet: shows nothing',
    }),
  },
});
