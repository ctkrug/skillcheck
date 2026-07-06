# Skillcheck — Design Brief

The product and the landing page are one brand. This file is the single source of
truth for both; every BUILD/QA run follows it. Change it only deliberately, in its
own commit, with a reason.

## 1. Aesthetic direction

**Skillcheck is a drafting instrument for spec files: a warm-paper blueprint —
ink-navy line work on aged drafting paper, precise monospaced annotations, thin
registration rules, and signal colors that mean exactly what they mean on an
engineering drawing.** It should feel like a precision tool that inspects other
precision documents, not a generic SaaS dashboard. The linter's three severities
map straight onto a schematic's signal palette (vermilion = error, amber = warn,
cyan = info), so the color system *is* the information design.

Deliberately **not** dark-gray cards with one accent. The ground is light,
papery, and textured; depth comes from soft ink shadows and a faint blueprint
grid, not from stacked charcoal panels.

## 2. Tokens (actual values)

**Color — paper & ink (light, default)**
- `--bg`         `#EDE6D6`  aged drafting paper
- `--surface-1`  `#F7F2E7`  raised card paper
- `--surface-2`  `#E3DAC5`  recessed / gutter paper
- `--ink`        `#1B2A44`  ink-navy primary text
- `--ink-muted`  `#5A6579`  muted annotation text
- `--line`       `#C6BCA4`  hairline rules / borders
- `--grid`       `rgba(27,42,68,0.06)` blueprint grid overlay

**Accents & signals**
- `--accent`         `#0E6E8C`  blueprint cyan (primary interactive)
- `--accent-warm`    `#C05B1E`  drafting-orange support accent
- `--error`          `#B3261E`  vermilion (severity: error)
- `--warn`           `#B7791F`  amber (severity: warning)
- `--info`           `#0E6E8C`  cyan (severity: info)
- `--ok`             `#3F7A34`  drafting green (clean result)

**Dark treatment (honor `prefers-color-scheme: dark`)** — a true blueprint:
- `--bg` `#0E2036`, `--surface-1` `#132A46`, `--surface-2` `#0B1A2C`,
  `--ink` `#E8EEF6`, `--ink-muted` `#93A4BC`, `--line` `#274769`,
  `--grid` `rgba(180,210,255,0.07)`. Accents brighten:
  `--accent` `#3FB6D6`, error `#F0685E`, warn `#E9B44C`, ok `#7FC46E`.

**Type**
- Display / wordmark + headings: **"Space Grotesk"** (Google Fonts), system
  `ui-sans-serif` fallback. Technical, slightly geometric.
- UI / body: **"Inter"**, `system-ui` fallback.
- Code / annotations / the report: **"JetBrains Mono"**, `ui-monospace` fallback.
- Scale ~1.25 ratio: 12 / 14 / 16 / 20 / 25 / 31 / 39px. Body 16px, ≤70ch measure.

**Spacing** — 4px base scale (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64).
**Radius** — 6px on cards/inputs, 3px on chips (crisp, drafted, not pill-round).
**Elevation** — layered soft ink shadow: `0 1px 0 var(--line)` hairline +
`0 12px 28px -18px rgba(27,42,68,0.35)` lift. No flat single-hue panels.
**Motion** — UI transitions 140–220ms ease-out; result-row reveal 90–130ms
staggered. Respect `prefers-reduced-motion`.

## 3. Layout intent

The **hero is the validator itself**, not a marketing headline. Desktop
(1440×900): a two-pane drafting table — left pane is the editor (paste/drop a
file, monospaced, line-gutter), right pane is the live annotated report — filling
~65% of the viewport height, framed like a titled drawing sheet with a header
strip (wordmark + severity tally) and a thin registration border. A short value
line and a "load an example" row sit above; a compact rule-reference sits below
the fold.

Phone (390×844): the two panes stack — editor first, report directly under it,
both full-width, no dead margins. The severity tally becomes a sticky summary bar.

## 4. Signature detail

A **live drafting-sheet title block**: the validator is framed as an engineering
drawing sheet with a corner "title block" (project name, `SHEET`, and a live
status stamp). On a clean file it stamps a rotated **"PASSED"** in drafting green
with a faint ink texture; with errors it stamps **"REVISE"** in vermilion. The
blueprint grid background and the stamp are the memorable flourish. The wordmark
pairs "skill" (ink) + "check" (cyan) with a small drafting-checkmark glyph.

## 5. Juice plan

Not a game, but the validator earns feedback:
- Report rows reveal with a 90–130ms staggered fade/slide as they're produced.
- Hovering a diagnostic highlights its line in the editor gutter (cyan marker).
- The severity tally digits **roll** when counts change.
- The title-block status stamp animates in (scale + slight rotation settle).
- Optional, off by default, WebAudio-synth ticks: a soft "pass" chime (clean) and
  a low "revise" thunk (errors) — mute toggle persisted in `localStorage`, audio
  context created lazily on first gesture, guarded for headless/test envs.

## 6. Brand assets

- **Favicon**: inline SVG data-URI — a drafting checkmark in blueprint cyan on an
  ink-navy rounded square; never the default globe.
- **Wordmark**: `skill` + `check` two-tone in Space Grotesk with a checkmark
  glyph accent; used in the header and the title block.

## 7. Anti-generic guardrails (this project specifically)

No dark-gray-card grid; no unstyled native `<textarea>`/`<button>`/`<select>`
(the editor, the example picker, and the copy-report button are all themed); no
tiny widget adrift in empty space — the drafting table fills the sheet; no pure
`#000`/`#fff`; no placeholder copy. Product and landing page share this file's
tokens exactly.
