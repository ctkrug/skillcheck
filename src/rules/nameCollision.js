import { diag, SEVERITY } from '../diagnostics.js';

// A project-level rule: it needs to see every skill at once. Two skills that
// declare the same `name` shadow each other — only one registers, and which one
// is non-deterministic. This is the highest-value check Skillcheck offers,
// because it is impossible to spot by reading a single file.
/** @type {import('./index.js').ProjectRule} */
export default {
  id: 'duplicate-name',
  checkProject(docs) {
    const out = [];
    const byName = new Map(); // name -> [{doc, node}]

    for (const doc of docs) {
      if (doc.kind !== 'skill') continue;
      const node = doc.frontmatter.fields.name;
      if (!node || node.raw === '') continue;
      const name = String(node.value);
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push({ doc, node });
    }

    for (const [name, hits] of byName) {
      if (hits.length < 2) continue;
      for (const { doc, node } of hits) {
        const others = hits
          .filter((h) => h.doc !== doc)
          .map((h) => h.doc.path || '(pasted document)')
          .join(', ');
        out.push(
          diag({
            ruleId: 'duplicate-name',
            severity: SEVERITY.ERROR,
            file: doc.path || '',
            message: `skill name \`${name}\` is also declared in ${others}`,
            line: node.line,
            column: node.column,
            hint: 'Give each skill a unique name — colliding skills shadow each other.',
          }),
        );
      }
    }
    return out;
  },
};
