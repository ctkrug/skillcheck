# Skillcheck — Architecture

A concise map of the codebase so a fresh session can orient fast. For the *why*,
see [`VISION.md`](VISION.md); for the rule catalog, [`RULES.md`](RULES.md).

## The one rule that shapes everything

**The engine is pure ES-module JavaScript with zero runtime dependencies**, so
the *exact same files* run in Node (the CLI) and in the browser (the web
validator). Nothing under `src/` may import a Node built-in except the two
Node-only modules called out below. That is what makes "one engine, two
front-ends" real — the demo on the web is literally the check that runs in CI.

## Layout

```
bin/skillcheck.js        CLI entrypoint: arg parsing, exit codes, config discovery
src/
  lint.js                THE engine: parse → run rules → apply config → summarize
  parser.js              frontmatter parser (block/folded/continued scalars, dup keys)
  diagnostics.js         Diagnostic shape, severity ranking, sort + summarize
  config.js              rule config normalize + apply (disable / re-severity)
  rules/
    index.js             the registry: documentRules[], projectRules[], allRuleIds[]
    helpers.js           shared predicates (kebab, trigger words, edit distance…)
    missingFrontmatter.js  document rule: required keys + unterminated block
    nameFormat.js          document rules: name-format (kebab) + name-dir-mismatch
    descriptionQuality.js  document rules: too-long / too-short / weak-trigger
    duplicateKey.js        document rule: repeated top-level frontmatter key
    unknownKey.js          document rule: typo of a known key (did-you-mean)
    nameCollision.js       project rule: duplicate-name across the set
    skillReference.js      project rule: unresolved /skill-name references
  index.js               Node-only: fs walking, config loading, initSkill (scaffold)
  scaffold.js            Node-adjacent: skillTemplate() (pure) used by --init
  reporters/
    pretty.js            Node-only: colorized terminal report
    json.js              machine-readable JSON report
web/                     the validator front-end (index.html, styles.css, app.js)
scripts/build-site.js    copies web/ + the pure engine into dist/ (auto-discovered)
examples/                seeded fixtures the CLI and tests lint
test/                    node:test suites (parser, rules, config, cli, scaffold)
                         + properties.test.js: seeded property/fuzz suite
docs/                    VISION · DESIGN · BACKLOG · RULES · this file
```

## Data flow

1. **Input → sources.** The CLI reads files (`src/index.js`); the web app reads
   editor tabs (`web/app.js`). Both produce `{ path, text }[]`.
2. **Parse.** `parser.js#parseDocument` turns each source into a `Document`
   (frontmatter fields with per-key line numbers, nested maps, duplicate keys,
   body, detected kind). It never throws — malformed input is the point.
3. **Rules.** `lint.js#lintSources` runs every `documentRule` per document and
   every `projectRule` over the whole set. Rules return `Diagnostic[]`; they
   never print.
4. **Config.** `config.js#applyConfig` drops disabled rules and overrides
   severities (keyed on the diagnostic `ruleId`), so the `ok` flag and counts
   reflect the configured severities.
5. **Report.** `diagnostics.js` sorts + summarizes; a reporter (`pretty`/`json`)
   or the web DOM renders the result.

## The rule contract

- **DocumentRule**: `{ id, appliesTo(kind) → bool, check(doc, ctx) → Diagnostic[] }`.
- **ProjectRule**: `{ id, checkProject(docs, ctx) → Diagnostic[] }`.

Diagnostics carry a stable `ruleId` (what users configure and see), a severity,
a line/column, a message, and an optional fix `hint`. Adding a rule is: write
the module, import + register it in `rules/index.js`, add its emitted id(s) to
`allRuleIds`, cover it in `test/`, and document it in `RULES.md`. The browser
build picks it up automatically (see below).

## The web build

`scripts/build-site.js` copies `web/` into `dist/` and mirrors the pure engine
into `dist/engine/`, preserving the relative import structure. It **walks
`src/` and copies every `.js` except the Node-only modules** (`index.js`,
`scaffold.js`, `reporters/`) — so a new rule ships to the browser with no build
edit. Every asset path is relative, so the site deploys under a subpath
(`apps.charliekrug.com/skillcheck/`).

The web app (`web/app.js`) imports `./engine/lint.js` and calls the same
`lintSources`. It silences `name-dir-mismatch` (pasted content has no real
on-disk directory) and treats each editor tab as one document in the set, so
the cross-file rules fire live.

## Run & test

```bash
node bin/skillcheck.js examples     # lint the bundled fixtures
node bin/skillcheck.js --init demo  # scaffold a lint-clean starter skill
npm test                            # node:test suites (no network/box needed)
npm run build                       # emit the static site into dist/
```
