---
title: "I built a linter for the files that steer coding agents"
published: false
tags: ai, javascript, tooling, opensource
---

If you have written a `CLAUDE.md`, an `AGENTS.md`, or a `SKILL.md`, you have used
a config format with no compiler and no schema. That combination is unusual, and
it bites in a specific way: when you get one of these files wrong, nothing tells
you. The agent just quietly ignores the part you fumbled.

I lost an afternoon to exactly this. A skill I had written was not firing. The
file looked fine. It turned out two skills in the repo declared the same `name`,
so one silently shadowed the other, and which one won was not deterministic. No
error, no warning, no log line. That is the moment I decided to build
[Skillcheck](https://apps.charliekrug.com/skillcheck/): a linter for agent
instruction files that catches these silent failures before they ship.

## Model the failure, not the syntax

The easy version of this tool is a YAML validator. That version is close to
useless, because almost every broken skill file is still valid YAML. `name: ~`
parses fine; it just resolves to null and the skill never registers. A repeated
`name:` key parses fine; YAML keeps the last one and drops the first without a
word. Two files sharing a name each parse fine on their own.

So the rules had to model runtime behavior, not grammar. The highest-value check,
name collision, is a cross-file rule: it can only be judged by looking at every
skill in the set at once. Others are per-document: kebab-case names, a name that
matches its directory, a description with actual "use when..." trigger language,
length limits that mirror what model hosts truncate. Each rule returns structured
diagnostics with a line, a column, and a fix hint. None of them print; reporters
decide how to render.

## Why I wrote my own frontmatter parser

The interesting technical decision was refusing to pull in a YAML library.

Two reasons. First, diagnostics need per-key line and column numbers, and most
YAML parsers throw that away once they hand you an object. Second, I wanted the
exact same engine to run in the CLI and in the browser, which means zero runtime
dependencies. So I wrote a focused parser for the small subset skill frontmatter
actually uses: scalar keys, quoted strings, block and folded (`|` / `>`) scalars,
and a one-level `metadata:` map. It tracks the line of every key and records
duplicates instead of silently collapsing them.

The parser has one hard contract: it never throws. Malformed input is not an edge
case here, it is the entire job. I pinned that contract with a seeded
property/fuzz suite that throws thousands of mangled documents at it. That suite
caught a real crash: a duplicate key that reopened as a nested map walked into an
undefined branch and threw, which in the browser would have wedged the whole UI.

## One engine, two front-ends

The CLI reads files and prints a colorized report. The web validator lets you
paste a file and see an annotated, line-by-line result, with each open tab
treated as one document in the set so the cross-file rules fire live. Both call
the same pure module. The build step for the site is deliberately boring: it
walks `src/`, copies every browser-safe module, and skips a small denylist of
Node-only files. A new rule ships to the browser with no build edit and no chance
of the two front-ends disagreeing about what is valid.

## What I would do differently

The rule set is intentionally small and opinionated for v1. The next thing I want
is a config preset system so a team can share one ruleset across repos, rather
than copying a `skillcheck.json` around. I would also like an editor extension
that surfaces the same diagnostics inline while you type the file.

The engine is stdlib-only Node ESM, MIT licensed, and about 99 percent covered by
tests. Try the browser validator at
[apps.charliekrug.com/skillcheck](https://apps.charliekrug.com/skillcheck/) or
read the code at
[github.com/ctkrug/skillcheck](https://github.com/ctkrug/skillcheck). If you run
coding agents from a shared repo, drop `npx skillcheck .claude/skills` into CI and
let a bad instruction file fail the build instead of your agent.
