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
