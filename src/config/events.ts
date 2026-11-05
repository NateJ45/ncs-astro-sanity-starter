// Safe to edit by hand
// =============================================================================
// events.ts - this site's map for the GA4 event layer (PORTS.md card 217)
// =============================================================================
// NOT PORTABLE: each site edits this file. The shared half is src/lib/track.ts
// and src/components/analytics/SiteEvents.astro; they read this map and nothing
// else. With the map empty (as here) only the built-in rules run:
//
//   contact_click      an email or phone link (the kind only, never the address)
//   watch_click        YouTube or Vimeo
//   directions_click   a Google or Apple Maps link
//   download_click     a PDF, document, spreadsheet, archive or audio/video file
//   outbound_click     any other link to another site
//   form_view          a form (form[data-track-form]) came 40% into view
//   embed_interact     the visitor first used a frame (video, or a form frame)
//   generate_lead      a sign-up or contact form was sent (the form calls track())
//   site_search        the last search term once the visitor pauses
//   search_no_results  the same, when nothing was found
//   article_progress   25, 50, 75 and 100% of an article's text passed
//   article_read       the end reached after real reading time
//   page_not_found     the 404 page
//   js_error           an error in the site's own scripts, at most three a page view
//
// Add rules for what only this site has: where giving happens, where people
// register, an app, social networks. Rules are tried in order and the first
// match wins; yours run before the built-in ones. The privacy
// wording follows by itself: the privacy page lists the kinds of event this map
// sends (src/lib/event-kinds.ts). Give an event of your own a plain-words
// `describe` line (describe: 'links to the church app') or the page says
// "other links the site marks".
//
// Docs: docs/agent/analytics.md.
// =============================================================================

import type { EventsConfig } from '@/lib/track';

export const eventsConfig: EventsConfig = {
  links: [
    // Giving. A page on this site and the giving platform it hands off to:
    // { own: true, path: /^\/give(\/|$)/, event: 'give_click', params: { destination: 'give_page' } },
    // { host: 'give.example.org', event: 'give_click', params: { destination: 'platform' } },
    //
    // Registering for an event or a class:
    // { host: 'register.example.org', event: 'register_click', params: { destination: 'registration' } },
    //
    // A calendar file (any host):
    // { path: /\.ics$/, event: 'calendar_add', describe: 'calendar files' },
  ],

  // Events this site does not send, by name. Enhanced measurement in GA4
  // already counts outbound clicks and file downloads, so a site that has it
  // on may prefer to switch ours off to avoid two counts:
  // off: ['outbound_click', 'download_click'],
  off: [],

  // Where the page parts live, if this site's markup differs from the defaults:
  // formSelector: 'form[data-track-form]',
  // formFrameSelector: '[data-my-form-frame]',
  // articleSelector: '[data-article-body]',
  // notFoundSelector: '[data-page-not-found]',
};
