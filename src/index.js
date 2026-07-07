// Node-facing public API. Adds filesystem discovery on top of the pure engine in
// lint.js. The browser never imports this file (it would pull in node:fs); it
// imports lint.js directly.

import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { lintSources, lintText } from './lint.js';

export { lintText, lintSources };
export { SEVERITY } from './diagnostics.js';
export { allRuleIds } from './rules/index.js';

const CONFIG_FILENAME = 'skillcheck.json';

/**
 * Read and JSON-parse a config file. Throws a clear error if the file is missing
 * or malformed — an unreadable config should stop the run, not be ignored.
 * @param {string} path
 * @returns {object}
 */
export function loadConfig(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new Error(`config file not found: ${path}`);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`config file ${path} is not valid JSON: ${err.message}`);
  }
}

/** Look for a `skillcheck.json` in `dir` and return its path, or null. */
export function findConfig(dir = process.cwd()) {
  const candidate = join(dir, CONFIG_FILENAME);
  return existsSync(candidate) ? candidate : null;
}

// Filenames Skillcheck recognizes as instruction files when walking a directory.
const TARGET_FILES = new Set(['SKILL.md', 'CLAUDE.md', 'AGENTS.md']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage']);

/** Recursively collect instruction-file paths under a directory. */
export function collectTargets(root) {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(join(dir, entry.name));
      } else if (TARGET_FILES.has(entry.name)) {
        found.push(join(dir, entry.name));
      }
    }
  };
  walk(root);
  return found.sort();
}

/**
 * Lint one or more paths (files or directories). Directories are walked for
 * known instruction files.
 * @param {string[]} paths
 * @param {{config?: object}} [options]
 * @returns {import('./lint.js').LintResult}
 */
export function lintPaths(paths, options = {}) {
  const files = [];
  for (const p of paths) {
    const st = statSync(p);
    if (st.isDirectory()) files.push(...collectTargets(p));
    else files.push(p);
  }
  const sources = files.map((path) => ({ path, text: readFileSync(path, 'utf8') }));
  return lintSources(sources, options);
}
