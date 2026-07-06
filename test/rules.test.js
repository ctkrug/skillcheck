import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintText, lintSources } from '../src/lint.js';

const ids = (result) => result.diagnostics.map((d) => d.ruleId);

function skill({ name = 'demo-skill', description = 'Does a thing. Use when you need a thing.', extra = '' } = {}) {
  return `---\nname: ${name}\ndescription: ${description}\n${extra}---\n\nbody\n`;
}

test('a well-formed skill produces no diagnostics', () => {
  const result = lintText(skill(), { path: 'demo-skill/SKILL.md' });
  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.ok, true);
});

test('missing name and description are errors', () => {
  const result = lintText('---\nmetadata:\n  type: reference\n---\n', {
    path: 'x/SKILL.md',
  });
  assert.ok(ids(result).includes('missing-field'));
  assert.equal(result.summary.errors >= 2, true);
  assert.equal(result.ok, false);
});

test('a non-kebab name is an error', () => {
  const result = lintText(skill({ name: 'Bad_Name' }), { path: 'Bad_Name/SKILL.md' });
  assert.ok(ids(result).includes('name-format'));
  const nameDiag = result.diagnostics.find((d) => d.ruleId === 'name-format');
  assert.equal(nameDiag.severity, 'error');
});

test('a name/directory mismatch is a warning', () => {
  const result = lintText(skill({ name: 'demo-skill' }), { path: 'other-dir/SKILL.md' });
  const mismatch = result.diagnostics.find(
    (d) => d.ruleId === 'name-format' && d.severity === 'warning',
  );
  assert.ok(mismatch, 'expected a name/directory mismatch warning');
});

test('a description with no trigger language warns', () => {
  const result = lintText(skill({ description: 'Formats numbers into strings quickly' }), {
    path: 'demo-skill/SKILL.md',
  });
  assert.ok(ids(result).includes('weak-trigger'));
});

test('an over-long description warns', () => {
  const long = 'Use when '.padEnd(1100, 'x');
  const result = lintText(skill({ description: long }), { path: 'demo-skill/SKILL.md' });
  assert.ok(ids(result).includes('description-too-long'));
});

test('an unterminated frontmatter block is an error', () => {
  const result = lintText('---\nname: demo-skill\ndescription: Use when needed here.\n', {
    path: 'demo-skill/SKILL.md',
  });
  assert.ok(ids(result).includes('missing-field'));
});

test('duplicate skill names collide across files', () => {
  const result = lintSources([
    { path: 'a/SKILL.md', text: skill({ name: 'shared' }) },
    { path: 'b/SKILL.md', text: skill({ name: 'shared' }) },
  ]);
  const dups = result.diagnostics.filter((d) => d.ruleId === 'duplicate-name');
  assert.equal(dups.length, 2, 'both files should be flagged');
  assert.equal(dups.every((d) => d.severity === 'error'), true);
});

test('distinct names do not collide', () => {
  const result = lintSources([
    { path: 'a/SKILL.md', text: skill({ name: 'alpha-skill' }) },
    { path: 'b/SKILL.md', text: skill({ name: 'beta-skill' }) },
  ]);
  assert.equal(result.diagnostics.filter((d) => d.ruleId === 'duplicate-name').length, 0);
});
