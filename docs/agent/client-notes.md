# Client notes: the pre-launch review layer

PORTS.md card 195, ported from First Baptist Auburn's "For Jacob" notes and shot list.

Before launch the client has to give you things: wording, facts, photos. This layer puts the list in front of
them, on the site itself, page by page, and marks every unfinished spot so nothing placeholder can pass for real.
It has three parts and one switch.

| Part       | What the client sees                                                                                                                        | Where                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notes pill | A small yellow "For <name>" pill, bottom right, that opens what is needed for the page being viewed                                         | `src/components/ClientNotes.astro`, notes in `src/data/client-notes.ts`                                                                                              |
| Highlight  | Any `[Client: ...]`, `[Placeholder: ...]` or `[Photo: ...]` text in the page, wherever it came from (Studio copy or a component), in yellow | the script in `ClientNotes.astro`, words in `MARKERS`; all three parts are styled by `src/styles/client-notes.css`, written into the page only while the layer is on |
| Shot list  | A "Photo needed" box in a picture slot that is empty or holds a stand-in, naming the shot to take                                           | `src/components/ShotRequest.astro`, shots in `src/data/shot-list.ts`                                                                                                 |

## Turning it on

In `src/data/client-notes.ts`: set `CLIENT_NOTES_ON = true`, set `CLIENT_NAME` ("Pat" gives "For Pat"), write the
`NOTES` for each page path (one thing the client can act on per note), and add the shots in `src/data/shot-list.ts`.
Write placeholder wording in the content as `[Client: the thing only they can write]` or `[Placeholder: a draft to
react to]`. Add the client's own name to `MARKERS` if they would rather see `[Pat: ...]`.

A slot is a "stand-in" when its picture is an Unsplash photo or a file uploaded with a `stand-in-` name
(`STAND_IN_FILE`; a site can widen it). The client's own upload ends the request at once. The starter wires the
Image and text block and the journal card cover; wire another picture slot the same way (`shotFor(path, heading,
index, image)`, then `<ShotRequest shot={shot} />`). A shot can carry a stock `example` photo (see the header of
`shot-list.ts`); the starter ships none.

## It cannot reach production by accident

1. The switch ships `false`.
2. Even when it is `true`, `CLIENT_NOTES_ACTIVE` also needs `site.url` to be a pre-launch address (`localhost`,
   `*.workers.dev`, `*.pages.dev`, `*.test`, `example.com`; `src/lib/client-notes.ts`). When `src/data/site.ts` moves
   to the real domain the layer goes quiet by itself, with no markup and no script.
3. `src/lib/client-notes.test.ts` then fails ("this site: the switch is not on at a live address") until
   `CLIENT_NOTES_ON` is set back to `false`. `deploy.yml` and CI run the unit tests first, so a production deploy
   cannot go out with the switch left on.

At launch: set `CLIENT_NOTES_ON = false` and search the content for leftover `[Client:` and `[Placeholder:` text,
because turning the highlight off does not remove the words. Step 11 of `docs/bootstrap/NEW-PROJECT.md` has the check.

## Search, print, accessibility

- The pill and the shot boxes carry `data-pagefind-ignore="all"`; the highlight is added in the browser, after the
  search index is built, so none of it is indexed.
- The pill is hidden when printing and the highlight drops to plain text (the brackets still show on paper).
- The pill is a native `<details>`, so it opens without JavaScript, is keyboard reachable and has a 44px target. It
  hides itself while the phone menu or the search dialog is open. The highlighter skips islands that have not
  hydrated yet (changing their text first makes React throw error 418).

## Rules

- This is internal scaffolding. Do not put prices, contract talk or opinions about the client in a note: the client
  reads every word.
- No em-dashes in note text or shot text (`shot-list.test.ts` checks the shots).
- Do not add a second switch. One flag, one guard.
