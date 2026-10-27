// Safe to edit by hand
// The client review layer (PORTS.md card 195, ported from First Baptist Auburn's "For Jacob"
// notes). Before launch it gives a client one place to see what you need from them: a small notes
// pill on every page (src/components/ClientNotes.astro), yellow highlighting of "[Client: ...]"
// and "[Placeholder: ...]" wording wherever it sits in the page, and "Photo needed" boxes over
// stand-in pictures (src/data/shot-list.ts). Docs: docs/agent/client-notes.md.
//
// It ships OFF. To use it on a site: set CLIENT_NOTES_ON to true, set CLIENT_NAME, and write the
// notes below. At launch set CLIENT_NOTES_ON back to false. It also stays quiet on its own when
// src/data/site.ts holds a real domain, and src/lib/client-notes.test.ts fails if the switch is
// still on then, so it cannot reach production by accident (see src/lib/client-notes.ts).

import { clientNotesActive } from '../lib/client-notes.ts';
import { publicPath } from '../lib/page-path.ts';
import { site } from './site.ts';

/** THE SWITCH. false in the starter; true while the client is reviewing a pre-launch site. */
export const CLIENT_NOTES_ON = false;

/** What the pill calls the person it is for: "For Pat". Use "you" if you would rather. */
export const CLIENT_NAME = 'the client';

/**
 * The words that mark wording the client must fill in or react to: "[Client: ...]" is something
 * only they can write, "[Placeholder: ...]" is a draft of yours, "[Photo: ...]" a picture to send.
 * Add the client's own name here if you like ("Pat" makes "[Pat: ...]" highlight too).
 */
export const MARKERS: readonly string[] = ['Client', 'Placeholder', 'Photo'];

/** Whether the layer draws right now: the switch is on and the site is on a pre-launch address. */
export const CLIENT_NOTES_ACTIVE = clientNotesActive(CLIENT_NOTES_ON, site.url);

export interface ClientNote {
  title: string;
  detail?: string;
}

// Keys are page paths with a trailing slash ("/" for Home). Keep each note to one thing the
// client can act on: a title, then a sentence on what you want and why. Photos are not listed
// here: the shot list (src/data/shot-list.ts) adds one note per "Photo needed" box on the page.
// The starter ships no notes; a pre-launch site adds its own, for example:
//
//   '/': [
//     { title: 'Your welcome, in your words.', detail: 'The line under the headline is a draft.' },
//   ],
const NOTES: Record<string, ClientNote[]> = {};

/** The notes for a page path (with or without a trailing slash, live or draft preview). */
export function notesFor(pathname: string): ClientNote[] {
  return NOTES[publicPath(pathname)] ?? [];
}

/** Every page with notes, for a one-page list to send the client. */
export function allNotes(): [string, ClientNote[]][] {
  return Object.entries(NOTES);
}
