import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skillTemplate } from '../src/scaffold.js';
import { lintText } from '../src/lint.js';

test('the default template lints clean', () => {
  const text = skillTemplate('my-skill');
  const result = lintText(text, { path: 'my-skill/SKILL.md' });
  assert.equal(result.diagnostics.length, 0, JSON.stringify(result.diagnostics, null, 2));
  assert.equal(result.ok, true);
});

test('a named template lints clean and uses the given name', () => {
  const text = skillTemplate('deep-research');
  assert.match(text, /name: deep-research/);
  assert.match(text, /# Deep Research/);
  const result = lintText(text, { path: 'deep-research/SKILL.md' });
  assert.equal(result.diagnostics.length, 0);
});

test('a non-kebab template name throws', () => {
  assert.throws(() => skillTemplate('Not_Kebab'), /must be kebab-case/);
});
