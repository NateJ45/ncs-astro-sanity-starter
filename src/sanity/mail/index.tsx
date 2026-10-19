// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// ncsMailTools - the Studio side of the email backbone (PORTS.md card 127)
// =============================================================================
//   - "Send a test to me" and "Send to everyone" on the Newsletter type.
//   - the "RSVPs" tool: counts per event, the replies, a CSV download.
// Home's Newsletter card and the RSVP lines in "Coming up" and Messages are
// drawn by the kit and the inbox (they import from ./MailHome).
//
// Register it BEFORE ncsStudioKit in sanity.config.ts, so the kit's tool order
// and staff view (kit.config.ts `toolOrder` / `staffTools`) can place "rsvps".
// Everything here talks to the Worker through the protected /api/studio/*
// routes; with mail not set up, each piece says so in plain words.
// =============================================================================
import { definePlugin } from 'sanity';
import { UsersIcon } from '@sanity/icons/Users';
import { SendAllAction, SendTestAction } from './NewsletterActions';
import { RsvpTool } from './RsvpTool';

export interface MailToolsOptions {
  /** The newsletter document type. Default "newsletter". */
  newsletterType?: string;
  /** Show the RSVPs tool. Default true. */
  rsvps?: boolean;
}

export const ncsMailTools = definePlugin<MailToolsOptions | void>((options) => {
  const type = options?.newsletterType ?? 'newsletter';
  return {
    name: 'ncs-mail-tools',
    tools: (prev) =>
      options?.rsvps === false
        ? prev
        : [...prev, { name: 'rsvps', title: 'RSVPs', icon: UsersIcon, component: RsvpTool }],
    document: {
      actions: (prev, { schemaType }) =>
        schemaType === type ? [...prev, SendTestAction, SendAllAction] : prev,
    },
  };
});
