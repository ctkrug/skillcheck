import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument, _internal } from '../src/parser.js';

test('parses a closed frontmatter block with line numbers', () => {
  const doc = parseDocument('---\nname: foo\ndescription: bar\n---\nbody\n', {
    path: 'a/SKILL.md',
  });
  assert.equal(doc.kind, 'skill');
  assert.equal(doc.frontmatter.present, true);
  assert.equal(doc.frontmatter.closed, true);
  assert.equal(doc.frontmatter.fields.name.value, 'foo');
  assert.equal(doc.frontmatter.fields.name.line, 2);
  assert.equal(doc.frontmatter.fields.description.line, 3);
  assert.equal(doc.body.trim(), 'body');
});

test('detects an unterminated frontmatter block', () => {
  const doc = parseDocument('---\nname: foo\n', { path: 'x/SKILL.md' });
  assert.equal(doc.frontmatter.present, true);
  assert.equal(doc.frontmatter.closed, false);
});

test('treats a file with no frontmatter as markdown', () => {
  const doc = parseDocument('# Just a heading\n');
  assert.equal(doc.frontmatter.present, false);
  assert.equal(doc.kind, 'markdown');
});

test('parses a one-level nested metadata map', () => {
  const doc = parseDocument('---\nname: foo\nmetadata:\n  type: reference\n---\n');
  assert.equal(doc.frontmatter.maps.metadata.type.value, 'reference');
  assert.equal(doc.frontmatter.maps.metadata.type.line, 4);
});

test('filename drives kind detection over shape', () => {
  const claude = parseDocument('# notes\n', { path: 'repo/CLAUDE.md' });
  assert.equal(claude.kind, 'claude-md');
  const agents = parseDocument('# notes\n', { path: 'repo/AGENTS.md' });
  assert.equal(agents.kind, 'agents-md');
});

test('parseScalar handles quotes, numbers, and booleans', () => {
  const { parseScalar } = _internal;
  assert.equal(parseScalar('"quoted"'), 'quoted');
  assert.equal(parseScalar("'single'"), 'single');
  assert.equal(parseScalar('42'), 42);
  assert.equal(parseScalar('true'), true);
  assert.equal(parseScalar('null'), null);
  assert.equal(parseScalar('plain text'), 'plain text');
});

test('normalizes CRLF line endings', () => {
  const doc = parseDocument('---\r\nname: foo\r\n---\r\n');
  assert.equal(doc.frontmatter.fields.name.value, 'foo');
  assert.equal(doc.frontmatter.closed, true);
});

test('parses a block scalar (|) preserving newlines', () => {
  const doc = parseDocument(
    '---\nname: foo\ndescription: |\n  line one\n  line two\n  line three\n---\n',
  );
  assert.equal(doc.frontmatter.fields.description.value, 'line one\nline two\nline three');
});

test('parses a folded scalar (>) joining lines with spaces', () => {
  const doc = parseDocument(
    '---\nname: foo\ndescription: >\n  use when the user\n  wants one string\n---\n',
  );
  assert.equal(doc.frontmatter.fields.description.value, 'use when the user wants one string');
});

test('folds a plain scalar across indented continuation lines', () => {
  const doc = parseDocument(
    '---\nname: foo\ndescription: use when the user asks\n  and it keeps going\n  onto a third line\n---\n',
  );
  assert.equal(
    doc.frontmatter.fields.description.value,
    'use when the user asks and it keeps going onto a third line',
  );
});

test('a block scalar does not swallow the following top-level key', () => {
  const doc = parseDocument(
    '---\nname: foo\ndescription: |\n  multi\n  line\nmetadata:\n  type: reference\n---\n',
  );
  assert.equal(doc.frontmatter.fields.description.value, 'multi\nline');
  assert.equal(doc.frontmatter.maps.metadata.type.value, 'reference');
});

test('records a repeated top-level key as a duplicate, keeping the first', () => {
  const doc = parseDocument('---\nname: first\nname: second\ndescription: x\n---\n');
  assert.equal(doc.frontmatter.fields.name.value, 'first');
  assert.equal(doc.frontmatter.duplicates.length, 1);
  assert.equal(doc.frontmatter.duplicates[0].key, 'name');
  assert.equal(doc.frontmatter.duplicates[0].line, 3);
  assert.equal(doc.frontmatter.duplicates[0].firstLine, 2);
});

test('ignores a non-key line inside frontmatter and keeps parsing after it', () => {
  const doc = parseDocument('---\nname: foo\njust some prose without a colon\ndescription: bar\n---\n');
  assert.equal(doc.frontmatter.fields.name.value, 'foo');
  assert.equal(doc.frontmatter.fields.description.value, 'bar');
});

test('does not throw when a duplicate key re-opens as a nested map', () => {
  // A scalar key repeated as a bare map header (`name:` then indented children)
  // must not crash: the parser contract is never-throw on malformed input.
  const doc = parseDocument('---\nname: foo\nname:\n  bar: baz\n---\n');
  assert.equal(doc.frontmatter.fields.name.value, 'foo');
  assert.equal(doc.frontmatter.duplicates.length, 1);
  assert.equal(doc.frontmatter.duplicates[0].key, 'name');
});
