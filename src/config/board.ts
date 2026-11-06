// Safe to edit by hand
// =============================================================================
// board.ts - this site's Report (the Studio tool, PORTS.md card 218)
// =============================================================================
// NOT PORTABLE: each site edits this file. The shared half (the arithmetic in
// src/lib/studio-board.ts, the screen in src/sanity/kit/board/, the route
// /api/studio/board/) reads this and nothing else, so a site's report is its
// own: its parts, its words, its measures.
//
// The tool appears in the Studio when PUBLIC_BOARD_REPORT is "true" at build
// time (deploy.yml passes the repository variable). The numbers come from
// Google Analytics and Search Console through studio-status (card 136's
// SITE_DATA binding); without that the tool explains what is needed.
//
// MEASURES
//   Numbers, for tiles and by-month charts:
//     visitors, visits, pageViews, newVisitors, searchClicks, searchAppearances,
//     event:<name>   a GA4 event the site sends (docs/agent/analytics.md) AND
//                    studio-status counts for this site (its site-series-config).
//   Lists, for charts only:
//     topContent (prefix: ['/journal/'] keeps those paths), channels, places,
//     countries, searchQueries, searchPages.
//
// WORDS: write what an editor would say. "Visitors" and "pages viewed", never
// "sessions" or "engagement rate". No em-dashes. Put how a number is counted in
// `explain`: it sits behind the "i" button, out of the way.
//
// DATES
//   firstMonth  the first month the picker offers.
//   since       the day a measure was first counted; before it the report says
//               "Not tracked yet", never 0. `all` covers every measure.
//   gaps        months when counting was down, with a sentence: left out of
//               charts, and no year-on-year change on a period that touches one.
// =============================================================================

import type { BoardConfig } from '../lib/studio-board';
import { site } from '../data/site';

export const boardConfig: BoardConfig = {
  siteName: site.name,
  firstMonth: '2026-01',
  timeZone: 'America/New_York',
  since: { all: '2026-01-01' },
  gaps: [],

  overview: {
    tiles: [
      {
        measure: 'visitors',
        label: 'Visitors',
        explain:
          'People who came to the website. Someone who comes back in the same period is counted once.',
      },
      {
        measure: 'pageViews',
        label: 'Pages viewed',
        explain: 'Every page opened, by anyone. One visitor reading four pages adds four.',
      },
      {
        measure: 'event:generate_lead',
        label: 'Forms sent',
        explain:
          'Each time someone sent the contact form or signed up, counted when it went through.',
      },
      {
        measure: 'event:contact_click',
        label: 'Email and phone clicks',
        explain: 'Clicks on an email address or a phone number on the website.',
      },
      {
        measure: 'searchClicks',
        label: 'Clicks from Google',
        explain:
          'Times someone chose the website in a Google search. From Google Search Console, which runs about three days behind.',
      },
    ],
    charts: [
      { measure: 'visitors', title: 'Visitors by month' },
      { measure: 'event:generate_lead', title: 'Forms sent by month' },
      { measure: 'channels', title: 'How people found the website' },
      { measure: 'topContent', title: 'Most viewed pages' },
    ],
  },

  parts: [
    {
      id: 'visitors',
      title: 'Who came',
      explain:
        'Visitors are people; pages viewed are the pages they opened. "How people found the website" sorts visits by where they came from: a Google search, typing the address, a link on another site, social media or an email.',
      tiles: [
        { measure: 'visitors', label: 'Visitors' },
        { measure: 'newVisitors', label: 'First-time visitors' },
        { measure: 'pageViews', label: 'Pages viewed' },
      ],
      charts: [
        { measure: 'pageViews', title: 'Pages viewed by month', type: 'line' },
        { measure: 'places', title: 'Where visitors were' },
      ],
      more: [
        { measure: 'newVisitors', title: 'First-time visitors by month' },
        { measure: 'countries', title: 'Countries' },
      ],
    },
    {
      id: 'contact',
      title: 'Getting in touch',
      explain:
        'What people did to reach you. A form is counted when it is sent. Clicks on an email address, a phone number or a map link are counted when pressed; the website cannot see whether the call or the visit happened.',
      tiles: [
        { measure: 'event:generate_lead', label: 'Forms sent' },
        { measure: 'event:contact_click', label: 'Email and phone clicks' },
        { measure: 'event:directions_click', label: 'Clicks for directions' },
      ],
      charts: [
        { measure: 'event:contact_click', title: 'Email and phone clicks by month' },
        { measure: 'event:directions_click', title: 'Clicks for directions by month' },
      ],
      more: [{ measure: 'event:form_view', title: 'Times a form was seen, by month' }],
    },
    {
      id: 'google',
      title: 'Found on Google',
      explain:
        'From Google Search Console. A click is someone choosing the website in a search; an appearance is the website being listed, chosen or not. Google keeps about sixteen months, so older periods are not compared.',
      tiles: [
        { measure: 'searchClicks', label: 'Clicks from Google' },
        { measure: 'searchAppearances', label: 'Times you appeared', up: 'flat' },
      ],
      charts: [
        { measure: 'searchQueries', title: 'Searches that found you' },
        { measure: 'searchPages', title: 'Pages Google sent people to' },
      ],
      more: [{ measure: 'searchClicks', title: 'Clicks from Google by month' }],
    },
  ],
};
