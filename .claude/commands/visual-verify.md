---
description: Screenshot-verify UI changes in both themes and both viewports
argument-hint: "[route, e.g. / or /about]"
---

Run the visual verification loop from CLAUDE.md against $ARGUMENTS (default:
every page touched by the current change). No UI change ships without this.

1. Make sure the dev server is running (`npm run dev`, http://localhost:4321).

2. Using the Playwright MCP, for each route capture FOUR states:
   desktop 1280px + mobile 375px, each in light AND dark. Switch themes by
   setting `localStorage['studio-starter-theme'] = 'light' | 'dark'` then
   reloading (update the key prefix if the project has been rebranded via
   src/data/site.ts -> themeStorageKey).

3. Reveal gotcha (will bite you): `[data-reveal]` elements start at opacity 0
   until the IntersectionObserver fires, so a fullPage screenshot taken
   straight after load shows large blank regions. Before every screenshot,
   force-reveal all of them:
   ```js
   document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-visible'))
   ```
   If a screenshot shows big empty bands, suspect this before suspecting the
   layout.

4. Actually LOOK at every screenshot (Read the PNG). Check: the changed
   element in all four states, the sections immediately above and below it,
   text contrast on both themes, and nothing overflowing at 375px.

5. If anything is off: fix, re-screenshot, repeat. Then report with the
   screenshots attached/referenced. For accessibility-affecting changes, also
   run Lighthouse per OPERATIONS.md ("Run Lighthouse / performance audits");
   the targets are 100/100/100/100 and they are defended.
