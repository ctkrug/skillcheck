#!/usr/bin/env node
// Skillcheck CLI. Lints instruction files and exits non-zero when errors are
// found, so it drops straight into CI or a pre-commit hook.

import { lintPaths, loadConfig, findConfig, initSkill } from '../src/index.js';
import { renderPretty } from '../src/reporters/pretty.js';
import { renderJson } from '../src/reporters/json.js';

const HELP = `skillcheck — lint AI-agent instruction files

Usage:
  skillcheck [options] <path...>

Arguments:
  path            file or directory to lint (directories are walked for
                  SKILL.md, CLAUDE.md, and AGENTS.md)

  skillcheck --init [name]     scaffold a lint-clean starter skill

Options:
  --init [name]   write a starter <name>/SKILL.md (default name: my-skill)
  --json          emit machine-readable JSON instead of the text report
  --quiet         suppress output; rely on the exit code
  --config <path> use this config file (default: ./skillcheck.json if present)
  --no-config     ignore any skillcheck.json (run with default rule severities)
  --max-warnings <n>  exit non-zero if more than n warnings are found
  -h, --help      show this help
  -v, --version   print the version

Exit codes:
  0  no errors (warnings allowed)
  1  one or more errors
  2  usage error
`;

function parseArgs(argv) {
  const opts = {
    json: false,
    quiet: false,
    paths: [],
    config: undefined,
    noConfig: false,
    maxWarnings: Infinity,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--init') opts.init = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--quiet') opts.quiet = true;
    else if (arg === '--no-config') opts.noConfig = true;
    else if (arg === '--config') {
      opts.config = argv[++i];
      if (opts.config === undefined) opts.missingValue = '--config';
    } else if (arg.startsWith('--config=')) opts.config = arg.slice('--config='.length);
    else if (arg === '--max-warnings' || arg.startsWith('--max-warnings=')) {
      const raw = arg.includes('=') ? arg.slice('--max-warnings='.length) : argv[++i];
      const n = Number(raw);
      if (raw === undefined || !Number.isInteger(n) || n < 0) opts.badMaxWarnings = raw;
      else opts.maxWarnings = n;
    } else if (arg === '-h' || arg === '--help') opts.help = true;
    else if (arg === '-v' || arg === '--version') opts.version = true;
    else if (arg.startsWith('-')) opts.unknown = arg;
    else opts.paths.push(arg);
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (opts.version) {
    process.stdout.write('skillcheck 0.1.0\n');
    return 0;
  }
  if (opts.unknown) {
    process.stderr.write(`unknown option: ${opts.unknown}\n\n${HELP}`);
    return 2;
  }
  if (opts.missingValue) {
    process.stderr.write(`${opts.missingValue} requires a file path\n\n${HELP}`);
    return 2;
  }
  if (opts.badMaxWarnings !== undefined) {
    process.stderr.write(`--max-warnings expects a non-negative integer\n\n${HELP}`);
    return 2;
  }

  if (opts.init) {
    const name = opts.paths[0] || 'my-skill';
    try {
      const file = initSkill(name);
      process.stdout.write(`created ${file}\nRun \`skillcheck ${name}\` to lint it.\n`);
      return 0;
    } catch (err) {
      process.stderr.write(`skillcheck: ${err.message}\n`);
      return 2;
    }
  }

  if (opts.paths.length === 0) {
    process.stderr.write(`no paths given\n\n${HELP}`);
    return 2;
  }

  let config;
  try {
    const configPath = opts.noConfig ? null : opts.config || findConfig();
    if (configPath) config = loadConfig(configPath);
  } catch (err) {
    process.stderr.write(`skillcheck: ${err.message}\n`);
    return 2;
  }

  let result;
  try {
    result = lintPaths(opts.paths, { config });
  } catch (err) {
    process.stderr.write(`skillcheck: ${err.message}\n`);
    return 2;
  }

  if (!opts.quiet) {
    const out = opts.json ? renderJson(result) : renderPretty(result);
    process.stdout.write(out + '\n');
  }

  if (!result.ok) return 1;
  if (result.summary.warnings > opts.maxWarnings) {
    if (!opts.quiet) {
      process.stderr.write(
        `skillcheck: ${result.summary.warnings} warning(s) exceed --max-warnings ${opts.maxWarnings}\n`,
      );
    }
    return 1;
  }
  return 0;
}

process.exit(main());
