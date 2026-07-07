import { diag, SEVERITY } from '../diagnostics.js';
import { isBlankValue } from './helpers.js';

// Required frontmatter keys per document kind. A skill with no `name` never
// registers; with no `description` the model has nothing to match a request
// against — both are silent failures at runtime, so they're errors here.
const REQUIRED = {
  skill: ['name', 'description'],
};

/** @type {import('./index.js').DocumentRule} */
export default {
  id: 'missing-field',
  appliesTo: (kind) => kind === 'skill',
  check(doc) {
    const out = [];
    const { frontmatter } = doc;

    if (!frontmatter.present) {
      out.push(
        diag({
          ruleId: 'missing-field',
          severity: SEVERITY.ERROR,
          message: 'skill file has no `---` frontmatter block',
          line: 1,
          column: 1,
          hint: 'Add a frontmatter block with at least `name` and `description`.',
        }),
      );
      return out;
    }

    if (frontmatter.present && !frontmatter.closed) {
      out.push(
        diag({
          ruleId: 'missing-field',
          severity: SEVERITY.ERROR,
          message: 'frontmatter block is never closed with a `---` line',
          line: frontmatter.startLine,
          column: 1,
          hint: 'Add a closing `---` after the frontmatter keys.',
        }),
      );
    }

    for (const key of REQUIRED[doc.kind] || []) {
      const node = frontmatter.fields[key];
      if (isBlankValue(node)) {
        out.push(
          diag({
            ruleId: 'missing-field',
            severity: SEVERITY.ERROR,
            message: `skill frontmatter is missing required key \`${key}\``,
            line: node ? node.line : frontmatter.startLine,
            column: 1,
            hint: `Add a non-empty \`${key}:\` field to the frontmatter.`,
          }),
        );
      }
    }
    return out;
  },
};
