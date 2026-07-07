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

test('--max-warnings with no value is a usage error (exit 2)', () => {
  const { root, dir } = skillDir('weak-trig', WARN_ONLY);
  try {
    // Trailing flag with nothing after it must not be silently ignored.
    const r = run([dir, '--max-warnings']);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /max-warnings/);
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

test('--init scaffolds a skill that then lints clean', () => {
  const root = mkdtempSync(join(tmpdir(), 'skillcheck-'));
  try {
    const created = run(['--init', 'demo-tool'], root);
    assert.equal(created.status, 0);
    assert.match(created.stdout, /created/);
    // The freshly scaffolded skill passes every rule.
    const linted = run(['demo-tool'], root);
    assert.equal(linted.status, 0);
    assert.match(linted.stdout, /no problems/);
    // A second init refuses to overwrite.
    assert.equal(run(['--init', 'demo-tool'], root).status, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('walking a directory skips node_modules and .git', () => {
  const root = mkdtempSync(join(tmpdir(), 'skillcheck-'));
  try {
    mkdirSync(join(root, 'good-skill'));
    writeFileSync(join(root, 'good-skill', 'SKILL.md'),
      '---\nname: good-skill\ndescription: Use when the user wants a good example here.\n---\n');
    // A broken skill buried in node_modules must NOT be linted.
    mkdirSync(join(root, 'node_modules', 'pkg'), { recursive: true });
    writeFileSync(join(root, 'node_modules', 'pkg', 'SKILL.md'), '---\nname: Bad_Name\ndescription: x\n---\n');
    const r = run([root]);
    assert.equal(r.status, 0, 'only the top-level skill is linted');
    assert.match(r.stdout, /no problems/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a missing --config file is a usage error (exit 2)', () => {
  const { root, dir } = skillDir('weak-trig', WARN_ONLY);
  try {
    const r = run([dir, '--config', join(root, 'nope.json')]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /config file not found/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a malformed --config JSON file is a usage error (exit 2)', () => {
  const { root, dir } = skillDir('weak-trig', WARN_ONLY);
  try {
    const cfg = join(root, 'bad.json');
    writeFileSync(cfg, '{ not valid json');
    const r = run([dir, '--config', cfg]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /not valid JSON/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('an auto-discovered skillcheck.json in cwd applies, and --no-config ignores it', () => {
  const { root, dir } = skillDir('weak-trig', WARN_ONLY);
  try {
    // A config in the working directory that turns the lone warning off.
    writeFileSync(join(root, 'skillcheck.json'), '{"rules":{"weak-trigger":"off"}}');
    // Run with cwd = root so findConfig() discovers it; gate on warnings.
    assert.equal(run(['weak-trig', '--max-warnings', '0', '--quiet'], root).status, 0, 'config suppresses the warning');
    assert.equal(run(['weak-trig', '--max-warnings', '0', '--quiet', '--no-config'], root).status, 1, '--no-config restores it');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--help and --version exit 0', () => {
  assert.equal(run(['--help']).status, 0);
  const v = run(['--version']);
  assert.equal(v.status, 0);
  assert.match(v.stdout, /skillcheck \d+\.\d+\.\d+/);
});
