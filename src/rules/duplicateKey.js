import { diag, SEVERITY } from '../diagnostics.js';

// A repeated top-level frontmatter key is almost always a copy-paste mistake.
// YAML lets the last value silently win, so a stray second `name:` can point the
// skill at a name you never intended — with no error anywhere. The parser keeps
// the first occurrence and records the rest as duplicates; we flag each one.
/** @type {import('./index.js').DocumentRule} */
export default {
  id: 'duplicate-key',
  appliesTo: (kind) => kind === 'skill',
  check(doc) {
    return (doc.frontmatter.duplicates || []).map((d) =>
      diag({
        ruleId: 'duplicate-key',
        severity: SEVERITY.ERROR,
        message: `frontmatter key \`${d.key}\` is already defined on line ${d.firstLine}`,
        line: d.line,
        column: d.column,
        hint: `Remove the duplicate \`${d.key}:\` — YAML keeps only one and which wins is not obvious.`,
      }),
    );
  },
};
