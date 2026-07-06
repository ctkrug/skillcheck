// The pure linting engine. No Node APIs here — this exact module is what the web
// validator imports, so it must run in a browser.

import { parseDocument } from './parser.js';
import { documentRules, projectRules } from './rules/index.js';
import { sortDiagnostics, summarize } from './diagnostics.js';

/**
 * @typedef {Object} Source
 * @property {string} text
 * @property {string} [path]
 * @property {string} [kind]
 */

/**
 * @typedef {Object} LintResult
 * @property {import('./diagnostics.js').Diagnostic[]} diagnostics
 * @property {{errors:number, warnings:number, infos:number}} summary
 * @property {import('./parser.js').Document[]} documents
 * @property {boolean} ok    true when there are zero errors
 */

/**
 * Lint one document's text and return its diagnostics. Convenience wrapper around
 * {@link lintSources} for the common single-file / paste case.
 * @param {string} text
 * @param {{path?: string, kind?: string}} [opts]
 * @returns {LintResult}
 */
export function lintText(text, opts = {}) {
  return lintSources([{ text, path: opts.path, kind: opts.kind }]);
}

/**
 * Lint a set of already-loaded sources. This is the single code path both the CLI
 * (after reading files) and the web validator use.
 * @param {Source[]} sources
 * @returns {LintResult}
 */
export function lintSources(sources) {
  const documents = sources.map((s) =>
    parseDocument(s.text, { path: s.path, kind: s.kind }),
  );

  const diagnostics = [];

  // Per-document rules.
  for (const doc of documents) {
    for (const rule of documentRules) {
      if (!rule.appliesTo(doc.kind)) continue;
      for (const d of rule.check(doc, {})) {
        if (!d.file && doc.path) d.file = doc.path;
        diagnostics.push(d);
      }
    }
  }

  // Cross-document (project) rules.
  for (const rule of projectRules) {
    for (const d of rule.checkProject(documents, {})) {
      diagnostics.push(d);
    }
  }

  const sorted = sortDiagnostics(diagnostics);
  const summary = summarize(sorted);
  return { diagnostics: sorted, summary, documents, ok: summary.errors === 0 };
}
