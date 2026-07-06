import { diag, SEVERITY } from '../diagnostics.js';
import { hasTriggerLanguage } from './helpers.js';

// Model hosts truncate very long skill descriptions, and a description with no
// "use when…" trigger language won't reliably fire. Both are the classic "my
// skill is there but never activates" bug.
const MAX_DESCRIPTION = 1024;
const MIN_DESCRIPTION = 16;

/** @type {import('./index.js').DocumentRule} */
export default {
  id: 'description-quality',
  appliesTo: (kind) => kind === 'skill',
  check(doc) {
    const out = [];
    const node = doc.frontmatter.fields.description;
    if (!node || node.raw === '') return out; // missing-field owns this case

    const desc = String(node.value);

    if (desc.length > MAX_DESCRIPTION) {
      out.push(
        diag({
          ruleId: 'description-too-long',
          severity: SEVERITY.WARNING,
          message: `description is ${desc.length} chars (limit ${MAX_DESCRIPTION})`,
          line: node.line,
          column: node.column,
          hint: 'Trim it — hosts truncate long descriptions, dropping your trigger cues.',
        }),
      );
    }

    if (desc.length < MIN_DESCRIPTION) {
      out.push(
        diag({
          ruleId: 'description-too-short',
          severity: SEVERITY.WARNING,
          message: `description is only ${desc.length} chars — too terse to match against`,
          line: node.line,
          column: node.column,
          hint: 'Describe what the skill does AND when to use it.',
        }),
      );
    } else if (!hasTriggerLanguage(desc)) {
      out.push(
        diag({
          ruleId: 'weak-trigger',
          severity: SEVERITY.WARNING,
          message: 'description has no trigger language (e.g. "use when…")',
          line: node.line,
          column: node.column,
          hint: 'State the conditions that should activate the skill so the model can match them.',
        }),
      );
    }
    return out;
  },
};
