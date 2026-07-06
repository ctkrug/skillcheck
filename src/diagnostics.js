// Diagnostic model shared by every rule, the CLI, and the web validator.
//
// A rule never prints; it only returns Diagnostic objects. Reporters decide how
// to render them. Keeping this pure (no Node APIs) is what lets the same code run
// in the browser.

/** @typedef {'error'|'warning'|'info'} Severity */

export const SEVERITY = Object.freeze({
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
});

// Sort weight so reporters can order most-severe first.
const SEVERITY_RANK = { error: 0, warning: 1, info: 2 };

/**
 * @typedef {Object} Diagnostic
 * @property {string} ruleId    stable slug, e.g. "missing-field"
 * @property {Severity} severity
 * @property {string} message   one concrete sentence about what's wrong
 * @property {number} line      1-based line the problem anchors to
 * @property {number} column    1-based column
 * @property {string} [hint]    how to fix it
 * @property {string} [file]    source path, filled in by the runner
 */

/**
 * Construct a diagnostic with sane defaults. Rules call this so the shape stays
 * consistent and a forgotten field can't produce a malformed report.
 * @returns {Diagnostic}
 */
export function diag({ ruleId, severity, message, line = 1, column = 1, hint = '', file = '' }) {
  if (!ruleId) throw new Error('diag() requires a ruleId');
  if (!SEVERITY_RANK.hasOwnProperty(severity)) {
    throw new Error(`diag() got unknown severity: ${severity}`);
  }
  return { ruleId, severity, message, line, column, hint, file };
}

/** Order diagnostics by file, then line, then severity. Stable for reporting. */
export function sortDiagnostics(diagnostics) {
  return [...diagnostics].sort(
    (a, b) =>
      (a.file || '').localeCompare(b.file || '') ||
      a.line - b.line ||
      a.column - b.column ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );
}

/** Roll a diagnostic list into {errors, warnings, infos} counts. */
export function summarize(diagnostics) {
  const counts = { errors: 0, warnings: 0, infos: 0 };
  for (const d of diagnostics) {
    if (d.severity === SEVERITY.ERROR) counts.errors++;
    else if (d.severity === SEVERITY.WARNING) counts.warnings++;
    else counts.infos++;
  }
  return counts;
}
