// Co-located query functions for the events module.
// Copy this file to src/lib/ when enabling the module (Step 4).
// The @/ alias resolves once the file is in src/lib/.

import { sanityFetch } from '@/lib/sanity';
import { IMAGE_PROJECTION } from '@/lib/queries';

// ---- Events module -----------------------------------------------------------

export async function getEventsPage() {
  return sanityFetch(`*[_type == "eventsPage"][0]{
    seoTitle, seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent
  }`, {}, null);
}

// Returns upcoming events (startDate >= now) sorted ascending by startDate,
// then by displayOrder for events with the same startDate.
export async function getUpcomingEvents() {
  const now = new Date().toISOString();
  return sanityFetch(
    `*[_type == "event" && startDate >= $now] | order(startDate asc, displayOrder asc){
      _id, title, startDate, endDate, location, description,
      image${IMAGE_PROJECTION},
      registrationUrl
    }`,
    { now },
    []
  );
}

// Returns past events (startDate < now) sorted descending by startDate
// (most recent first).
export async function getPastEvents() {
  const now = new Date().toISOString();
  return sanityFetch(
    `*[_type == "event" && startDate < $now] | order(startDate desc){
      _id, title, startDate, endDate, location, description,
      image${IMAGE_PROJECTION},
      registrationUrl
    }`,
    { now },
    []
  );
}
