# Skillcheck

**A linter and web validator for AI-agent instruction files.**

Skillcheck reads the files that steer coding agents — `CLAUDE.md`, `AGENTS.md`,
and skill frontmatter (`SKILL.md`) — and catches the failure modes that make them
*silently* stop working: broken triggers, missing frontmatter fields, and
skill-name collisions. These files have no compiler and no schema, so a typo in a
`name:` field or two skills claiming the same slug just... does nothing. No error,
no warning — the agent quietly ignores half of what you wrote.

Skillcheck is the missing feedback loop.

```
$ npx skillcheck .claude/skills

  .claude/skills/deep-research/SKILL.md
    error  4:1   missing-field        skill frontmatter is missing required key `name`
    warn   6:14  description-too-long  description is 1180 chars (limit 1024)

  .claude/skills/pdf/SKILL.md
    error  2:9   duplicate-name       skill name `research` also declared in deep-research/SKILL.md

  2 errors, 1 warning across 2 files
```

## Why this exists

The `CLAUDE.md` / `AGENTS.md` / skill-frontmatter format is **emerging and
loosely specified**. There is no official validator, so the real failure modes —
the ones that cost you a debugging session because "the agent isn't picking up my
skill" — are invisible until they bite. Modeling those failure modes correctly
(not just "is this valid YAML") is the whole point.

## What it checks

- **Missing frontmatter fields** — a skill with no `name` or `description`, or an
  unterminated `---` block, never loads; Skillcheck flags it as an error.
- **Skill-name collisions** — two skills declaring the same `name` shadow each
  other; only one wins and it's non-deterministic.
- **Duplicate / typo'd keys** — a repeated `name:` (YAML silently keeps one) or a
  near-miss like `nmae:` that leaves the real field absent.
- **Trigger quality** — a `description` with no "use when…" guidance won't
  reliably fire; Skillcheck warns.
- **Naming rules** — `name` must be kebab-case and (for skills) match its
  directory, or the runtime can't resolve it.
- **Length limits** — over-long descriptions get truncated by the model host;
  measured across multi-line (`|` / `>`) descriptions.
- **Dead skill references** — a `/skill-name` mention in prose that resolves to no
  skill in the set.

Every check is [configurable](docs/RULES.md#configuring-rules) via a
`skillcheck.json` — disable a rule or change its severity. See the full
[rule reference](docs/RULES.md), [`docs/VISION.md`](docs/VISION.md) for the
problem framing, and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the
codebase map.

## Two front-ends, one engine

- **CLI** — `npx skillcheck <path>` lints a repo in CI or pre-commit.
- **Web validator** — paste a file into the hosted page and get an annotated,
  line-by-line report instantly. Same rule engine, no install.

Both call the exact same pure-JavaScript engine in [`src/`](src/), so the CLI and
the website never disagree about what's valid.

## Quick start

```bash
git clone https://github.com/ctkrug/skillcheck
cd skillcheck
node bin/skillcheck.js examples        # lint the bundled examples
node bin/skillcheck.js --init my-skill # scaffold a lint-clean starter skill
npm test                               # run the test suite
```

No dependencies to install — the engine is stdlib-only Node ESM.

Handy flags: `--json` (machine-readable output), `--max-warnings <n>` (fail CI on
warnings too), `--config <path>` / `--no-config`, `--init [name]`.

## Use it in CI

Gate every merge on a valid skill set. Add this step to a GitHub Actions
workflow — it fails the job the moment a skill breaks:

```yaml
- name: Lint agent instruction files
  run: npx skillcheck .claude/skills
```

Fail on warnings too (e.g. weak triggers), not just errors:

```yaml
- run: npx skillcheck --max-warnings 0 .claude/skills
```

### Pre-commit hook

Catch problems before they land. Save this as `.git/hooks/pre-commit` (and
`chmod +x` it), or wire the command into your pre-commit framework of choice:

```bash
#!/bin/sh
# Block a commit that breaks any agent instruction file.
npx skillcheck .claude/skills || {
  echo "skillcheck found problems — fix them or commit with --no-verify" >&2
  exit 1
}
```

Point it at whatever directory holds your `SKILL.md` / `CLAUDE.md` /
`AGENTS.md` files. Drop a [`skillcheck.json`](docs/RULES.md#configuring-rules)
beside it to tune which rules gate.

## Stack

- **Engine:** plain ES-module JavaScript, zero runtime dependencies (so it runs
  unchanged in Node and in the browser).
- **CLI:** Node 18+, `node:test` for tests.
- **Web validator:** static, self-contained site — relative asset paths, no
  server, deployable to any subpath.

## License

MIT © Charlie Krug — see [`LICENSE`](LICENSE).
