import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'skillcheck.js');

function run(args, cwd) {
  return spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8', cwd });
}

/** Create a temp dir holding a single SKILL.md and return the dir path. */
function skillDir(name, body) {
  const root = mkdtempSync(join(tmpdir(), 'skillcheck-'));
  const dir = join(root, name);
  mkdirSync(dir);
  writeFileSync(join(dir, 'SKILL.md'), body);
  return { root, dir };
}

const WARN_ONLY = '---\nname: weak-trig\ndescription: Formats numbers into strings.\n---\n\nbody\n';
const ERROR_SKILL = '---\nname: Bad_Name\ndescription: Use when the user needs this here.\n---\n\nbody\n';

test('exits 0 and prints the all-clear on a clean directory', () => {
  const { root, dir } = skillDir('good-skill', '---\nname: good-skill\ndescription: Use when the user wants a good example here.\n---\n\nbody\n');
  try {
    const r = run([dir]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /no problems/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('exits 1 when an error is present', () => {
  const { root, dir } = skillDir('Bad_Name', ERROR_SKILL);
  try {
    const r = run([dir, '--quiet']);
    assert.equal(r.status, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--json emits valid JSON with ok, summary, and diagnostics', () => {
  const { root, dir } = skillDir('Bad_Name', ERROR_SKILL);
  try {
    const r = run([dir, '--json']);
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.ok, false);
    assert.ok('summary' in parsed && 'diagnostics' in parsed);
    assert.ok(parsed.diagnostics.some((d) => d.ruleId === 'name-format'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--max-warnings 0 exits non-zero when only warnings exist', () => {
  const { root, dir } = skillDir('weak-trig', WARN_ONLY);
  try {
    assert.equal(run([dir, '--quiet']).status, 0, 'warnings pass by default');
    assert.equal(run([dir, '--max-warnings', '0', '--quiet']).status, 1);
    assert.equal(run([dir, '--max-warnings', '9', '--quiet']).status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('no paths is a usage error (exit 2)', () => {
  const r = run([]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no paths given/);
});

test('an unknown flag is a usage error (exit 2)', () => {
  const r = run(['--nope', '.']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unknown option/);
});

test('--help and --version exit 0', () => {
  assert.equal(run(['--help']).status, 0);
  const v = run(['--version']);
  assert.equal(v.status, 0);
  assert.match(v.stdout, /skillcheck \d+\.\d+\.\d+/);
});
