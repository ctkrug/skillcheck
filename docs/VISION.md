# Skillcheck — Vision

## The problem

AI coding agents are steered by plain-text instruction files: `CLAUDE.md`,
`AGENTS.md`, and skill definitions (`SKILL.md` with YAML frontmatter). These files
have enormous leverage — they decide which tools fire, which skills activate, and
how the agent behaves — but they have **no compiler, no schema, and no linter**.

That means their failure modes are *silent*:

- A skill whose `name:` field has a typo, or is missing entirely, simply never
  registers. No error. The agent just quietly ignores it.
- Two skills that declare the same `name` shadow each other; only one wins, and
  which one is non-deterministic. You can't see this by reading either file.
- A `description` with no "use when…" trigger language never reliably fires,
  because the model has nothing concrete to match a request against.
- An over-long description gets truncated by the host, dropping exactly the
  trigger cues that mattered.

Every one of these costs a real debugging session that *starts* with "why isn't
the agent picking up my skill?" and ends, an hour later, at a one-character fix.
There is no feedback loop today. Skillcheck is that feedback loop.

## Who it's for

- **Agent authors** maintaining a `.claude/` (or `.agents/`) directory of skills
  and instruction files who want to know their config is actually wired up.
- **Teams** that want a CI gate so a broken skill never merges.
- **The curious** who want to paste a file into a web page and instantly see
  what a good validator thinks of it — no install.

## The core idea

Model the *real, semantic* failure modes of an emerging, loosely-specified file
format — not just "is this valid YAML." YAML validity is table stakes and misses
every bug above. Skillcheck encodes what actually breaks skills at runtime as a
set of small, independent rules, each producing a precise diagnostic with a line
number and a concrete fix hint.

One engine, two front-ends:

- A **Node CLI** for CI and pre-commit (`npx skillcheck .claude/skills`).
- A **hosted web validator** for zero-install, paste-and-check use.

They share the exact same pure-JavaScript engine, so they can never disagree
about what's valid — the demo you see on the web is literally the check that runs
in your pipeline.

## Key design decisions

1. **Zero runtime dependencies.** The engine is plain ES-module JavaScript with
   no third-party packages, so the *same files* run in Node and in the browser
   with no bundler magic. This is what makes "one engine, two front-ends" real
   rather than aspirational.
2. **Purpose-built frontmatter parser.** We don't pull in a YAML library. Skill
   frontmatter is a small subset, and general parsers discard the per-key line
   numbers we need for good diagnostics. A focused parser gives better error
   positions and keeps the dependency count at zero.
3. **Rules are data, not control flow.** Each rule is a small module in a
   registry. Adding a check is writing one file and appending to an array — the
   roadmap in `BACKLOG.md` is mostly "more rules," and the architecture is built
   to make that cheap.
4. **Document rules vs. project rules.** Some checks are per-file (missing
   fields); the highest-value one — name collisions — is inherently cross-file.
   The engine models both first-class.
5. **Diagnostics, never `print`.** Rules return structured `Diagnostic` objects;
   reporters render them. That separation is why the CLI, the JSON output, and
   the web validator all show the same results.

## What "v1 done" looks like

- The CLI lints a directory, groups results by file, and exits non-zero on
  errors — usable in CI today.
- The web validator loads the same engine, lets you paste or drop a file, and
  renders an annotated, line-referenced report with severities and fix hints.
- A rule set covering the documented failure modes: missing fields, unterminated
  frontmatter, name format + directory match, description quality (length +
  trigger language), and cross-file name collisions.
- The web page is a designed, self-contained static site deployable to a subpath
  (`apps.charliekrug.com/skillcheck`) — see `docs/DESIGN.md`.
- Green CI on Node 18/20/22, and Skillcheck lints its own example fixtures.

## Explicitly out of scope for v1

- Full YAML spec support (multi-line folded scalars, anchors, complex nesting).
- Auto-fixing files in place (we *suggest* fixes; we don't rewrite yet).
- Validating tool/permission semantics or MCP config — instruction files first.
- A plugin API for third-party rules (the registry is internal for now).
