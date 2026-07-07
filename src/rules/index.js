// The rule registry.
//
// Two rule shapes:
//   DocumentRule  — inspects one parsed document in isolation.
//   ProjectRule   — inspects the whole set at once (needed for cross-file checks
//                   like name collisions).
//
// Adding a rule is: write the module, import it, add it to the right array.

/**
 * @typedef {Object} DocumentRule
 * @property {string} id
 * @property {(kind: string) => boolean} appliesTo
 * @property {(doc: import('../parser.js').Document, ctx: object) => import('../diagnostics.js').Diagnostic[]} check
 */

/**
 * @typedef {Object} ProjectRule
 * @property {string} id
 * @property {(docs: import('../parser.js').Document[], ctx: object) => import('../diagnostics.js').Diagnostic[]} checkProject
 */

import missingFrontmatter from './missingFrontmatter.js';
import nameFormat from './nameFormat.js';
import descriptionQuality from './descriptionQuality.js';
import duplicateKey from './duplicateKey.js';
import nameCollision from './nameCollision.js';

export const documentRules = [missingFrontmatter, nameFormat, descriptionQuality, duplicateKey];

export const projectRules = [nameCollision];

/** Every rule id Skillcheck can emit — handy for docs, tests, and config. */
export const allRuleIds = [
  'missing-field',
  'name-format',
  'description-too-long',
  'description-too-short',
  'weak-trigger',
  'duplicate-key',
  'unknown-key',
  'duplicate-name',
];
