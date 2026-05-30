# Image Extraction Checklist

**Purpose:** Track every image that needs to come from the live Squarespace site to the new site, where it goes in Sanity, and its current status.

**How to use this list:** Open each URL in a browser and save the image to your computer. During Stage 2 of the migration plan, upload each one to Sanity in the matching field on the matching document.

---

## Logos

| Asset | Current Squarespace URL | Target Sanity location | Status | Notes |
|---|---|---|---|---|
| Reid Design wordmark logo (header) | https://images.squarespace-cdn.com/content/v1/69c5a727efd4722ac559fc8f/55153612-6469-4a6d-af95-c35274f7636a/Reid+Design+Logo+%281%29.png?format=1500w | Astro component (not Sanity) | TODO | Used in the site header. Lives in the Astro project, not in Sanity. |
| Reid Design footer logo variant | https://images.squarespace-cdn.com/content/69c5a727efd4722ac559fc8f/ce93a1fc-f227-4af1-bc7f-534ff589d288/Reid+Design+Logo.png?content-type=image%2Fpng | Astro component (not Sanity) | TODO | Slightly different variant. |
| Favicon | Pull from current site | Astro project root | TODO | Confirm icon size and quality. |

---

## Photography — Confirmed in Sanity

| Asset | Current Squarespace URL | Target Sanity location | Status | Notes |
|---|---|---|---|---|
| Homepage hero background | https://images.squarespace-cdn.com/content/v1/69c5a727efd4722ac559fc8f/b7cbbcf8-b083-4648-aed7-f2b1ced069d8/79139096576__B788136B-2746-4A0F-85B8-BAFA3B281ADC.JPEG | `homePage.heroImage` | TODO | Verify resolution adequate for full-bleed hero (target 2500px+ wide). |
| Staci portrait | https://images.squarespace-cdn.com/content/69c5a727efd4722ac559fc8f/2bbf4d4b-92e9-4a6f-b92f-cc6a5c22cfff/IMG_0683.JPG?content-type=image%2Fjpeg | `homePage.meetStaciPhoto` and `aboutPage.staciPhoto` | TODO | Verify quality. The IMG_0683.JPG filename suggests a phone snapshot. Per audit, if quality is borderline, plan a re-shoot before launch. |
| Final CTA background image (Home) | https://images.squarespace-cdn.com/content/v1/69c5a727efd4722ac559fc8f/b1dee007-43f6-4a8e-81d6-1f47b59fe113/IMG_0450.JPG | `homePage` (consider adding `finalCtaImage` field if used in design) | TODO | Optional. The current site uses this image in the final CTA section. |

---

## Photography — Needed but not yet in Sanity

These are gaps the audit identified.

| Asset | Where it goes | Status | Notes |
|---|---|---|---|
| Case study #1 photos | New `project` document | TODO | Per Nathan's call: launch with 1 to 2 case studies. Needs hero photo + 3 to 6 gallery shots. Before/after pairs optional but valuable. |
| Case study #2 photos | New `project` document | TODO | Same as above. |
| Process step photos (consultation, mood board, install) | `processStep.featuredImage` (add field if desired) | Deferred | Post-launch addition. Audit listed as not a launch blocker. |
| Updated Staci headshot | Replaces current `staciPhoto` if quality issue | Maybe needed | Verify current first. |

---

## Image processing checklist

For every image uploaded to Sanity:
- [ ] Use a descriptive alt text (Sanity image fields include an alt-text field by default)
- [ ] Set the hotspot to the focal point (face for portraits, key visual element for room photos)
- [ ] If the image is larger than 4000px on the longest side, resize down before upload to keep the Sanity media library lean
- [ ] Use JPEG for photos (quality 85%), PNG only for logos with transparency

---

## Notes on direct downloads

I (Claude) can't pull binary files from the Squarespace CDN through my current tools. The download workflow is:

1. Click each URL above in your browser, save to `content/images/` (folder will get created)
2. Upload to Sanity via the Studio when populating the matching document
3. OR write a quick shell script locally: `curl -O <url>` for each URL

If you'd rather not click-by-click, paste a list of URLs into a `download.sh` script and run it locally:

```bash
mkdir -p content/images
cd content/images
curl -O "https://images.squarespace-cdn.com/content/v1/69c5a727efd4722ac559fc8f/55153612-6469-4a6d-af95-c35274f7636a/Reid+Design+Logo+%281%29.png"
curl -O "https://images.squarespace-cdn.com/content/v1/69c5a727efd4722ac559fc8f/b7cbbcf8-b083-4648-aed7-f2b1ced069d8/79139096576__B788136B-2746-4A0F-85B8-BAFA3B281ADC.JPEG"
# ... etc
```

---

*Last updated: May 26, 2026*
