import { diag, SEVERITY } from '../diagnostics.js';
import { isKebabCase, skillDirName, isBlankValue } from './helpers.js';

// The runtime resolves a skill by its `name`, which must be kebab-case and — for
// on-disk skills — match the directory it lives in. A mismatch means the skill
// loads under a name you didn't expect, or not at all.
/** @type {import('./index.js').DocumentRule} */
export default {
  id: 'name-format',
  appliesTo: (kind) => kind === 'skill',
  check(doc) {
    const out = [];
    const node = doc.frontmatter.fields.name;
    if (isBlankValue(node)) return out; // missing-field owns the empty/null case

    const name = String(node.value);

    if (!isKebabCase(name)) {
      out.push(
        diag({
          ruleId: 'name-format',
          severity: SEVERITY.ERROR,
          message: `skill name \`${name}\` is not kebab-case`,
          line: node.line,
          column: node.column,
          hint: 'Use lowercase words joined by single hyphens, e.g. `deep-research`.',
        }),
      );
    }

    const dir = skillDirName(doc.path);
    if (dir && dir !== name) {
      out.push(
        diag({
          ruleId: 'name-dir-mismatch',
          severity: SEVERITY.WARNING,
          message: `skill name \`${name}\` does not match its directory \`${dir}\``,
          line: node.line,
          column: node.column,
          hint: `Rename the field or the directory so they agree (\`${dir}\`).`,
        }),
      );
    }
    return out;
  },
};
