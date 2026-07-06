// Small shared predicates used by more than one rule.

/** kebab-case: lowercase words joined by single hyphens, no leading/trailing/double hyphen. */
export function isKebabCase(name) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name);
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
