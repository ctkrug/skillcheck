// Small shared predicates used by more than one rule.

/** kebab-case: lowercase words joined by single hyphens, no leading/trailing/double hyphen. */
export function isKebabCase(name) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name);
}

/**
 * True when a frontmatter field carries no usable value: absent, an empty
 * string, or a YAML null (`null` / `~`). A null-valued required key registers
 * as no value at all, so rules treat it exactly like a missing field rather
 * than coercing `null` into the literal string "null".
 */
export function isBlankValue(node) {
  return !node || node.raw === '' || node.value === null;
}

// Phrases that signal a description actually tells the runtime WHEN to fire the
// skill. Without trigger guidance, a skill's description is just a summary and
// the model has nothing to match against.
const TRIGGER_HINTS = [
  'use when',
  'use this when',
  'when the user',
  'when you',
  'whenever',
  'trigger',
  'for tasks',
  'invoke',
  'before ',
  'after ',
];

export function hasTriggerLanguage(description) {
  const lower = String(description).toLowerCase();
  return TRIGGER_HINTS.some((hint) => lower.includes(hint));
}

/** The skill directory name a `name:` field is expected to match, if we have a path. */
export function skillDirName(path) {
  if (!path) return null;
  const parts = path.split('/').filter(Boolean);
  // .../<dir>/SKILL.md  -> <dir>
  if (parts.length >= 2) return parts[parts.length - 2];
  return null;
}

// Top-level frontmatter keys skills legitimately use. An unknown key that is a
// near-miss of one of these is almost certainly a typo (e.g. `nmae:`), which is
// worse than a random key because the intended field then silently goes missing.
export const KNOWN_SKILL_KEYS = new Set([
  'name',
  'description',
  'metadata',
  'license',
  'version',
  'allowed-tools',
  'model',
]);

/** Levenshtein edit distance between two short strings. */
export function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** The closest known key within `max` edits, or null if none is close enough. */
export function nearestKnownKey(key, max = 2) {
  let best = null;
  let bestDist = max + 1;
  for (const known of KNOWN_SKILL_KEYS) {
    const d = editDistance(key, known);
    if (d < bestDist) {
      bestDist = d;
      best = known;
    }
  }
  return bestDist <= max ? best : null;
}
