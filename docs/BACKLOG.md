# Skillcheck — Backlog

Epic/story breakdown for the build. Each story has verifiable acceptance criteria
a later run can confirm true/false. Mark `[x]` when all criteria pass.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done.

---

## Epic 1 — The web validator (the wow moment)

The demo everyone sees first: paste a skill file, watch it get annotated live by
the same engine that runs in CI.

- [x] **1.1 — Paste-and-validate hero (WOW MOMENT).** A hosted page with a
  two-pane drafting table: paste/drop a file on the left, get a live annotated
  report on the right, powered by the real `src/lint.js`.
  - AC1: Loading the page and pasting `examples/broken-skill/SKILL.md` renders
    the `name-format` error and both warnings, each with its line number. ✅
  - AC2: The report updates within ~200ms of editing, with no page reload and no
    server call (engine runs in-browser). ✅
  - AC3: A clean file (`examples/good-skill` in isolation) shows the "PASSED"
    state, not a blank panel. ✅

- [x] **1.2 — Load-an-example picker.** Themed control that loads bundled example
  files into the editor.
  - AC1: The picker lists at least "clean", "broken names", and "collision" and
    loading one populates the editor and report. ✅
  - AC2: The `<select>` is fully themed (no naked native widget). ✅

- [x] **1.3 — Multi-file / collision mode.** Let the page validate more than one
  document so the cross-file `duplicate-name` rule can fire in the browser.
  - AC1: Loading the collision example set produces a `duplicate-name` error
    referencing the other file. ✅
  - AC2: Switching between files preserves each file's content. ✅

- [x] **1.4 — Static build + relative paths.** `npm run build` emits a
  self-contained site to `site/` using only relative asset paths.
  - AC1: `npm run build` produces `site/index.html` plus assets and a copied
    engine; opening `site/index.html` works with no server. ✅
  - AC2: No asset URL begins with `/` (deployable under a subpath). ✅

- [x] **1.5 — Design polish (per D1–D4).** Execute `docs/DESIGN.md`: blueprint
  paper aesthetic, fonts, title-block stamp, favicon, interaction states.
  - AC1: Favicon is a custom inline-SVG (not the default globe); both fonts load. ✅
  - AC2: Page is composed with no horizontal scroll at 390 / 768 / 1440px. ✅
  - AC3: The title-block status stamp shows PASSED/REVISE per result; every
    control has hover + focus-visible states. ✅

---

## Epic 2 — The rule engine (correctness & depth)

Deepen the checks so Skillcheck models the format's real failure modes, not a
toy subset.

- [x] **2.1 — Core rules v1.** missing-field, name-format, description-quality,
  duplicate-name.
  - AC1: `npm test` passes with a rule test per check. ✅
  - AC2: `node bin/skillcheck.js examples` reports the seeded problems. ✅

- [x] **2.2 — Multi-line description parsing.** Support YAML folded/block scalars
  (`>` / `|` and indented continuations) so length/trigger checks see the whole
  description.
  - AC1: A description written across 3 indented lines is parsed as one string. ✅
  - AC2: Its length is measured across all lines (over-long is detected). ✅

- [x] **2.3 — Unresolved skill-reference rule.** Flag `/skill-name` mentions in a
  description/body that resolve to no known skill in the linted set.
  - AC1: A description referencing `/does-not-exist` warns; one referencing a
    present skill does not. ✅
  - AC2: The rule only runs when more than one document is linted (needs context). ✅

- [x] **2.4 — Reserved / duplicate-key rules.** Detect duplicate frontmatter keys
  and unknown top-level keys for skills.
  - AC1: A frontmatter with two `name:` lines errors on the second. ✅
  - AC2: An unknown key like `nmae:` (typo of a required key) warns with a hint. ✅

- [x] **2.5 — Config + rule toggles.** A `skillcheck.json` (or flags) to disable
  rules or set severity.
  - AC1: Disabling `weak-trigger` suppresses only that rule. ✅
  - AC2: An unknown rule id in config produces a clear error, not a crash. ✅

---

## Epic 3 — CLI ergonomics & CI adoption

Make it pleasant to run locally and trivial to gate a repo on.

- [x] **3.1 — CLI with exit codes + reporters.** pretty + json output, exit 1 on
  error / 2 on usage.
  - AC1: `--json` emits valid JSON with `ok`, `summary`, `diagnostics`. ✅
  - AC2: Errors exit 1; a clean run exits 0. ✅

- [x] **3.2 — `--max-warnings` and severity gating.** Let CI fail on warnings too.
  - AC1: `--max-warnings 0` exits non-zero when warnings exist. ✅
  - AC2: Default behavior (warnings allowed) is unchanged. ✅

- [x] **3.3 — Ready-to-copy CI + pre-commit recipes.** Document a GitHub Action
  step and a pre-commit hook using the CLI.
  - AC1: README/docs contain a copy-pasteable Actions step invoking skillcheck. ✅
  - AC2: The documented command runs against this repo's own examples in CI. ✅

- [x] **3.4 — `--init` scaffolder.** Emit a starter `SKILL.md` that passes
  Skillcheck clean.
  - AC1: `skillcheck --init` writes a template; linting it yields zero problems. ✅

---

## Definition of done (v1)

All Epic 1 stories `[x]`, Epic 2 through 2.4 `[x]`, Epic 3 through 3.3 `[x]`; CI
green on Node 18/20/22; the hosted page deployable to a subpath; Skillcheck lints
its own fixtures clean where expected.
