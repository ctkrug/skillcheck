import { diag, SEVERITY } from '../diagnostics.js';
import { isBlankValue } from './helpers.js';

// Instruction files often refer to other skills by their slash-name ("delegate
// to /deep-research"). If that name resolves to no skill in the linted set, the
// reference is dead — the author expects a skill that isn't wired up. This is a
// project rule because it can only be judged against the whole set of names.
//
// It runs only when more than one document is linted: a single pasted file has
// no context to resolve references against, so every mention would false-positive.

// A `/skill-name` token: a slash followed by a kebab-case identifier, not part of
// a path (no preceding word char or slash) and not a closing element.
const REFERENCE = /(^|[\s(`"'\[])\/([a-z0-9]+(?:-[a-z0-9]+)+)\b/g;

/** Collect every declared skill name in the set. */
function declaredNames(docs) {
  const names = new Set();
  for (const doc of docs) {
    if (doc.kind !== 'skill') continue;
    const node = doc.frontmatter.fields.name;
    if (!isBlankValue(node)) names.add(String(node.value));
  }
  return names;
}

/** @type {import('./index.js').ProjectRule} */
export default {
  id: 'unresolved-skill-reference',
  checkProject(docs) {
    const out = [];
    if (docs.length < 2) return out; // needs sibling context to resolve against

    const known = declaredNames(docs);
    if (known.size === 0) return out;

    for (const doc of docs) {
      const lines = doc.lines;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        REFERENCE.lastIndex = 0;
        let m;
        while ((m = REFERENCE.exec(line)) !== null) {
          const ref = m[2];
          if (known.has(ref)) continue;
          const column = m.index + m[1].length + 1; // 1-based, at the slash
          out.push(
            diag({
              ruleId: 'unresolved-skill-reference',
              severity: SEVERITY.WARNING,
              file: doc.path || '',
              message: `reference to \`/${ref}\` matches no skill in this set`,
              line: i + 1,
              column,
              hint: 'Fix the name, or add the skill — a dead reference silently does nothing.',
            }),
          );
        }
      }
    }
    return out;
  },
};
