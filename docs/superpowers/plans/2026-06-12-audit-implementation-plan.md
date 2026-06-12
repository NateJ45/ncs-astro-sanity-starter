# Audit implementation plan (2026-06-12)

Implements the approved scope from the 2026-06-12 starter audit. Source findings:
`docs/superpowers/specs/2026-06-12-starter-audit-findings.md` (+ reskin addendum).
Branch: `feat/audit-hardening-and-ui-stack`. Approved scope: ALL four work areas;
UI strategy: vendored token-native stack + wire PrimeReact unstyled now; free sources only.

Execution: Sonnet subagent per unit, orchestrator reviews diffs and runs gates between units.
Agents do not run git commands or builds; the orchestrator stages, gates, commits per unit.

Gates per unit batch: `npm run typegen` (commit regenerated src/lib/sanity.types.ts; never
`git add studio/schema.json` - gitignored), `npm run build`, `npm test`,
`npm --prefix studio run build`. Phase 2 additionally re-proves apply-brand no-op + idempotency.
Genericization grep before merge: Reid|Staci|Plainfield|Indianapolis|Fishers|sage|Pinyon
(provenance lines in CLAUDE.md/README excluded).

## Units

U1a - Core SEO/a11y/perf bug fixes (src + siteSettings schema)
  businessType field on siteSettings + LocalBusiness default in src/lib/schemas.ts; omit
  geo/address placeholders; robots.txt -> src/pages/robots.txt.ts endpoint; ServiceAreaMap wired
  to siteSettings geo; journal OG COLLECTIONS activated; og:type article + article meta; journal
  RSS feed + link alternate; lang from site.ts; getSiteSettings memoized + journal double-fetch
  removed; ctaBlock internal link targets (page, processPage); focus rings on
  FeaturedWork/FeaturedJournal; aria-label fallbacks on GalleryGrid/VideoEmbed; fullscreen in
  VideoEmbed allow.

U1b - Type safety + static rendering
  SectionRenderer discriminated union from sanity.types.ts (kill the 24 `as any`); thin Astro
  server-side Portable Text renderer for privacy.astro + contact.astro fallback copy.

U2 - Module bug fixes
  Align budget-calculator, e-design, style-quiz queries AND their page components to schema field
  names (schema is truth); sweep remaining modules for the same class of mismatch; remove
  modules/process/ (graduated to core) and replace docs/modules/process.md with a redirect note.

U3 - Docs truth pass
  Fix build/typegen claims (CLAUDE.md, NEW-PROJECT.md, stack-and-config.md); module count -> 10
  consistently; 'guides' -> 'lead-magnets'; OPERATIONS.md process note; NEW-PROJECT.md Step 0
  prerequisites (Cloudflare account, GitHub repo, wrangler) + Cloudflare deploy-hook sub-step;
  CLAUDE.md seed description.

U4 - apply-brand hardening
  Function-form replace; {2,} -> {1,} font import quantifier; print footer substitution;
  --font-script always rewritten (default when null); tagline quote escaping; site.ts derived
  fields computed from name; brand.config.schema.json + --check dry-run mode; radius knob;
  rewrite wrangler.jsonc name + astro.config.mjs site. Preserve: neutral defaults stay a no-op,
  idempotency, CRLF preservation, Windows spawnSync shell:true.

U5 - DX/CI
  .github/workflows/ci.yml (npm ci, studio install, typegen, build, studio build, test, on push
  to main + PRs, Node 22); `npm run check` script; minimal ESLint (flat config, astro + ts) +
  Prettier config WITHOUT a global reformat; tests for sectionVisibility, splitScriptAccent,
  slugify, readingTime/telHref; .vscode extensions (sanity, tailwind, prettier); shared
  scripts/lib/loadEnv.mjs fixing the inline-comment parse bug (3 scripts).

U6 - UI library wiring
  components.json style radix-nova -> radix-vega (verify name against current CLI; fall back to
  the correct marketing-density style id); registries entries as needed; Starwind UI init + a
  small representative component set + extend :root/.dark with Starwind semantic tokens
  (--info/--success/--warning/--error/--primary-accent/--secondary-accent) AND teach
  brand.config.json + apply-brand about them (keep no-op guarantee); verify @fulldev install path
  works (throwaway, document, tear down); audit 4 vendored Magic UI components for hardcoded
  colors -> semantic tokens; wire PrimeReact unstyled mode (install, PrimeReactProvider island
  wrapper pattern, Tailwind passthrough baseline referencing semantic tokens, no page usage by
  default); write docs/agent/component-sources.md (sources, token-remap cheat sheet, copy-in
  checklist, bundle flags, PrimeReact escape hatch, paid options noted-not-purchased); CLAUDE.md
  pointer.

U7 - New page-builder blocks
  faqSection (wraps existing FaqAccordion; refs to faq docs OR inline pairs), logoStripSection,
  teamSection, embedSection (sandboxed iframe, URL->embed transform, trusted-sources hint).
  Schemas + SECTION_TYPES/RICH_SECTION_TYPES + per-page lists + sectionCadence classification
  (SELF_CONTAINED) + cadence tests + SectionRenderer mapping + components + seed examples.

U8 - Schema flexibility
  businessInfo: optional city/state/travelFees + businessModel radio (in-person/remote/hybrid)
  with conditional hidden + additionalLocations array; socialLinks array on siteSettings (legacy
  Instagram/Facebook fields hidden readOnly per house rule) + footer icon mapping; faqCategory
  document + faqItem reference (legacy category string hidden readOnly); service.ctaLabel
  initialValue '' with placeholder examples in description.

U9 - New modules + genericization
  modules/team, modules/events, modules/donations (each: schema, pages, co-located queries,
  seed, enable doc, coming-soon guard); rename e-design -> virtual-services (schema type
  eDesignPage -> virtualServicesPage); genericize portfolio taxonomy labels/values +
  style-quiz/budget-calculator seeds and hardcoded copy.

U10 - Final docs sync + merge
  Counts (10 -> 12 after adding 3 and the rename), non-profit preset (donations + events +
  newsletter + portfolio), changelog entry, full gates, genericization grep, merge to master.

## House rules for all agents (repeat in every prompt)
No git commands; no builds (orchestrator gates centrally). No em-dashes in editor-facing or
public-facing copy. Respect file headers (Foundation vs Safe to edit). sanityFetch wrapper only,
never raw client.fetch. Hide-don't-delete for legacy Sanity fields. Reserved-slug triple
duplication is intentional. studio/schema.json is gitignored. Astro 6.3.8 pinned, Sanity v5,
Tailwind 4 @theme (no tailwind.config).
