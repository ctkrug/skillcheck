// Starter-skill scaffolding. `skillTemplate` is pure (returns a string) so a test
// can lint its output directly; the Node file-writing wrapper lives in index.js.

import { isKebabCase } from './rules/helpers.js';

const DEFAULT_NAME = 'my-skill';

/** Title-case a kebab name for the heading: `deep-research` -> `Deep Research`. */
function titleCase(name) {
  return name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Render a starter SKILL.md that passes every Skillcheck rule clean. The name
 * must be kebab-case (so `name-format` is happy) and match the directory the
 * file is written into.
 * @param {string} [name]
 * @returns {string}
 */
export function skillTemplate(name = DEFAULT_NAME) {
  if (!isKebabCase(name)) {
    throw new Error(`skill name "${name}" must be kebab-case, e.g. "deep-research"`);
  }
  return `---
name: ${name}
description: Summarize what this skill does in one line. Use when the user asks to <do the thing>, so the runtime knows exactly when to activate it.
metadata:
  type: reference
---

# ${titleCase(name)}

Explain what this skill does and — most importantly — WHEN it should fire. The
\`description\` above is the text the runtime matches a request against, so keep
its trigger language concrete ("use when the user…").

## Steps

1. Describe the first thing the skill should do.
2. Describe the next step.
3. Note what a successful outcome looks like.
`;
}

export const _internal = { titleCase, DEFAULT_NAME };
