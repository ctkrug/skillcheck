import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPretty } from '../src/reporters/pretty.js';
import { renderJson } from '../src/reporters/json.js';
import { lintText } from '../src/lint.js';

// Under `node --test`, stdout is not a TTY, so the pretty reporter emits plain
// text (no ANSI). That lets us assert on the exact human-facing output.

test('renderPretty shows the all-clear line when there are no problems', () => {
  const clean = lintText('---\nname: demo-skill\ndescription: Use when the user wants a demo.\n---\n', {
    path: 'demo-skill/SKILL.md',
  });
  const out = renderPretty(clean);
  assert.match(out, /no problems found/);
});

test('renderPretty groups diagnostics under their file with a summary', () => {
  const bad = lintText('---\nname: Bad_Name\ndescription: too terse\n---\n', {
    path: 'Bad_Name/SKILL.md',
  });
  const out = renderPretty(bad);
  assert.match(out, /Bad_Name\/SKILL\.md/, 'file header present');
  assert.match(out, /name-format/, 'rule id shown');
  assert.match(out, /error/, 'severity label shown');
  // Summary line pluralizes correctly.
  assert.match(out, /\d+ error/);
});

test('renderPretty singularizes a lone warning', () => {
  const warn = lintText('---\nname: demo-skill\ndescription: Formats numbers into strings.\n---\n', {
    path: 'demo-skill/SKILL.md',
  });
  const out = renderPretty(warn);
  assert.match(out, /1 warning\b/);
  assert.doesNotMatch(out, /1 warnings/);
});

test('renderJson round-trips ok, summary, and diagnostics', () => {
  const bad = lintText('---\nname: Bad_Name\ndescription: too terse\n---\n', {
    path: 'Bad_Name/SKILL.md',
  });
  const parsed = JSON.parse(renderJson(bad));
  assert.equal(parsed.ok, false);
  assert.equal(typeof parsed.summary.errors, 'number');
  assert.ok(Array.isArray(parsed.diagnostics));
  assert.ok(parsed.diagnostics.every((d) => 'ruleId' in d && 'severity' in d));
});
