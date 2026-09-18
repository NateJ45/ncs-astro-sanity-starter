# Module Library

Two opt-in modules are staged in `modules/`, both OFF by default. Enable one by
following the steps in its enable doc.

For the shared folder-shape contract and the verify loop, see
`modules/README.md`.

**The other eleven modules moved to `archive/modules/` on 2026-09-18**, with
their guides alongside them. Across the whole site family, exactly one repo had
ever enabled a module: presacademy uses `events` and `resources`. The eleven
that were never turned on anywhere are kept, not deleted, and
`archive/README.md` says how to bring one back and what to expect when you do.

---

## Module index

| Module | Description | Route(s) | Enable doc |
| --- | --- | --- | --- |
| [events](#events) | Upcoming and past events listing with registration links | `/events` | [docs/modules/events.md](events.md) |
| [resources](#resources) | Curated resource or link library for clients | `/resources` | [docs/modules/resources.md](resources.md) |

`docs/modules/process.md` is also still here, and it is not a module: `/process`
graduated into the core starter and the file is kept as the reference for that
page. It is a scaffold capability now, so `npm run scaffold --remove process`
takes the whole page out of a fork that does not want it.

---

## Module details

### events

Adds an events listing page. Upcoming events (startDate >= now) are shown
sorted by start date ascending; past events collapse under a `<details>` element.
Each card shows title, date/time, location, description, and an optional
external registration link. A coming-soon state renders when no event documents
exist. Introduces two schemas (`eventsPage` singleton, `event` collection).

Route: `/events`

---

### resources

Adds a curated resource or link library for clients. Content is managed via the
`resourcesPage` singleton (individual resource links are inline fields, not a
separate collection schema). Has no interactive components beyond core layout.

Route: `/resources`

---

## Adding a module of your own

The folder shape is in `modules/README.md` and `_TEMPLATE.md` is the starting
point for the guide. One thing the contract did not used to say, and now does:
**give the module its own scaffold markers in the same commit that adds it.**
A capability that arrives without them is one the next fork has to remove by
hand, in about twenty-five files, of which a dozen are registries that all have
to agree. `scripts/scaffold.mjs` documents the four kinds of marker.
