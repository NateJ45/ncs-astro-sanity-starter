// Safe to edit by hand
// =============================================================================
// Does the Studio offer the website's OWN newsletter? (PORTS.md cards 163, 187)
// =============================================================================
// Card 127 gave every site an email list the website keeps, issues written in
// the Studio and a send button. A site whose list lives somewhere else (Mailchimp,
// Kit, a church or club system) does not want a single screen about it. Card 163
// hid Home's Newsletter card. This switch hides the REST, in one place:
//
//   - Home's Newsletter card ........ kit.config.ts  features.newsletter
//   - the Quick update jobs ......... kit.config.ts  quickUpdate (OWN_NEWSLETTER_JOBS)
//   - Content > Newsletter .......... structure.ts   (left out of the desk)
//   - the "+" menu .................. sanity.config.ts newDocumentOptions
//   - the Site Guide page ........... guides/content.ts (OWN_NEWSLETTER_GUIDE)
//   - the guided tour ............... studio-tours.ts (OWN_NEWSLETTER_TOUR, if a site has one)
//
// The schema type stays registered, so nothing stored is lost and flipping the
// switch back brings every screen back. TRUE keeps today's behavior.
//
// To turn it off for a site: set OWN_NEWSLETTER to false, point the site's
// sign-up block at the outside list, and drop the newsletter lines from the
// site's own weekly guide. To bring it back: set it to true and switch on the
// list (Site settings > Newsletter and the Worker's mail settings, OPERATIONS.md
// "Email").
// =============================================================================
export const OWN_NEWSLETTER = true;

/** The Quick update entries (kit.config.ts `quickUpdate` ids) that belong to the website's own newsletter. */
export const OWN_NEWSLETTER_JOBS = new Set(['newsletter', 'send-newsletter']);

/** The Site Guide page and the tour about it. */
export const OWN_NEWSLETTER_GUIDE = 'send-the-newsletter';
export const OWN_NEWSLETTER_TOUR = 'newsletter-editor';
