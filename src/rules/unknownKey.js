import { diag, SEVERITY } from '../diagnostics.js';
import { KNOWN_SKILL_KEYS, nearestKnownKey } from './helpers.js';

// A top-level key that is a near-miss of a known one (`nmae:`, `descriptoin:`)
// is a silent failure: the linter can't see the field you meant, and neither can
// the runtime. We only warn on *close* typos, not on any unrecognized key, so
// legitimately custom keys don't produce noise.
/** @type {import('./index.js').DocumentRule} */
export default {
  id: 'unknown-key',
  appliesTo: (kind) => kind === 'skill',
  check(doc) {
    const out = [];
    if (!doc.frontmatter.present) return out;

    for (const [key, node] of Object.entries(doc.frontmatter.fields)) {
      if (KNOWN_SKILL_KEYS.has(key)) continue;
      const suggestion = nearestKnownKey(key);
      if (!suggestion) continue; // unrecognized but not a plausible typo — leave it
      out.push(
        diag({
          ruleId: 'unknown-key',
          severity: SEVERITY.WARNING,
          message: `unknown frontmatter key \`${key}\` — did you mean \`${suggestion}\`?`,
          line: node.line,
          column: node.column,
          hint: `Rename \`${key}:\` to \`${suggestion}:\`, or the field is silently ignored.`,
        }),
      );
    }
    return out;
  },
};
