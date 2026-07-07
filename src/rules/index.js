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
import unknownKey from './unknownKey.js';
import nameCollision from './nameCollision.js';
import skillReference from './skillReference.js';

export const documentRules = [
  missingFrontmatter,
  nameFormat,
  descriptionQuality,
  duplicateKey,
  unknownKey,
];

export const projectRules = [nameCollision, skillReference];

/** Every rule id Skillcheck can emit — handy for docs, tests, and config. */
export const allRuleIds = [
  'missing-field',
  'name-format',
  'name-dir-mismatch',
  'description-too-long',
  'description-too-short',
  'weak-trigger',
  'duplicate-key',
  'unknown-key',
  'duplicate-name',
  'unresolved-skill-reference',
];
