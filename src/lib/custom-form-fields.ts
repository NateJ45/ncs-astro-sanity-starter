// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// custom-form-fields - editor-defined form questions
// =============================================================================
// A form section normally asks a fixed set of questions that a developer wrote.
// An editor can also write their own questions in the Studio: the section's
// `fields` array (schemaTypes/formQuestion.ts). This module holds the two pure
// functions that path needs, so the renderer and the submit path agree, and so
// both are tested:
//
//   normalizeCustomFields()   Sanity value  -> the list the renderer draws
//   parseCustomFieldEntries() posted fields -> the "Label: answer" lines
//
// The renderer posts each answer as `custom_<n>`, with the question text in a
// hidden `custom_<n>_label` and a "1" in `custom_<n>_req` when the question is
// required. The submit path never trusts those markers for anything but the
// caps and the message it builds. It NEVER logs an answer.
//
// The answers become plain lines of text that are folded into the message the
// site already sends. That is the whole design: a new question needs no code
// change, no schema change, and no change to whatever receives the submission.
//
// This file is deliberately dependency-free and framework-free. It must stay
// that way: every repo in the family shares the same byte-identical copy.
// =============================================================================

/** The most questions one form can ask. The Studio also validates this. */
export const MAX_CUSTOM_FIELDS = 12;
/** The most characters one answer can add to the message. */
export const MAX_FIELD_LENGTH = 2000;
/** The most characters all answers together can add to the message. */
export const MAX_TOTAL_LENGTH = 12000;
/** The most characters a question label can add. */
export const MAX_LABEL_LENGTH = 200;

export type CustomFormFieldKind = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox';

const KINDS: readonly CustomFormFieldKind[] = [
  'text',
  'email',
  'phone',
  'textarea',
  'select',
  'checkbox',
];

export interface CustomFormField {
  label: string;
  kind: CustomFormFieldKind;
  options: string[];
  required: boolean;
}

/**
 * Shape the raw `fields` array from Sanity into a list the renderer can draw.
 *
 * It drops anything unusable rather than throwing: a question with no label
 * cannot be asked, and a dropdown with no choices cannot be answered. A bad
 * `kind` falls back to a plain text box. The list is capped at
 * MAX_CUSTOM_FIELDS.
 */
export function normalizeCustomFields(raw: unknown): CustomFormField[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomFormField[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const label = typeof row.label === 'string' ? row.label.trim() : '';
    if (!label) continue;
    const kindValue = typeof row.kind === 'string' ? row.kind.trim() : '';
    const kind = (KINDS as readonly string[]).includes(kindValue)
      ? (kindValue as CustomFormFieldKind)
      : 'text';
    const options = Array.isArray(row.options)
      ? row.options
          .filter((o): o is string => typeof o === 'string')
          .map((o) => o.trim())
          .filter(Boolean)
      : [];
    if (kind === 'select' && options.length === 0) continue;
    out.push({ label, kind, options, required: row.required === true });
    if (out.length === MAX_CUSTOM_FIELDS) break;
  }
  return out;
}

export interface ParsedCustomFields {
  /** One "Question: answer" line per answered question, in form order. */
  lines: string[];
  /** A visitor-facing message when the post cannot be accepted, else null. */
  error: string | null;
}

const clip = (s: string, max: number) => s.slice(0, max);

/**
 * Read the editor-defined answers out of a posted form.
 *
 * `entries` is the form data as [name, value] pairs. A checkbox posts its name
 * only when it is ticked, and a group can post the same name more than once, so
 * values are collected and joined. Questions past MAX_CUSTOM_FIELDS are
 * ignored, not rejected, so a stale open page still works.
 */
export function parseCustomFieldEntries(entries: Iterable<[string, string]>): ParsedCustomFields {
  const labels = new Map<number, string>();
  const required = new Set<number>();
  const values = new Map<number, string[]>();

  for (const [key, value] of entries) {
    const labelMatch = /^custom_(\d{1,3})_label$/.exec(key);
    if (labelMatch) {
      labels.set(Number(labelMatch[1]), clip(value.trim(), MAX_LABEL_LENGTH));
      continue;
    }
    const reqMatch = /^custom_(\d{1,3})_req$/.exec(key);
    if (reqMatch) {
      if (value.trim() === '1') required.add(Number(reqMatch[1]));
      continue;
    }
    const valueMatch = /^custom_(\d{1,3})$/.exec(key);
    if (valueMatch) {
      const index = Number(valueMatch[1]);
      const list = values.get(index) ?? [];
      const trimmed = clip(value.trim(), MAX_FIELD_LENGTH);
      if (trimmed) list.push(trimmed);
      values.set(index, list);
    }
  }

  const indexes = [...labels.keys()].sort((a, b) => a - b).slice(0, MAX_CUSTOM_FIELDS);
  const lines: string[] = [];
  let total = 0;

  for (const index of indexes) {
    const label = labels.get(index) ?? '';
    if (!label) continue;
    const answer = (values.get(index) ?? []).join(', ');
    if (!answer) {
      if (required.has(index)) return { lines: [], error: `Please answer: ${label}` };
      continue;
    }
    const line = `${label}: ${clip(answer, MAX_FIELD_LENGTH)}`;
    total += line.length;
    if (total > MAX_TOTAL_LENGTH)
      return { lines: [], error: 'Your answers are too long. Please shorten them and try again.' };
    lines.push(line);
  }

  return { lines, error: null };
}
