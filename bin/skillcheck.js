#!/usr/bin/env node
// Skillcheck CLI. Lints instruction files and exits non-zero when errors are
// found, so it drops straight into CI or a pre-commit hook.

import { lintPaths } from '../src/index.js';
import { renderPretty } from '../src/reporters/pretty.js';
import { renderJson } from '../src/reporters/json.js';

const HELP = `skillcheck — lint AI-agent instruction files

Usage:
  skillcheck [options] <path...>

Arguments:
  path            file or directory to lint (directories are walked for
                  SKILL.md, CLAUDE.md, and AGENTS.md)

Options:
  --json          emit machine-readable JSON instead of the text report
  --quiet         suppress output; rely on the exit code
  -h, --help      show this help
  -v, --version   print the version

Exit codes:
  0  no errors (warnings allowed)
  1  one or more errors
  2  usage error
`;

function parseArgs(argv) {
  const opts = { json: false, quiet: false, paths: [] };
  for (const arg of argv) {
    if (arg === '--json') opts.json = true;
    else if (arg === '--quiet') opts.quiet = true;
    else if (arg === '-h' || arg === '--help') opts.help = true;
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
  if (opts.paths.length === 0) {
    process.stderr.write(`no paths given\n\n${HELP}`);
    return 2;
  }

  let result;
  try {
    result = lintPaths(opts.paths);
  } catch (err) {
    process.stderr.write(`skillcheck: ${err.message}\n`);
    return 2;
  }

  if (!opts.quiet) {
    const out = opts.json ? renderJson(result) : renderPretty(result);
    process.stdout.write(out + '\n');
  }
  return result.ok ? 0 : 1;
}

process.exit(main());
