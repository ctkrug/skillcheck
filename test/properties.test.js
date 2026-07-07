import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument } from '../src/parser.js';
import { lintText } from '../src/lint.js';
import { isKebabCase, editDistance } from '../src/rules/helpers.js';

// Property/fuzz tests. No external generator library (the engine ships zero
// dependencies), so we use a seeded PRNG for reproducible randomness: a failing
// case prints the seed offset via the iteration index and is deterministic.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Characters chosen to stress the frontmatter parser: fences, indentation,
// scalars, comments, nulls, quotes, colons, and the block/fold indicators.
const ALPHABET = [...'abc-: \n\t#|>~"\'01', '---\n', 'metadata:\n', '  ', 'name:', '\r\n'];

function randomDoc(rand, maxLen) {
  const len = 1 + Math.floor(rand() * maxLen);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return out;
}

test('parseDocument never throws on fuzzed input (never-throw contract)', () => {
  const rand = mulberry32(0x5111ec);
  for (let i = 0; i < 4000; i++) {
    const text = randomDoc(rand, 40);
    assert.doesNotThrow(() => parseDocument(text, { path: 'f/SKILL.md' }), `iteration ${i}: ${JSON.stringify(text)}`);
  }
});

test('lintText never throws on fuzzed input, for every kind', () => {
  const rand = mulberry32(0xc0ffee);
  const kinds = ['skill', 'claude-md', 'agents-md', 'markdown', undefined];
  for (let i = 0; i < 4000; i++) {
    const text = randomDoc(rand, 60);
    const kind = kinds[i % kinds.length];
    assert.doesNotThrow(() => lintText(text, { kind, path: 'f/SKILL.md' }), `iteration ${i}: ${JSON.stringify(text)}`);
  }
});

test('a diagnostic line/column is always a positive integer within bounds', () => {
  const rand = mulberry32(0xabcdef);
  for (let i = 0; i < 2000; i++) {
    const text = randomDoc(rand, 60);
    const { diagnostics, documents } = lintText(text, { kind: 'skill', path: 'f/SKILL.md' });
    const lineCount = documents[0].lines.length;
    for (const d of diagnostics) {
      assert.ok(Number.isInteger(d.line) && d.line >= 1, `bad line ${d.line}`);
      assert.ok(Number.isInteger(d.column) && d.column >= 1, `bad column ${d.column}`);
      assert.ok(d.line <= lineCount + 1, `line ${d.line} past end ${lineCount}`);
    }
  }
});

test('editDistance is a metric: identity, symmetry, and bounded', () => {
  const rand = mulberry32(0x1234);
  const word = () => {
    const n = Math.floor(rand() * 8);
    let s = '';
    for (let i = 0; i < n; i++) s += 'abcde'[Math.floor(rand() * 5)];
    return s;
  };
  for (let i = 0; i < 3000; i++) {
    const a = word();
    const b = word();
    assert.equal(editDistance(a, a), 0, 'identity');
    assert.equal(editDistance(a, b), editDistance(b, a), 'symmetry');
    const d = editDistance(a, b);
    assert.ok(d <= Math.max(a.length, b.length), 'bounded by longer length');
    assert.ok(d >= Math.abs(a.length - b.length), 'bounded below by length delta');
  }
});

test('isKebabCase accepts generated kebab names and rejects injected bad chars', () => {
  const rand = mulberry32(0x9);
  const kebabWord = () => {
    const n = 1 + Math.floor(rand() * 5);
    let s = '';
    for (let i = 0; i < n; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(rand() * 36)];
    return s;
  };
  for (let i = 0; i < 2000; i++) {
    const parts = 1 + Math.floor(rand() * 4);
    const name = Array.from({ length: parts }, kebabWord).join('-');
    assert.ok(isKebabCase(name), `should accept ${name}`);
    // Inject an illegal character: uppercase, underscore, or space.
    const bad = name + '_X ';
    assert.ok(!isKebabCase(bad), `should reject ${bad}`);
  }
});
