// Site-wide singleton. Header, footer, contact info, service areas, travel fees.
// One instance only; singleton enforcement happens in sanity.config.ts.

import { defineType, defineField, defineArrayMember } from 'sanity';
import { LinkIcon, ChevronDownIcon, ListIcon } from '@sanity/icons';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  // Configuration, not prose — don't surface in Canvas's AI-assisted writing UI.
  options: { canvasApp: { exclude: true } },
  groups: [
    { name: 'identity', title: 'Identity & contact' },
    { name: 'navigation', title: 'Navigation (menus)' },
    { name: 'visibility', title: 'Section visibility' },
    { name: 'social', title: 'Social & footer' },
    { name: 'newsletter', title: 'Newsletter' },
    { name: 'reviews', title: 'Reviews' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Site title',
      type: 'string',
      description: 'Used in the browser tab and search results.',
      initialValue: 'Studio Name',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'Short tagline shown under the logo in the footer.',
      validation: (Rule) => Rule.required().max(140),
    }),
    defineField({
      name: 'email',
      title: 'Public email',
      type: 'string',
      description: 'Public email address shown on the Contact page.',
      validation: (Rule) =>
        Rule.required().regex(/.+@.+\..+/, { name: 'email', invert: false }),
    }),
    defineField({
      name: 'phone',
      title: 'Phone (optional)',
      type: 'string',
      description: 'Public phone number, if you want one shown. Leave blank to hide.',
    }),
    // ── Navigation ────────────────────────────────────────────────────────────
    // Optional editor-managed nav menus. When empty the header and footer render
    // their built-in defaults (see Header.astro and Footer.astro). As soon as
    // you add items here they REPLACE the corresponding built-in menu, so include
    // every link you want to appear.
    //
    // ADDITIVE and fallback-first: the code paths that read these fields always
    // check for non-empty before consuming them. A fresh clone or a site that
    // has never touched these fields behaves byte-identically to before.
    defineField({
      name: 'navItems',
      title: 'Top menu links (optional)',
      type: 'array',
      group: 'navigation',
      description:
        'The links in the website header. Drag to reorder. Add a "Link" for a single page, or a "Dropdown" to group several links under one label. Leave empty to use the built-in default menu. Once you add items here, they replace the whole menu, so include every link you want.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'navLink',
          title: 'Link',
          icon: LinkIcon,
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'What visitors see, e.g. "Services".',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'href',
              title: 'Address',
              type: 'string',
              description: 'A page on this site like /services, or a full URL like https://example.com.',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'href' } },
        }),
        defineArrayMember({
          type: 'object',
          name: 'navGroup',
          title: 'Dropdown',
          icon: ChevronDownIcon,
          fields: [
            defineField({
              name: 'label',
              title: 'Menu label',
              type: 'string',
              description: 'The dropdown heading, e.g. "About".',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'links',
              title: 'Menu links',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'navSubLink',
                  title: 'Link',
                  icon: LinkIcon,
                  fields: [
                    defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
                    defineField({
                      name: 'href',
                      title: 'Address',
                      type: 'string',
                      description: 'A page on this site like /process, or a full URL.',
                      validation: (Rule) => Rule.required(),
                    }),
                  ],
                  preview: { select: { title: 'label', subtitle: 'href' } },
                }),
              ],
              validation: (Rule) => Rule.required().min(1),
            }),
          ],
          preview: {
            select: { title: 'label', links: 'links' },
            prepare: ({ title, links }) => ({
              title: title ?? '(no label)',
              subtitle: `Dropdown: ${Array.isArray(links) ? links.length : 0} link(s)`,
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'footerColumns',
      title: 'Footer link columns (optional)',
      type: 'array',
      group: 'navigation',
      description:
        'The titled link columns in the footer. Leave empty to use the built-in default columns. The "Get in touch" column (email, phone, socials) always shows automatically. Aim for three or four columns so the footer grid stays balanced.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'footerColumn',
          title: 'Column',
          icon: ListIcon,
          fields: [
            defineField({
              name: 'title',
              title: 'Column heading',
              type: 'string',
              description: 'The small heading above the links, e.g. "Services".',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'links',
              title: 'Links',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'footerLink',
                  title: 'Link',
                  icon: LinkIcon,
                  fields: [
                    defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
                    defineField({
                      name: 'href',
                      title: 'Address',
                      type: 'string',
                      description: 'A page on this site like /contact, or a full URL.',
                      validation: (Rule) => Rule.required(),
                    }),
                  ],
                  preview: { select: { title: 'label', subtitle: 'href' } },
                }),
              ],
              validation: (Rule) => Rule.required().min(1),
            }),
          ],
          preview: {
            select: { title: 'title', links: 'links' },
            prepare: ({ title, links }) => ({
              title: title ?? '(no heading)',
              subtitle: `Column: ${Array.isArray(links) ? links.length : 0} link(s)`,
            }),
          },
        }),
      ],
    }),

    defineField({
      name: 'availabilityStatus',
      title: 'Availability status',
      type: 'string',
      description:
        'Short status next to the green dot on the Contact page. Examples: "Accepting new clients" / "Booking for Fall 2026" / "Currently booked, accepting waitlist".',
      validation: (Rule) => Rule.required().max(80),
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: 'serviceAreas',
      title: 'Service areas',
      type: 'array',
      description: 'Cities and neighborhoods you serve, in display order. Put your primary market first.',
      of: [defineArrayMember({ type: 'string' })],
      validation: (Rule) => Rule.required().min(1),
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: 'travelFees',
      title: 'Travel fee tiers',
      type: 'array',
      description: 'Drive-time tiers and the travel fee for each. Always quoted upfront.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'travelFeeTier',
          fields: [
            defineField({
              name: 'distanceLabel',
              title: 'Distance label',
              type: 'string',
              description: 'Like "45 to 75 minutes".',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'fee',
              title: 'Fee',
              type: 'string',
              description: 'Like "$50" or "None".',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { title: 'distanceLabel', subtitle: 'fee' },
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(1),
      hidden: true,
      readOnly: true,
    }),
    // LEGACY — superseded by socialLinks array below.
    // Kept hidden + readOnly so existing data continues to validate.
    // Do not delete; use socialLinks for new and updated entries.
    defineField({
      name: 'socialInstagram',
      title: 'Instagram URL (legacy)',
      type: 'url',
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: 'socialFacebook',
      title: 'Facebook URL (legacy)',
      type: 'url',
      hidden: true,
      readOnly: true,
    }),

    // New flexible social links array. Supports any platform.
    // When this array has entries the Footer renders from it instead of the
    // legacy socialInstagram / socialFacebook fields above.
    defineField({
      name: 'socialLinks',
      title: 'Social links',
      type: 'array',
      group: 'social',
      description:
        'Add one entry per platform. The footer renders these in order. Leave empty to fall back to the legacy Instagram/Facebook fields (for existing sites).',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'socialLink',
          fields: [
            defineField({
              name: 'platform',
              title: 'Platform',
              type: 'string',
              description: 'The social network or directory.',
              options: {
                list: [
                  { title: 'Instagram', value: 'Instagram' },
                  { title: 'Facebook', value: 'Facebook' },
                  { title: 'LinkedIn', value: 'LinkedIn' },
                  { title: 'Pinterest', value: 'Pinterest' },
                  { title: 'YouTube', value: 'YouTube' },
                  { title: 'TikTok', value: 'TikTok' },
                  { title: 'X (Twitter)', value: 'X' },
                  { title: 'Houzz', value: 'Houzz' },
                  { title: 'Other', value: 'Other' },
                ],
                layout: 'dropdown',
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'url',
              title: 'URL',
              type: 'url',
              description: 'Full URL including https://.',
              validation: (Rule) => Rule.required().uri({ scheme: ['http', 'https'] }),
            }),
            defineField({
              name: 'label',
              title: 'Label (optional)',
              type: 'string',
              description: 'Custom label for "Other" platforms. Used as the aria-label on the icon button.',
            }),
          ],
          preview: {
            select: { platform: 'platform', url: 'url', label: 'label' },
            prepare: ({ platform, url, label }) => ({
              title: label ? `${platform}: ${label}` : (platform ?? 'Social link'),
              subtitle: url ?? '',
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'businessType',
      title: 'Business type',
      type: 'string',
      description:
        'The schema.org business category search engines use to understand what your business does. Pick the closest match. This feeds the structured data (JSON-LD) on every page, which helps Google show your listing correctly in Maps, search cards, and rich results.',
      options: {
        list: [
          { title: 'Local Business (generic)',          value: 'LocalBusiness' },
          { title: 'Professional Service',              value: 'ProfessionalService' },
          { title: 'Home and Construction Business',    value: 'HomeAndConstructionBusiness' },
          { title: 'Legal Service',                     value: 'LegalService' },
          { title: 'Medical Business',                  value: 'MedicalBusiness' },
          { title: 'Health and Beauty Business',        value: 'HealthAndBeautyBusiness' },
          { title: 'Food Establishment',                value: 'FoodEstablishment' },
          { title: 'Store',                             value: 'Store' },
          { title: 'Real Estate Agent',                 value: 'RealEstateAgent' },
          { title: 'Travel Agency',                     value: 'TravelAgency' },
          { title: 'Educational Organization',          value: 'EducationalOrganization' },
          { title: 'NGO',                               value: 'NGO' },
        ],
        layout: 'dropdown',
      },
      initialValue: 'LocalBusiness',
    }),
    defineField({
      name: 'seoImage',
      title: 'Default social share image',
      type: 'image',
      description: 'The image shown when any page of the site is shared on social media or in a text message (the Open Graph image). Use a wide image, about 1200 by 630 pixels. Individual pages can override this in their own SEO section. Leave blank to use the auto-generated branded cards.',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string' }),
      ],
    }),
    defineField({
      name: 'footerCredit',
      title: 'Footer credit',
      type: 'string',
      description: 'Optional credit line in the footer (e.g., "Site by Nixon Creative Studio").',
    }),
    defineField({
      name: 'footerCreditUrl',
      title: 'Footer credit URL',
      type: 'url',
      description: 'Optional. When set, the footer credit becomes a link to this URL (opens in a new tab).',
    }),

    // ── Newsletter ──────────────────────────────────────────────────────────
    defineField({
      name: 'newsletter',
      title: 'Newsletter signup',
      type: 'object',
      description:
        'Connect an email provider (MailerLite, Buttondown, Mailchimp). Paste the embedded-form action URL and list ID; the secret key goes in env as NEWSLETTER_API_KEY.',
      fields: [
        defineField({
          name: 'enabled',
          title: 'Enable newsletter signup',
          type: 'boolean',
          description: 'When off, the newsletter block does not render anywhere on the site.',
          initialValue: false,
        }),
        defineField({
          name: 'providerLabel',
          title: 'Provider label',
          type: 'string',
          description: 'Internal label only. Example: "MailerLite" or "Buttondown". Not shown to visitors.',
        }),
        defineField({
          name: 'formActionUrl',
          title: 'Form action URL',
          type: 'url',
          description: "The embedded-form POST endpoint from your email provider's dashboard.",
        }),
        defineField({
          name: 'audienceId',
          title: 'Audience / list ID',
          type: 'string',
          description: 'Your provider list or audience ID. Used when the provider needs it in the POST body.',
        }),
        defineField({
          name: 'heading',
          title: 'Heading',
          type: 'string',
          description: 'Headline above the signup form. Example: "Get the free design checklist."',
        }),
        defineField({
          name: 'blurb',
          title: 'Blurb',
          type: 'text',
          rows: 3,
          description: 'One or two sentences under the heading explaining what subscribers get.',
        }),
        defineField({
          name: 'buttonLabel',
          title: 'Button label',
          type: 'string',
          description: 'Text on the subscribe button.',
          initialValue: 'Subscribe',
        }),
        defineField({
          name: 'successMessage',
          title: 'Success message',
          type: 'text',
          rows: 2,
          description: 'Message shown after a successful signup. Example: "You\'re in. Check your inbox."',
        }),
        defineField({
          name: 'consentNote',
          title: 'Consent note',
          type: 'text',
          rows: 2,
          description: 'Small-print consent line near the submit button. Link to /privacy included automatically.',
        }),
      ],
    }),

    // ── Reviews ──────────────────────────────────────────────────────────────
    defineField({
      name: 'googleBusinessUrl',
      title: 'Google Business Profile URL',
      type: 'url',
      description:
        'Link to the studio\'s Google Business listing. When set, a "Read more on Google" link appears in the testimonials section.',
    }),
    defineField({
      name: 'reviewsNote',
      title: 'Reviews note',
      type: 'string',
      description:
        'Optional small-print line near the reviews section. Example: "Reviews from Google, Facebook, and Houzz."',
    }),

    // ── Section visibility ────────────────────────────────────────────────────
    // Controls which optional sections appear on the live site.
    // IMPORTANT: an unset field (undefined/null) counts as VISIBLE — only an
    // explicit `false` hides a section. This means the existing live site is
    // completely unaffected until an editor intentionally turns something off.
    defineField({
      name: 'sectionVisibility',
      title: 'Section visibility',
      type: 'object',
      group: 'visibility',
      description: 'Turn optional sections on or off. An unset toggle counts as ON.',
      fields: [
        defineField({
          name: 'showPortfolio',
          title: 'Portfolio',
          type: 'boolean',
          initialValue: true,
          description:
            'When off, this section disappears from the menu, footer, homepage, and its own page (which redirects home). Your drafts stay safe. Turn it back on when ready.',
        }),
        defineField({
          name: 'showJournal',
          title: 'Journal',
          type: 'boolean',
          initialValue: true,
          description:
            'When off, this section disappears from the menu, footer, homepage, and its own page (which redirects home). Your drafts stay safe. Turn it back on when ready.',
        }),
        defineField({
          name: 'showShop',
          title: 'Shop',
          type: 'boolean',
          initialValue: true,
          description:
            'When off, this section disappears from the menu, footer, homepage, and its own page (which redirects home). Your drafts stay safe. Turn it back on when ready.',
        }),
        defineField({
          name: 'showEDesign',
          title: 'E-Design',
          type: 'boolean',
          initialValue: true,
          description:
            'When off, this section disappears from the menu, footer, homepage, and its own page (which redirects home). Your drafts stay safe. Turn it back on when ready.',
        }),
        defineField({
          name: 'showGiftCertificates',
          title: 'Gift Certificates',
          type: 'boolean',
          initialValue: true,
          description:
            'When off, this section disappears from the menu, footer, homepage, and its own page (which redirects home). Your drafts stay safe. Turn it back on when ready.',
        }),
        defineField({
          name: 'showPress',
          title: 'Press',
          type: 'boolean',
          initialValue: true,
          description:
            'When off, this section disappears from the menu, footer, homepage, and its own page (which redirects home). Your drafts stay safe. Turn it back on when ready.',
        }),
        defineField({
          name: 'showResources',
          title: 'Resources hub',
          type: 'boolean',
          initialValue: true,
          description:
            'When off, this section disappears from the menu, footer, homepage, and its own page (which redirects home). Your drafts stay safe. Turn it back on when ready.',
        }),
        defineField({
          name: 'showGuides',
          title: 'Guides',
          type: 'boolean',
          initialValue: true,
          description:
            'When off, this section disappears from the menu, footer, homepage, and its own page (which redirects home). Your drafts stay safe. Turn it back on when ready.',
        }),
        defineField({
          name: 'showStyleQuiz',
          title: 'Style Quiz',
          type: 'boolean',
          initialValue: true,
          description:
            'When off, this section disappears from the menu, footer, homepage, and its own page (which redirects home). Your drafts stay safe. Turn it back on when ready.',
        }),
        defineField({
          name: 'showBudgetCalculator',
          title: 'Budget Calculator',
          type: 'boolean',
          initialValue: true,
          description:
            'When off, this section disappears from the menu, footer, homepage, and its own page (which redirects home). Your drafts stay safe. Turn it back on when ready.',
        }),
      ],
    }),

    // ── Satisfaction guarantee ────────────────────────────────────────────────
    defineField({
      name: 'satisfactionGuarantee',
      title: 'Satisfaction guarantee line',
      type: 'text',
      rows: 2,
      description:
        'In-scope satisfaction guarantee shown near CTAs on the Services and Contact pages. Leave blank to hide.',
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Site Settings' }),
  },
});
