import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintText } from '../src/lint.js';
import { normalizeConfig, applyConfig } from '../src/config.js';

const ids = (result) => result.diagnostics.map((d) => d.ruleId);

// A skill whose description says what it does but not when — trips weak-trigger.
const weakSkill = '---\nname: demo-skill\ndescription: Formats numbers into strings.\n---\n\nbody\n';

test('disabling a rule suppresses only that rule', () => {
  const base = lintText(weakSkill, { path: 'demo-skill/SKILL.md' });
  assert.ok(ids(base).includes('weak-trigger'));

  const off = lintText(weakSkill, {
    path: 'demo-skill/SKILL.md',
    config: { rules: { 'weak-trigger': 'off' } },
  });
  assert.ok(!ids(off).includes('weak-trigger'), 'weak-trigger should be gone');
});

test('a severity override changes the reported severity and the ok flag', () => {
  const bad = '---\nname: Bad_Name\ndescription: Use when the user needs this.\n---\n\nbody\n';
  const base = lintText(bad, { path: 'Bad_Name/SKILL.md' });
  assert.equal(base.ok, false, 'name-format error fails the run by default');

  const downgraded = lintText(bad, {
    path: 'Bad_Name/SKILL.md',
    config: { rules: { 'name-format': 'warning' } },
  });
  const nf = downgraded.diagnostics.find((d) => d.ruleId === 'name-format');
  assert.equal(nf.severity, 'warning');
  assert.equal(downgraded.ok, true, 'no errors remain once downgraded');
});

test('an unknown rule id in config throws a clear error', () => {
  assert.throws(
    () => normalizeConfig({ rules: { 'no-such-rule': 'off' } }),
    /unknown rule id in config: "no-such-rule"/,
  );
});

test('a non-object `rules` value throws a clear error', () => {
  // A malformed skillcheck.json (`{"rules": "everything"}`) must fail loudly.
  assert.throws(
    () => normalizeConfig({ rules: 'everything' }),
    /`rules` must be an object/,
  );
});

test('an invalid severity value throws', () => {
  assert.throws(
    () => normalizeConfig({ rules: { 'weak-trigger': 'loud' } }),
    /invalid setting for rule "weak-trigger"/,
  );
});

test('normalizeConfig tolerates an absent or empty config', () => {
  assert.deepEqual(normalizeConfig(undefined), { rules: {} });
  assert.deepEqual(normalizeConfig({}), { rules: {} });
  assert.deepEqual(normalizeConfig({ rules: {} }), { rules: {} });
});

test('applyConfig does not mutate its input diagnostics', () => {
  const input = [{ ruleId: 'weak-trigger', severity: 'warning', message: 'x', line: 1, column: 1 }];
  const out = applyConfig(input, normalizeConfig({ rules: { 'weak-trigger': 'error' } }));
  assert.equal(input[0].severity, 'warning', 'original untouched');
  assert.equal(out[0].severity, 'error', 'copy overridden');
});
