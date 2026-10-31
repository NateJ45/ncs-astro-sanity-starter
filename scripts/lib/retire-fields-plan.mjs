// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Pure half of scripts/retire-fields.mjs (rule 16): check the arguments, build
// the GROQ that finds every document still holding a retired field, and turn
// what comes back into a plan and a backup. No client, no file system, so it
// is unit-tested in retire-fields-plan.test.mjs without touching a dataset.

/** A document type name: letters, digits and underscores, starting with a letter. */
const TYPE_RE = /^[A-Za-z][A-Za-z0-9_]*$/;
/** A field path: dot-separated names, no array segments ("sectionVisibility.showEDesign"). */
const PATH_RE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

/**
 * Read `--type <name>` and one or more `--field <path>` from argv.
 * Returns { type, fields } or throws with a message a person can act on.
 * The paths are interpolated into GROQ, so they are checked strictly here.
 */
export function parseRetireArgs(argv) {
  let type = null;
  const fields = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--type') type = argv[++i] ?? null;
    else if (argv[i] === '--field') fields.push(argv[++i] ?? '');
  }
  if (!type || !TYPE_RE.test(type)) {
    throw new Error('Pass --type <documentType>, for example --type siteSettings.');
  }
  if (fields.length === 0) {
    throw new Error(
      'Pass at least one --field <path>, for example --field sectionVisibility.showEDesign.',
    );
  }
  for (const f of fields) {
    if (!PATH_RE.test(f)) {
      throw new Error(`"${f}" is not a plain field path (names joined by dots, no arrays).`);
    }
  }
  return { type, fields: [...new Set(fields)] };
}

/** GROQ for every document of `type`, drafts included, that still holds any of `fields`. */
export function retireQuery(type, fields) {
  const any = fields.map((f) => `defined(${f})`).join(' || ');
  return `*[_type == "${type}" && (${any})]`;
}

/** Read a dot path out of a plain object; undefined when any step is missing. */
export function valueAt(doc, path) {
  return path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), doc);
}

/**
 * The plan: one entry per document, naming only the fields it really holds and
 * their current values, so the dry run reads as exactly what will be unset.
 */
export function buildRetirePlan(docs, fields) {
  return docs
    .map((doc) => {
      const held = fields.filter((f) => valueAt(doc, f) !== undefined);
      return {
        _id: doc._id,
        _rev: doc._rev,
        fields: held,
        values: Object.fromEntries(held.map((f) => [f, valueAt(doc, f)])),
      };
    })
    .filter((p) => p.fields.length > 0);
}

/** The backup file's body: the whole documents, verbatim, plus what was retired and when. */
export function backupBody({ type, fields, dataset, docs, now = new Date() }) {
  return {
    retired: { type, fields, dataset, at: now.toISOString() },
    documents: docs,
  };
}
