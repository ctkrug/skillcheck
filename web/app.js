// Skillcheck web validator. Runs the SAME engine the CLI uses, entirely in the
// browser — no server call. Imports the pure lint module copied into ./engine/
// by scripts/build-site.js.

import { lintText } from './engine/lint.js';

const $ = (id) => document.getElementById(id);
const editor = $('editor');
const gutter = $('gutter');
const report = $('report');
const stamp = $('stamp');
const picker = $('example-picker');
const copyBtn = $('copy-report');
const muteBtn = $('mute-toggle');

const counts = { error: $('count-error'), warn: $('count-warn'), info: $('count-info') };

// ---- Example fixtures (kept in sync with examples/ in spirit) ----
const EXAMPLES = {
  clean: `---
name: format-currency
description: Formats numbers as localized currency. Use when the user asks to render a value as money.
metadata:
  type: reference
---

# Format Currency

A clean skill: kebab-case name, a description that says what it does and when to
use it, and a closed frontmatter block. Skillcheck reports no problems.
`,
  broken: `---
name: Broken_Skill
description: does stuff
---

# Broken Skill

The name is not kebab-case (error) and the description has no trigger language
and is far too terse (warnings).
`,
  short: `---
name: summarize-thread
description: Summarizes a thread.
---

# Summarize Thread

The description says what it does but never says WHEN to use it — Skillcheck warns
that it has no trigger language for the model to match against.
`,
  unclosed: `---
name: half-written
description: A skill whose frontmatter block is never closed. Use when testing.

# Half Written

There is no closing --- line, so the runtime can't parse the frontmatter at all.
`,
};

// ---- Rendering ----
function severityClass(sev) {
  return sev === 'error' ? 'error' : sev === 'warning' ? 'warning' : 'info';
}

function renderReport(result) {
  report.innerHTML = '';

  if (!editor.value.trim()) {
    report.innerHTML = `<div class="report__empty">
      <div class="report__empty-title">Nothing to check yet</div>
      <div>Paste a skill file or load an example to see live diagnostics.</div>
    </div>`;
    return;
  }

  if (result.diagnostics.length === 0) {
    report.innerHTML = `<div class="report__clean">
      <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 17l6 6 14-15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div class="report__empty-title" style="color:var(--ok)">No problems found</div>
      <div>This file passes every Skillcheck rule.</div>
    </div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  result.diagnostics.forEach((d, i) => {
    const row = document.createElement('div');
    row.className = `finding finding--${severityClass(d.severity)}`;
    row.style.animationDelay = `${Math.min(i, 12) * 22}ms`;
    row.dataset.line = String(d.line);
    row.innerHTML = `
      <div class="finding__gutter">${d.line}:${d.column}</div>
      <div>
        <span class="finding__sev">${d.severity}</span>
        <span class="finding__rule">${d.ruleId}</span>
        <div class="finding__msg">${escapeHtml(d.message)}</div>
        ${d.hint ? `<div class="finding__hint">${escapeHtml(d.hint)}</div>` : ''}
      </div>`;
    row.addEventListener('mouseenter', () => highlightGutter(d.line));
    row.addEventListener('mouseleave', () => highlightGutter(null));
    frag.appendChild(row);
  });
  report.appendChild(frag);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Rolling tally digits.
function setCount(el, value) {
  if (el.textContent === String(value)) return;
  el.textContent = String(value);
  el.animate(
    [{ transform: 'translateY(-40%)', opacity: 0 }, { transform: 'none', opacity: 1 }],
    { duration: 160, easing: 'ease-out' },
  );
}

function updateStamp(result, hasContent) {
  const state = !hasContent ? 'idle' : result.ok ? 'pass' : 'revise';
  const label = state === 'idle' ? 'READY' : state === 'pass' ? 'PASSED' : 'REVISE';
  const changed = stamp.dataset.state !== state;
  stamp.dataset.state = state;
  stamp.textContent = label;
  if (changed) {
    stamp.classList.remove('stamp--pop');
    void stamp.offsetWidth; // reflow to restart animation
    stamp.classList.add('stamp--pop');
    if (state === 'pass') beep('pass');
    else if (state === 'revise') beep('revise');
  }
}

function renderGutter() {
  const n = editor.value.split('\n').length;
  let out = '';
  for (let i = 1; i <= n; i++) out += `<span data-line="${i}">${i}</span>\n`;
  gutter.innerHTML = out;
}

function highlightGutter(line) {
  gutter.querySelectorAll('.g-hot').forEach((el) => el.classList.remove('g-hot'));
  if (line == null) return;
  const el = gutter.querySelector(`[data-line="${line}"]`);
  if (el) el.classList.add('g-hot');
}

// ---- Lint cycle (debounced) ----
let timer = null;
function scheduleLint() {
  renderGutter();
  clearTimeout(timer);
  timer = setTimeout(runLint, 120);
}

function runLint() {
  const text = editor.value;
  const hasContent = text.trim().length > 0;
  const result = lintText(text, { path: 'pasted/SKILL.md' });
  renderReport(result);
  setCount(counts.error, result.summary.errors);
  setCount(counts.warn, result.summary.warnings);
  setCount(counts.info, result.summary.infos);
  updateStamp(result, hasContent);
  lastResult = result;
}

let lastResult = { ok: true, summary: { errors: 0, warnings: 0, infos: 0 }, diagnostics: [] };

// ---- Controls ----
editor.addEventListener('input', scheduleLint);
editor.addEventListener('scroll', () => { gutter.scrollTop = editor.scrollTop; });

picker.addEventListener('change', () => {
  const key = picker.value;
  if (EXAMPLES[key]) {
    editor.value = EXAMPLES[key];
    scheduleLint();
    runLint();
  }
});

copyBtn.addEventListener('click', async () => {
  const json = JSON.stringify(
    { ok: lastResult.ok, summary: lastResult.summary, diagnostics: lastResult.diagnostics },
    null,
    2,
  );
  try {
    await navigator.clipboard.writeText(json);
    const prev = copyBtn.textContent;
    copyBtn.textContent = 'copied ✓';
    setTimeout(() => (copyBtn.textContent = prev), 1200);
  } catch {
    copyBtn.textContent = 'copy failed';
  }
});

// ---- Sound (WebAudio synth, opt-in, persisted) ----
let audioCtx = null;
let muted = localStorage.getItem('skillcheck:muted') !== 'false'; // default muted
syncMuteUI();

muteBtn.addEventListener('click', () => {
  muted = !muted;
  localStorage.setItem('skillcheck:muted', String(muted));
  syncMuteUI();
});

function syncMuteUI() {
  muteBtn.setAttribute('aria-pressed', String(!muted));
  muteBtn.querySelector('[data-sound-on]').hidden = muted;
  muteBtn.querySelector('[data-sound-off]').hidden = !muted;
}

function beep(kind) {
  if (muted) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain).connect(audioCtx.destination);
    if (kind === 'pass') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(660, t);
      osc.frequency.exponentialRampToValueAtTime(990, t + 0.12);
    } else {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.16);
    }
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.start(t); osc.stop(t + 0.22);
  } catch { /* no audio in this environment */ }
}

// ---- First paint ----
renderGutter();
renderReport(lastResult);
