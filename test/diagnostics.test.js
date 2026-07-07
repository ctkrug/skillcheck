import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diag, sortDiagnostics, summarize, SEVERITY } from '../src/diagnostics.js';

test('diag() rejects a missing ruleId', () => {
  assert.throws(() => diag({ severity: SEVERITY.ERROR, message: 'x' }), /requires a ruleId/);
});

test('diag() rejects an unknown severity so a rule cannot emit garbage', () => {
  assert.throws(
    () => diag({ ruleId: 'r', severity: 'catastrophe', message: 'x' }),
    /unknown severity/,
  );
});

test('diag() fills sane defaults for optional fields', () => {
  const d = diag({ ruleId: 'r', severity: SEVERITY.INFO, message: 'x' });
  assert.equal(d.line, 1);
  assert.equal(d.column, 1);
  assert.equal(d.hint, '');
  assert.equal(d.file, '');
});

test('sortDiagnostics orders by file, then line, then column, then severity', () => {
  const mk = (file, line, column, severity) => diag({ ruleId: 'r', severity, message: 'm', file, line, column });
  const sorted = sortDiagnostics([
    mk('b.md', 1, 1, SEVERITY.ERROR),
    mk('a.md', 2, 1, SEVERITY.WARNING),
    mk('a.md', 1, 5, SEVERITY.INFO),
    mk('a.md', 1, 1, SEVERITY.WARNING),
    mk('a.md', 1, 1, SEVERITY.ERROR),
  ]);
  assert.deepEqual(
    sorted.map((d) => `${d.file}:${d.line}:${d.column}:${d.severity}`),
    ['a.md:1:1:error', 'a.md:1:1:warning', 'a.md:1:5:info', 'a.md:2:1:warning', 'b.md:1:1:error'],
  );
});

test('summarize counts each severity bucket', () => {
  const counts = summarize([
    diag({ ruleId: 'r', severity: SEVERITY.ERROR, message: 'm' }),
    diag({ ruleId: 'r', severity: SEVERITY.WARNING, message: 'm' }),
    diag({ ruleId: 'r', severity: SEVERITY.WARNING, message: 'm' }),
    diag({ ruleId: 'r', severity: SEVERITY.INFO, message: 'm' }),
  ]);
  assert.deepEqual(counts, { errors: 1, warnings: 2, infos: 1 });
});
