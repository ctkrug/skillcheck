// Machine-readable reporter for CI and editor integrations.

/**
 * @param {import('../lint.js').LintResult} result
 * @returns {string}
 */
export function renderJson(result) {
  return JSON.stringify(
    {
      ok: result.ok,
      summary: result.summary,
      diagnostics: result.diagnostics,
    },
    null,
    2,
  );
}
