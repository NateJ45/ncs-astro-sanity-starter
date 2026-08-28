// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// preview-morph — update the preview in place instead of rebuilding it
// (2026-08-28)
// =============================================================================
// THE FAILURE THIS ANSWERS, measured in the deployed Studio. The editor's words:
// the text "disappears for a second and then reappears after another second".
// What the instrumentation found around one keystroke:
//
//   - a SINGLE keystroke produced TWO `#main` swaps about two seconds apart (the
//     rate-limited follow-up in src/lib/preview-refresh.ts, which is deliberate);
//   - nothing was left faded, hidden or zero-height afterwards, at +0/+100/+400/
//     +900ms across forty sampled elements — so this was never an animation
//     replaying and never a forced motion end-state failing;
//   - `#main` holds FOURTEEN `<img>` elements and zero astro-islands;
//   - callbacks scheduled at +100/+400/+900ms all fired about a SECOND late, so
//     the main thread was blocked for roughly that long at swap time.
//
// And the cause was one line: `current.replaceWith(next)`. That throws the whole
// live `#main` subtree away and inserts a freshly parsed one, so every image
// becomes a brand-new element that has to be re-fetched, re-decoded and re-laid
// out. That is both the blank-then-fill the editor sees and the main-thread
// block the timers measured. Twice per keystroke, for a page whose words instant
// text (src/components/preview/overlay/useInstantText.ts) has ALREADY corrected.
//
// So: morph. Walk the old and new trees together, keep every node that can be
// kept, and write only the differences. A kept `<img>` keeps its identity, its
// decoded bitmap, its layout box and its place in the scroll — which is the
// entire point, and the reason the img rule below is stated as a guarantee
// rather than left to fall out of the attribute sync.
//
// WHAT THIS FILE IS NOT. It is not a general-purpose morphdom. It is the
// smallest thing that correctly reconciles server-rendered HTML for the SAME
// page against itself, and it is written against a minimal structural interface
// rather than the DOM (the same trick src/lib/preview-text-nodes.ts plays with
// `TextLike`) so the algorithm can be tested with plain objects in `node:test`,
// which has no DOM.
//
// THE BAIL-OUT IS PART OF THE CONTRACT. Every cap and every thrown error makes
// `morph` return false, and the caller then does exactly what it used to do —
// re-parse the response and `replaceWith` it. A morph bug can therefore make the
// preview slow again, but it can never leave a half-updated page on screen.
// =============================================================================

// ---------------------------------------------------------------------------
// The shape this needs from a DOM tree
// ---------------------------------------------------------------------------
// Deliberately tiny. Real `Element`/`Text` nodes satisfy these structurally, and
// so do the fakes in src/lib/preview-morph.test.ts.

/** Everything both branches of the walk share. */
export interface MorphNode {
  nodeType: number;
  nodeName: string;
}

/** A text or comment node: its characters are its whole content. */
export interface MorphCharacterData extends MorphNode {
  data: string;
}

/** An element: attributes, children, and the two mutations the morph performs. */
export interface MorphElement extends MorphNode {
  childNodes: ArrayLike<MorphNode>;
  getAttributeNames(): string[];
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  insertBefore(node: MorphNode, before: MorphNode | null): unknown;
  removeChild(node: MorphNode): unknown;
}

export const ELEMENT_NODE = 1;
export const TEXT_NODE = 3;
export const COMMENT_NODE = 8;

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/**
 * Attributes that identify a child across renders, most specific first.
 *
 * `data-sanity` is the one that actually carries this page: every section
 * wrapper gets one (src/lib/preview-edit-attr.ts) built from the document id and
 * the array item's `_key`, so it survives a reorder and is unique among its
 * siblings. `id` covers the hand-written landmarks. `data-stype` and `data-key`
 * are not emitted today; they are listed because they are the names this
 * codebase would reach for next, and an unused key attribute costs one failed
 * `getAttribute` per element.
 */
export const KEY_ATTRIBUTES = ['id', 'data-sanity', 'data-stype', 'data-key'] as const;

/**
 * The identity of a child, or undefined when it has none and must be matched by
 * position.
 *
 * The attribute NAME is part of the key so that `id="a"` and `data-key="a"`
 * cannot be mistaken for each other.
 */
export function nodeKey(node: MorphNode): string | undefined {
  if (node.nodeType !== ELEMENT_NODE) return undefined;
  const element = node as MorphElement;
  for (const name of KEY_ATTRIBUTES) {
    const value = element.getAttribute(name);
    if (value !== null && value !== '') return `${name}=${value}`;
  }
  return undefined;
}

/** Whether an old node may be reused for a new one at all. */
export function sameKind(a: MorphNode, b: MorphNode): boolean {
  return a.nodeType === b.nodeType && a.nodeName === b.nodeName;
}

// ---------------------------------------------------------------------------
// The image rule
// ---------------------------------------------------------------------------

/**
 * The attributes whose value sends a browser off to fetch and decode a bitmap.
 *
 * `sizes` is in the list because it selects which candidate of a `srcset` is
 * used, so writing it can change the resource even when `srcset` itself has not.
 */
export const IMAGE_SOURCE_ATTRIBUTES = ['src', 'srcset', 'sizes'] as const;

/**
 * True when both sides are the same `<img>` pointing at the same bitmap.
 *
 * The attribute sync below already refuses to write a value that has not
 * changed, so on its own this predicate would be redundant. It is here as a
 * GUARANTEE rather than a coincidence: reusing an image element is the single
 * biggest reason this file exists, and a future tightening of `syncAttributes`
 * must not be able to reintroduce a `src` write by accident. The morph therefore
 * excludes these three names explicitly whenever this returns true, and there is
 * a test that asserts nothing was written to them.
 */
export function imageSourceUnchanged(from: MorphElement, to: MorphElement): boolean {
  if (from.nodeName !== 'IMG' || to.nodeName !== 'IMG') return false;
  return IMAGE_SOURCE_ATTRIBUTES.every((name) => from.getAttribute(name) === to.getAttribute(name));
}

// ---------------------------------------------------------------------------
// The fast path
// ---------------------------------------------------------------------------

/**
 * Is this render worth applying at all?
 *
 * Two ways a fetched `#main` can be known-redundant, and both are ordinary
 * string equality on markup the SAME serializer produced, so attribute quoting,
 * tag casing and void-element spelling are already normalised. Nothing further
 * is normalised on purpose: collapsing whitespace or sorting attributes would
 * buy a few more skips and risk declaring two genuinely different pages equal,
 * and the cost of a MISS is now only a cheap morph.
 *
 *  1. `fetched === live`. The page already reads exactly as the server says it
 *     should. Morphing would touch nothing; there is nothing to do.
 *  2. `fetched === lastAccepted`. The server has rendered the same bytes it
 *     rendered last time, so it has not caught up with whatever instant text has
 *     since written. Applying it would revert those words for the length of one
 *     task and then re-apply them, which is pure cost.
 *
 * Case 2 is the reason the caller must NOT treat a skip as "the server agrees"
 * — see the note on SOFT_REFRESH_EVENT in VisualEditingOverlay.tsx.
 *
 * Case 1 would be theoretical on the public site, where scroll-driven scripts
 * add classes and inline styles that make the live serialization drift from the
 * server's within a second. It is not theoretical HERE: the preview shell does
 * not load BaseLayout's motion script at all and forces the motion end states in
 * CSS instead (src/layouts/PreviewLayout.astro), so nothing inside `#main`
 * rewrites itself between renders and the two strings really do match.
 *
 * An empty `fetched` is never redundant: it means the parse produced nothing,
 * which the caller handles as a failure rather than as a no-op.
 */
export function isRedundantRender(
  fetched: string,
  live: string | null,
  lastAccepted: string | null,
): boolean {
  if (fetched === '') return false;
  return fetched === live || fetched === lastAccepted;
}

// ---------------------------------------------------------------------------
// The morph
// ---------------------------------------------------------------------------

/** Bounds on the walk, so pathological input costs a bail rather than a freeze. */
export interface MorphLimits {
  /** How deep to descend before giving up. */
  maxDepth: number;
  /** How many nodes to consider in total, old and new together. */
  maxNodes: number;
}

/**
 * Sized for this site with room to spare: a rendered `#main` runs to a few
 * thousand nodes and nests perhaps twenty deep. Exceeding either is not a page
 * this file should be trying to reconcile, and the caller's `replaceWith` is the
 * right answer for it.
 */
export const DEFAULT_MORPH_LIMITS: MorphLimits = { maxDepth: 60, maxNodes: 20000 };

/** Thrown internally when a cap is hit; never escapes `morph`. */
class MorphAbort extends Error {}

interface MorphContext {
  limits: MorphLimits;
  visited: number;
}

/**
 * Make `from` read like `to`, in place, reusing every node that can be reused.
 *
 * Returns true when the tree now matches. Returns FALSE when anything at all
 * went wrong — a cap, a DOM exception, a shape this does not handle — in which
 * case `from` may be half-updated and the caller MUST fall back to replacing it
 * outright. Note that `to`'s children are MOVED into `from` as the walk goes, so
 * a caller falling back cannot reuse `to`; it has to re-parse.
 */
export function morph(
  from: MorphElement,
  to: MorphElement,
  limits: MorphLimits = DEFAULT_MORPH_LIMITS,
): boolean {
  if (!sameKind(from, to)) return false;
  try {
    morphElement(from, to, 0, { limits, visited: 0 });
    return true;
  } catch {
    return false;
  }
}

function morphElement(
  from: MorphElement,
  to: MorphElement,
  depth: number,
  context: MorphContext,
): void {
  if (depth > context.limits.maxDepth) throw new MorphAbort('too deep');
  syncAttributes(from, to, imageSourceUnchanged(from, to));
  morphChildren(from, to, depth, context);
}

/**
 * Set what changed, add what appeared, remove what went away, and touch nothing
 * else. An attribute whose value already matches is never written: assigning the
 * same `class` back is cheap but assigning the same `src` back is not, and the
 * rule is simpler to keep than to qualify.
 */
function syncAttributes(from: MorphElement, to: MorphElement, keepImageSource: boolean): void {
  const skip = (name: string): boolean =>
    keepImageSource && (IMAGE_SOURCE_ATTRIBUTES as readonly string[]).includes(name);

  const wanted = to.getAttributeNames();
  for (const name of wanted) {
    if (skip(name)) continue;
    const value = to.getAttribute(name) ?? '';
    if (from.getAttribute(name) !== value) from.setAttribute(name, value);
  }
  const keep = new Set(wanted);
  for (const name of from.getAttributeNames()) {
    if (keep.has(name) || skip(name)) continue;
    from.removeAttribute(name);
  }
}

/**
 * Reconcile one level of children.
 *
 * MATCHING, in two passes so that a reorder moves nodes rather than rebuilding
 * them. A keyed new child claims the old child with the same key, wherever it
 * sits. A keyless new child claims the next unclaimed KEYLESS old child, which
 * keeps the common case — a run of text, spans and images nobody keyed — matched
 * in order. Positional matching deliberately steps over keyed old children: they
 * belong to whichever new child names them, and letting position steal one is
 * how a morph ends up rebuilding a section it could have kept.
 *
 * APPLYING, in three steps: drop what nothing claimed, put the survivors and the
 * newcomers into the order the plan gives, then sweep any tail. Only the middle
 * step recurses, and only into a pair that matched.
 */
function morphChildren(
  parent: MorphElement,
  next: MorphElement,
  depth: number,
  context: MorphContext,
): void {
  const olds = toArray(parent.childNodes);
  const news = toArray(next.childNodes);
  context.visited += olds.length + news.length;
  if (context.visited > context.limits.maxNodes) throw new MorphAbort('too many nodes');

  const keyed = new Map<string, MorphNode>();
  for (const node of olds) {
    const key = nodeKey(node);
    if (key !== undefined && !keyed.has(key)) keyed.set(key, node);
  }

  const claimed = new Set<MorphNode>();
  const plan: Array<{ from: MorphNode | null; to: MorphNode }> = [];
  let cursor = 0;
  for (const candidate of news) {
    const key = nodeKey(candidate);
    let match: MorphNode | null = null;
    if (key !== undefined) {
      const found = keyed.get(key);
      if (found && !claimed.has(found) && sameKind(found, candidate)) match = found;
    } else {
      while (
        cursor < olds.length &&
        (claimed.has(olds[cursor]) || nodeKey(olds[cursor]) !== undefined)
      ) {
        cursor += 1;
      }
      const found = cursor < olds.length ? olds[cursor] : undefined;
      if (found && sameKind(found, candidate)) {
        match = found;
        cursor += 1;
      }
    }
    if (match) claimed.add(match);
    plan.push({ from: match, to: candidate });
  }

  for (const node of olds) {
    if (!claimed.has(node)) parent.removeChild(node);
  }

  for (let index = 0; index < plan.length; index += 1) {
    const { from, to } = plan[index];
    const node = from ?? to;
    const here = index < parent.childNodes.length ? parent.childNodes[index] : null;
    // Moves a survivor already in the parent, adopts a newcomer parsed elsewhere.
    if (here !== node) parent.insertBefore(node, here);
    if (from) morphMatched(from, to, depth, context);
  }

  // Defensive: the removal pass above should already have emptied the tail.
  while (parent.childNodes.length > plan.length) {
    parent.removeChild(parent.childNodes[plan.length]);
  }
}

/** Recurse into a matched pair, whichever kind of node it is. */
function morphMatched(from: MorphNode, to: MorphNode, depth: number, context: MorphContext): void {
  if (from.nodeType === ELEMENT_NODE) {
    morphElement(from as MorphElement, to as MorphElement, depth + 1, context);
    return;
  }
  if (from.nodeType === TEXT_NODE || from.nodeType === COMMENT_NODE) {
    const target = from as MorphCharacterData;
    const source = to as MorphCharacterData;
    // Assigned only when it differs: writing the same characters back would
    // detach and rebuild the node's text run for nothing, and would also throw
    // away an instant-text swap the server has not caught up with.
    if (target.data !== source.data) target.data = source.data;
  }
}

/** A stable snapshot of a child list, which in a real DOM is live. */
function toArray(nodes: ArrayLike<MorphNode>): MorphNode[] {
  const out: MorphNode[] = [];
  for (let index = 0; index < nodes.length; index += 1) out.push(nodes[index]);
  return out;
}
