# Skillcheck — Rule Reference

Every diagnostic Skillcheck emits carries a stable `ruleId`. This is the catalog.
Severity is the default; a `skillcheck.json` config lets you override per rule
(see [Configuring rules](#configuring-rules)).

| Rule ID | Default | Applies to | What it catches |
| --- | --- | --- | --- |
| `missing-field` | error | skill | No `name`/`description`, or an unterminated `---` block. The skill never loads. |
| `name-format` | error / warn | skill | `name` isn't kebab-case (error); `name` doesn't match its directory (warning). |
| `weak-trigger` | warning | skill | `description` has no "use when…" trigger language, so it won't reliably fire. |
| `description-too-long` | warning | skill | `description` exceeds 1024 chars and risks host truncation. |
| `description-too-short` | warning | skill | `description` under 16 chars — too terse to match a request against. |
| `duplicate-key` | error | skill | A top-level frontmatter key appears twice; YAML silently keeps only one. |
| `unknown-key` | warning | skill | A top-level key is a near-miss typo of a known key (e.g. `nmae:` → `name:`). |
| `duplicate-name` | error | project | Two skills declare the same `name` and shadow each other non-deterministically. |
| `unresolved-skill-reference` | warning | project | A `/skill-name` mention resolves to no skill in the linted set (needs 2+ files). |

## Why these, specifically

Skillcheck models *runtime* failure modes, not YAML validity. Each rule above maps
to a real "why isn't my skill working?" bug:

- **`missing-field` / `name-format`** — the runtime resolves a skill by a
  kebab-case `name`; get it wrong and the skill silently doesn't register.
- **`weak-trigger` / `description-*`** — the description *is* the trigger. Without
  "when to use" language, or when truncated, the model has nothing to match.
- **`duplicate-name`** — invisible in any single file; only a cross-file check
  finds it. This is the highest-value rule Skillcheck offers.

## Severities and exit codes

- **error** → the CLI exits `1`. Fails CI.
- **warning** / **info** → reported, but the CLI exits `0` by default. Use
  `--max-warnings 0` (backlog 3.2) to gate on warnings too.

## Configuring rules

Drop a `skillcheck.json` next to where you run the CLI (or point at one with
`--config <path>`; `--no-config` ignores it). Each key is a rule id from the
table above; each value is a severity or `off`:

```json
{
  "rules": {
    "weak-trigger": "off",
    "name-format": "warning",
    "duplicate-name": "error"
  }
}
```

- `off` (or `false`) — silence the rule entirely.
- `"error"` / `"warning"` / `"info"` — force that severity (this can promote a
  warning to a CI-failing error, or the reverse).
- An unknown rule id or an invalid severity fails fast with a clear message —
  a typo in your config never silently does nothing.

## Adding a rule

Rules are small modules in `src/rules/`. A document rule exposes
`{ id, appliesTo(kind), check(doc) }`; a project rule exposes
`{ id, checkProject(docs) }`. Register it in `src/rules/index.js`, add its id to
`allRuleIds`, and cover it in `test/rules.test.js`. No other wiring needed.
