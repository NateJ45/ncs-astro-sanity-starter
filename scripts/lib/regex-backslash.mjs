// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Finds regular expressions that look like they lost their backslashes (PORTS.md card 155).
// Git Bash heredocs on this PC strip backslashes, so `/(\s+)/` written through one comes out as
// `/(s+)/`, which is still valid JavaScript and silently matches the letter "s". A site shipped
// exactly that for a week once.
//
// A regex is suspect when it has NO backslash at all and still holds a class-letter quantifier
// that only makes sense escaped: `s+`, `d*`, `w{2}`, `(s`, `[^s]` and friends, for s d w b (and
// their capitals). A regex that has any backslash was evidently written by an editor, so it is
// trusted. Regex literals are found with the TypeScript scanner, so strings and comments that
// merely mention a pattern never count. `new RegExp('...')` strings are checked the same way.

import { readFileSync } from 'node:fs';
import ts from 'typescript';

// A class letter that is quantified, or opens a group, or sits alone in a bracket. Preceded by
// something that is not a letter, so ordinary words ("class+", "words*") do not trip it.
const SUSPECT = /(?:^|[^A-Za-z])[sdwbSDWB](?:[+*?]|\{\d)|\[\^?[sdwSDW]\]|\((?:\?:)?[sdwSDW][+*]/;

/** True when a regex body (without slashes or flags) looks like it lost its backslashes. */
export function looksStripped(body) {
  if (body.includes('\\')) return false;
  return SUSPECT.test(body);
}

/** The code parts of an .astro file: the frontmatter and every <script> body. */
function astroCode(text) {
  const parts = [];
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fm) parts.push(fm[1]);
  for (const m of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) parts.push(m[1]);
  return parts.join('\n;\n');
}

/** Every suspect regex in one file, as { line, regex }. */
export function scanFile(path) {
  const raw = readFileSync(path, 'utf8');
  const code = path.endsWith('.astro') ? astroCode(raw) : raw;
  const kind = /\.(tsx|jsx)$/.test(path) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(path, code, ts.ScriptTarget.Latest, true, kind);
  const found = [];
  const visit = (node) => {
    if (node.kind === ts.SyntaxKind.RegularExpressionLiteral) {
      const lit = node.getText(source);
      const body = lit.slice(1, lit.lastIndexOf('/'));
      if (looksStripped(body)) found.push({ node, regex: lit });
    } else if (
      ts.isNewExpression(node) &&
      node.expression.getText(source) === 'RegExp' &&
      node.arguments?.[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      // In a string, a regex escape is written "\\s"; the raw text has the backslashes.
      const rawText = node.arguments[0].getText(source).slice(1, -1);
      if (looksStripped(rawText)) found.push({ node, regex: `new RegExp(${rawText})` });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found.map(({ node, regex }) => ({
    line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
    regex,
  }));
}
