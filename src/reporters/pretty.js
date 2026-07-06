// Human-readable terminal reporter. Groups diagnostics by file and colorizes by
// severity (colors auto-disable when stdout is not a TTY or NO_COLOR is set).

import { SEVERITY } from '../diagnostics.js';

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (useColor ? `[${code}m${s}[0m` : s);

const LABEL = {
  [SEVERITY.ERROR]: paint('31', 'error'),
  [SEVERITY.WARNING]: paint('33', 'warn '),
  [SEVERITY.INFO]: paint('36', 'info '),
};

const dim = (s) => paint('2', s);
const bold = (s) => paint('1', s);

/**
 * @param {import('../lint.js').LintResult} result
 * @returns {string}
 */
export function renderPretty(result) {
  const { diagnostics, summary } = result;
  const lines = [];

  if (diagnostics.length === 0) {
    lines.push(paint('32', '✓ no problems found'));
    return lines.join('\n');
  }

  let currentFile = null;
  for (const d of diagnostics) {
    const file = d.file || '(input)';
    if (file !== currentFile) {
      currentFile = file;
      lines.push('');
      lines.push(bold(file));
    }
    const pos = dim(`${d.line}:${d.column}`.padEnd(6));
    lines.push(`  ${LABEL[d.severity]} ${pos} ${d.ruleId.padEnd(22)} ${d.message}`);
    if (d.hint) lines.push(`         ${dim('↳ ' + d.hint)}`);
  }

  lines.push('');
  const parts = [];
  if (summary.errors) parts.push(paint('31', `${summary.errors} error${summary.errors === 1 ? '' : 's'}`));
  if (summary.warnings) parts.push(paint('33', `${summary.warnings} warning${summary.warnings === 1 ? '' : 's'}`));
  if (summary.infos) parts.push(paint('36', `${summary.infos} info`));
  lines.push(parts.join(', ') || 'no problems');
  return lines.join('\n');
}
