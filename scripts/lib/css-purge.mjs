// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The pieces of scripts/purge-page-css.mjs (PORTS.md card 159): a small reader for Lightning
// CSS's minified output and the rule that decides whether a selector can match. Pure; tested in
// css-purge.test.mjs. The why and the safety rules are in the header of purge-page-css.mjs.

// At-rules whose block holds style rules (recursed into); every other at-rule is kept whole.
const NESTING = new Set(['media', 'supports', 'layer', 'container', 'scope', 'starting-style']);

/** Splits a stylesheet into top-level items: { kind: 'rule'|'at'|'stmt', head, body, raw }. */
export function parseBlocks(css) {
  const items = [];
  let i = 0;
  const n = css.length;
  while (i < n) {
    // Skip whitespace and comments between items.
    while (i < n && /\s/.test(css[i])) i++;
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (i >= n) break;
    const start = i;
    let quote = '';
    let paren = 0;
    while (i < n) {
      const c = css[i];
      if (quote) {
        if (c === '\\') i++;
        else if (c === quote) quote = '';
      } else if (c === '"' || c === "'") quote = c;
      else if (c === '\\') i++;
      else if (c === '(') paren++;
      else if (c === ')') paren--;
      else if (paren === 0 && (c === '{' || c === ';')) break;
      i++;
    }
    const head = css.slice(start, i).trim();
    if (i >= n) {
      if (head) items.push({ kind: 'stmt', head, body: '', raw: head });
      break;
    }
    if (css[i] === ';') {
      items.push({ kind: 'stmt', head, body: '', raw: css.slice(start, i + 1) });
      i++;
      continue;
    }
    // Find the matching close brace.
    let depth = 0;
    const open = i;
    quote = '';
    for (; i < n; i++) {
      const c = css[i];
      if (quote) {
        if (c === '\\') i++;
        else if (c === quote) quote = '';
        continue;
      }
      if (c === '"' || c === "'") quote = c;
      else if (c === '\\') i++;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) break;
    }
    if (depth !== 0) throw new Error(`unbalanced braces after: ${head.slice(0, 80)}`);
    const body = css.slice(open + 1, i);
    i++;
    items.push({
      kind: head.startsWith('@') ? 'at' : 'rule',
      head,
      body,
      raw: css.slice(start, i),
    });
  }
  return items;
}

/** Splits a selector list at its top-level commas. */
export function splitList(sel) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === '\\') {
      cur += c + (sel[i + 1] ?? '');
      i++;
      continue;
    }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** CSS identifier escapes undone: "md\:flex" -> "md:flex", "\32 xl" -> "2xl". */
export function unescapeIdent(s) {
  return s.replace(/\\([0-9a-fA-F]{1,6})\s?|\\(.)/g, (_, hex, ch) =>
    hex ? String.fromCodePoint(parseInt(hex, 16)) : ch,
  );
}

/** Finds `name(` ... `)` pseudo groups at the top of a complex selector. */
function pseudoGroups(sel) {
  const groups = [];
  const re = /:(not|is|where|has|matches|-webkit-any|-moz-any)\(/g;
  let m;
  while ((m = re.exec(sel))) {
    let depth = 1;
    let j = re.lastIndex;
    for (; j < sel.length && depth; j++) {
      if (sel[j] === '\\') j++;
      else if (sel[j] === '(') depth++;
      else if (sel[j] === ')') depth--;
    }
    groups.push({ name: m[1], start: m.index, inner: sel.slice(re.lastIndex, j - 1), end: j });
    re.lastIndex = j;
  }
  return groups;
}

/**
 * The selector without its attribute selectors. An ESCAPED bracket belongs to a class name
 * (Tailwind's `.data-\[slot\=x\]\:size-4`) and is kept.
 */
function stripAttributes(sel) {
  let out = '';
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === '\\') {
      out += c + (sel[i + 1] ?? '');
      i++;
    } else if (c === '[') {
      // Skip to the matching unescaped close bracket (values may hold escapes).
      for (i++; i < sel.length && sel[i] !== ']'; i++) if (sel[i] === '\\') i++;
    } else out += c;
  }
  return out;
}

/** Can this one complex selector match, given a test for whether a class can exist? */
export function canMatch(sel, has) {
  let rest = '';
  let at = 0;
  for (const g of pseudoGroups(sel)) {
    rest += sel.slice(at, g.start);
    at = g.end;
    if (g.name === 'not') continue; // :not(.x) needs nothing to exist
    // :is / :where / :has: at least one branch must be able to match.
    if (!splitList(g.inner).some((b) => canMatch(b, has))) return false;
  }
  rest += sel.slice(at);
  // Attribute selectors can hold dots ([href$=".pdf"]): leave them out of the class scan.
  rest = stripAttributes(rest);
  for (const m of rest.matchAll(/\.((?:\\[0-9a-fA-F]{1,6}\s?|\\.|[\w-])+)/g)) {
    if (!has(unescapeIdent(m[1]))) return false;
  }
  return true;
}

/** The stylesheet with every rule that cannot match removed. */
export function purgeCss(css, has) {
  let out = '';
  for (const it of parseBlocks(css)) {
    if (it.kind === 'stmt') out += it.raw;
    else if (it.kind === 'at') {
      const name = (/^@([\w-]+)/.exec(it.head) ?? [])[1] ?? '';
      if (NESTING.has(name)) {
        const inner = purgeCss(it.body, has);
        // An emptied @media or @supports goes; an emptied @layer stays (it fixes layer order).
        if (inner.trim() || name === 'layer') out += `${it.head}{${inner}}`;
      } else out += it.raw;
    } else {
      const kept = splitList(it.head).filter((s) => canMatch(s, has));
      if (kept.length === splitList(it.head).length) out += it.raw;
      else if (kept.length) out += `${kept.join(',')}{${it.body}}`;
    }
  }
  return out;
}
