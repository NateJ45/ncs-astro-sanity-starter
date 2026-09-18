# Module: Newsletter

**What it adds:** A global email signup widget rendered in the site footer (and optionally inline on the Journal index page). There is no dedicated route -- the component is embedded wherever it is wired. The signup form submits to the configured ESP (ConvertKit, MailerLite, Buttondown, etc.) or falls back to Web3Forms when no ESP is set.
**Depends on (already in core):** `NewsletterSignup.tsx` (React island), `subscribe.ts` (shared email-capture helper in `src/lib/`), and the `siteSettings.newsletter` field group in the core `siteSettings` schema. The footer (`src/components/Footer.astro`) and Journal index (`src/pages/journal/index.astro`) already import `NewsletterSignup` and guard it with `siteSettings.newsletter.enabled`.
**Env/config:** Set `PUBLIC_WEB3FORMS_KEY` in `.env` (Web3Forms fallback) and optionally `PUBLIC_NEWSLETTER_FORM_ACTION` in `.env` if you want to read the ESP URL from the environment instead of Sanity. Then enable via the Studio toggle described below.

---

## Enable

This module is **configuration-only** -- there are no files to copy. The signup component and all supporting code already live in the core. Enabling the newsletter requires two configuration steps.

### Step 1 -- Set env vars (optional but recommended)

Add to your project's `.env` file:

```dotenv
# Web3Forms fallback -- submissions land in the email tied to this key.
# Get a free key at https://web3forms.com
PUBLIC_WEB3FORMS_KEY=your_web3forms_access_key

# Optional: if your ESP issues a stable form-action URL, you can store it
# here instead of (or in addition to) the Sanity field. The Sanity field
# takes precedence at runtime.
# PUBLIC_NEWSLETTER_FORM_ACTION=https://app.mailerlite.com/webforms/submit/XXXXXX
```

Neither variable is required to enable the feature in Studio, but the signup form will show an error to users unless at least one of `formActionUrl` (in Sanity) or `PUBLIC_WEB3FORMS_KEY` is configured.

### Step 2 -- Enable and configure in Studio

Open **Studio > Site Settings > Newsletter** and set:

| Field | Purpose |
|-------|---------|
| **Enable newsletter signup** | Toggle to `true`. The footer signup appears; setting to `false` hides it everywhere. |
| **Provider label** | Internal note only (e.g. "MailerLite"). Not shown to visitors. |
| **Form action URL** | The embedded-form POST endpoint from your ESP dashboard. Takes precedence over any env var. |
| **Audience / list ID** | Your provider's list or audience ID if required. |
| **Heading** | Headline above the form shown to visitors. |
| **Blurb** | One or two sentences explaining what subscribers get. |
| **Button label** | Submit button text (default: "Subscribe"). |
| **Success message** | Shown after a successful signup. |
| **Consent note** | Small-print privacy or consent line below the button. |

No schema registration, no `structure.ts` changes, and no file copying are needed.

---

## Desk + nav snippets

None -- this module requires no Studio desk changes and adds no nav link.

---

## Verify

After completing the enable steps:

- The email signup widget appears in the site footer (and on the Journal index page if it has content).
- Setting `siteSettings.newsletter.enabled = false` in Studio causes the widget to disappear everywhere on the site without a rebuild.
- Submitting the form with a valid email returns the success message (requires an ESP or Web3Forms key to be configured).
- `npm run build` passes cleanly with no changes to the codebase.
