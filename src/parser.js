// Parsing for AI-agent instruction files.
//
// We deliberately do NOT pull in a full YAML library: skill frontmatter uses a
// tiny, well-understood subset (scalar keys, quoted strings, and a one-level
// `metadata:` map), and we need per-key line numbers for diagnostics — which most
// YAML parsers throw away. A focused parser gives us better error positions and
// keeps the engine dependency-free so it runs unchanged in the browser.

/**
 * @typedef {Object} FieldNode
 * @property {string} key
 * @property {*} value          parsed scalar (string | number | boolean | null)
 * @property {string} raw       original text after the colon, trimmed
 * @property {number} line      1-based line of this key
 * @property {number} column    1-based column where the key starts
 */

/**
 * @typedef {Object} DuplicateKey
 * @property {string} key
 * @property {number} line        line of the repeated occurrence
 * @property {number} column
 * @property {number} firstLine   line of the first occurrence we kept
 */

/**
 * @typedef {Object} Frontmatter
 * @property {boolean} present  was a `---` fenced block found at the top?
 * @property {boolean} closed   was it terminated by a closing `---`?
 * @property {Object<string, FieldNode>} fields   top-level scalar keys
 * @property {Object<string, Object<string, FieldNode>>} maps  one-level nested maps
 * @property {DuplicateKey[]} duplicates   repeated top-level keys (first kept)
 * @property {number} startLine
 * @property {number} endLine
 */

/**
 * @typedef {Object} Document
 * @property {'skill'|'claude-md'|'agents-md'|'markdown'} kind
 * @property {Frontmatter} frontmatter
 * @property {string} body        content after the frontmatter block
 * @property {string[]} lines     original lines (no trailing newline)
 * @property {string} [path]
 */

function parseScalar(raw) {
  const t = raw.trim();
  if (t === '') return '';
  if (t === 'null' || t === '~') return null;
  if (t === 'true') return true;
  if (t === 'false') return false;
  // Quoted string — strip matching quotes.
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}

/**
 * Extract and parse the leading `---` frontmatter block, if any.
 * @param {string[]} lines
 * @returns {Frontmatter}
 */
function parseFrontmatter(lines) {
  const empty = {
    present: false,
    closed: false,
    fields: {},
    maps: {},
    duplicates: [],
    startLine: 0,
    endLine: 0,
  };

  // Frontmatter must be the very first non-empty content.
  let start = 0;
  while (start < lines.length && lines[start].trim() === '') start++;
  if (start >= lines.length || lines[start].trim() !== '---') return { ...empty };

  const fm = {
    ...empty,
    present: true,
    startLine: start + 1,
    fields: {},
    maps: {},
    duplicates: [],
  };

  // Record a top-level key. YAML lets the last value win on a repeat, but a
  // repeat is almost always a mistake, so we keep the FIRST occurrence and log
  // the duplicate for the duplicate-key rule to report.
  const setField = (key, node) => {
    if (Object.prototype.hasOwnProperty.call(fm.fields, key)) {
      fm.duplicates.push({
        key,
        line: node.line,
        column: node.column,
        firstLine: fm.fields[key].line,
      });
      return false;
    }
    fm.fields[key] = node;
    return true;
  };

  const indentOf = (l) => l.length - l.trimStart().length;

  let currentMap = null; // key name when we're inside a nested map
  let i = start + 1;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') {
      fm.closed = true;
      fm.endLine = i + 1;
      break;
    }
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    const indent = indentOf(line);
    const match = line.trimStart().match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!match) {
      currentMap = null;
      continue;
    }
    const [, key, rest] = match;

    // Nested map entry (e.g. under `metadata:`).
    if (indent > 0) {
      if (currentMap) {
        fm.maps[currentMap][key] = {
          key,
          value: parseScalar(rest),
          raw: rest.trim(),
          line: i + 1,
          column: indent + 1,
        };
      }
      continue;
    }

    // ---- Top-level key ----
    currentMap = null;

    // Block (`|`) or folded (`>`) scalar, with optional chomping indicator.
    const block = rest.trim().match(/^([|>])[+-]?$/);
    if (block) {
      const collected = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        const l = lines[j];
        if (l.trim() === '---') break;
        if (l.trim() !== '' && indentOf(l) === 0) break; // next top-level key
        collected.push(l);
      }
      while (collected.length && collected[0].trim() === '') collected.shift();
      while (collected.length && collected[collected.length - 1].trim() === '') collected.pop();
      const nonEmpty = collected.filter((l) => l.trim() !== '');
      const baseIndent = nonEmpty.length ? Math.min(...nonEmpty.map(indentOf)) : 0;
      const stripped = collected.map((l) => l.slice(baseIndent));
      // `|` keeps newlines; `>` folds them into spaces.
      const value =
        block[1] === '|' ? stripped.join('\n') : stripped.map((s) => s.trim()).join(' ').trim();
      setField(key, { key, value, raw: value, line: i + 1, column: indent + 1 });
      i = j - 1;
      continue;
    }

    // A bare `key:` opens a nested map (e.g. metadata:).
    if (rest.trim() === '') {
      const node = { key, value: '', raw: '', line: i + 1, column: indent + 1 };
      if (setField(key, node)) fm.maps[key] = {};
      currentMap = key;
      continue;
    }

    // Plain scalar — may fold across more-indented continuation lines.
    let raw = rest.trim();
    let j = i + 1;
    for (; j < lines.length; j++) {
      const l = lines[j];
      if (l.trim() === '' || l.trim() === '---') break;
      if (indentOf(l) === 0) break; // sibling key ends the scalar
      raw += ' ' + l.trim();
    }
    const folded = j > i + 1;
    setField(key, {
      key,
      value: folded ? raw : parseScalar(rest),
      raw,
      line: i + 1,
      column: indent + 1,
    });
    i = j - 1;
  }

  if (!fm.closed) fm.endLine = lines.length;
  return fm;
}

/**
 * Decide what kind of instruction file this is. A caller-supplied path wins
 * (filenames are authoritative); otherwise we infer from shape.
 */
function detectKind(path, frontmatter) {
  const base = (path || '').split('/').pop()?.toLowerCase() || '';
  if (base === 'skill.md') return 'skill';
  if (base === 'claude.md') return 'claude-md';
  if (base === 'agents.md') return 'agents-md';
  // Shape inference for pasted text: name + description frontmatter reads as a skill.
  if (frontmatter.present && frontmatter.fields.name && frontmatter.fields.description) {
    return 'skill';
  }
  return 'markdown';
}

/**
 * Parse raw text into a Document. Never throws on malformed input — malformed
 * input is exactly what the linter needs to inspect.
 * @param {string} text
 * @param {{path?: string, kind?: string}} [opts]
 * @returns {Document}
 */
export function parseDocument(text, opts = {}) {
  const normalized = String(text).replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const frontmatter = parseFrontmatter(lines);
  const kind = opts.kind || detectKind(opts.path, frontmatter);
  const bodyStart = frontmatter.closed ? frontmatter.endLine : 0;
  const body = lines.slice(bodyStart).join('\n');
  return { kind, frontmatter, body, lines, path: opts.path };
}

export const _internal = { parseScalar, parseFrontmatter, detectKind };
