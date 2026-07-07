// Skillcheck web validator. Runs the SAME engine the CLI uses, entirely in the
// browser — no server call. Imports the pure lint module copied into ./engine/
// by scripts/build-site.js.

import { lintSources } from './engine/lint.js';

const $ = (id) => document.getElementById(id);
const editor = $('editor');
const gutter = $('gutter');
const report = $('report');
const stamp = $('stamp');
const tabsEl = $('tabs');
const picker = $('example-picker');
const copyBtn = $('copy-report');
const muteBtn = $('mute-toggle');

const counts = { error: $('count-error'), warn: $('count-warn'), info: $('count-info') };

// Pasted content has no real on-disk directory, so the directory-match check is
// noise here — silence just that rule while keeping everything else.
const LINT_CONFIG = { rules: { 'name-dir-mismatch': 'off' } };

// ---- Open files ----
// Each file is one document in the linted set, so cross-file rules (duplicate
// names, unresolved /references) can fire just like they do in CI.
let files = [{ label: 'skill', text: '' }];
let active = 0;

const slug = (s) =>
  (s || 'skill')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'skill';

const pathOf = (file) => `${slug(file.label)}/SKILL.md`;

function saveEditor() {
  if (files[active]) files[active].text = editor.value;
}

function loadEditor() {
  editor.value = files[active].text;
  renderGutter();
}

// ---- Example fixtures ----
const EXAMPLES = {
  clean: [
    {
      label: 'format-currency',
      text: `---
name: format-currency
description: Formats numbers as localized currency. Use when the user asks to render a value as money.
metadata:
  type: reference
---

# Format Currency

A clean skill: kebab-case name, a description that says what it does and when to
use it, and a closed frontmatter block. Skillcheck reports no problems.
`,
    },
  ],
  broken: [
    {
      label: 'broken-skill',
      text: `---
name: Broken_Skill
description: does stuff
---

# Broken Skill

The name is not kebab-case (error) and the description has no trigger language
and is far too terse (warnings).
`,
    },
  ],
  short: [
    {
      label: 'summarize-thread',
      text: `---
name: summarize-thread
description: Summarizes a thread.
---

# Summarize Thread

The description says what it does but never says WHEN to use it — Skillcheck warns
that it has no trigger language for the model to match against.
`,
    },
  ],
  unclosed: [
    {
      label: 'half-written',
      text: `---
name: half-written
description: A skill whose frontmatter block is never closed. Use when testing.

# Half Written

There is no closing --- line, so the runtime can't parse the frontmatter at all.
`,
    },
  ],
  collision: [
    {
      label: 'research-web',
      text: `---
name: research-agent
description: Researches a topic on the web. Use when the user asks to look something up online.
---

# Research (web)

This skill and its sibling both declare \`name: research-agent\`, so they shadow
each other — only one registers, non-deterministically. It also delegates to
/summarize-report, which no file here defines.
`,
    },
    {
      label: 'research-docs',
      text: `---
name: research-agent
description: Researches across local documents. Use when the user asks about the repo's own files.
---

# Research (docs)

The duplicate \`name\` above is invisible if you read either file alone — only a
cross-file check finds it.
`,
    },
  ],
};

// ---- Tabs ----
function renderTabs() {
  tabsEl.innerHTML = '';
  files.forEach((file, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'tab' + (i === active ? ' tab--active' : '');
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(i === active));
    tab.innerHTML = `<span class="tab__name">${escapeHtml(file.label)}</span>`;
    tab.addEventListener('click', () => switchTo(i));

    if (files.length > 1) {
      const close = document.createElement('span');
      close.className = 'tab__close';
      close.textContent = '×';
      close.setAttribute('role', 'button');
      close.setAttribute('aria-label', `close ${file.label}`);
      close.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFile(i);
      });
      tab.appendChild(close);
    }
    tabsEl.appendChild(tab);
  });

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'tab tab--add';
  add.setAttribute('aria-label', 'add a file');
  add.textContent = '+';
  add.addEventListener('click', addFile);
  tabsEl.appendChild(add);
}

function switchTo(i) {
  saveEditor();
  active = i;
  loadEditor();
  renderTabs();
  runLint();
  editor.focus();
}

function addFile() {
  saveEditor();
  const n = files.length + 1;
  files.push({ label: `skill-${n}`, text: '' });
  active = files.length - 1;
  loadEditor();
  renderTabs();
  runLint();
  editor.focus();
}

function removeFile(i) {
  saveEditor();
  files.splice(i, 1);
  if (files.length === 0) files.push({ label: 'skill', text: '' });
  if (active >= files.length) active = files.length - 1;
  loadEditor();
  renderTabs();
  runLint();
}

function setFiles(next) {
  files = next.map((f) => ({ label: f.label, text: f.text }));
  active = 0;
  loadEditor();
  renderTabs();
  runLint();
}

// ---- Rendering ----
function severityClass(sev) {
  return sev === 'error' ? 'error' : sev === 'warning' ? 'warning' : 'info';
}

function renderReport(result) {
  report.innerHTML = '';

  if (!files.some((f) => f.text.trim())) {
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
      <div>${files.length > 1 ? 'Every file passes' : 'This file passes'} every Skillcheck rule.</div>
    </div>`;
    return;
  }

  // Group by file so a multi-file set reads like the CLI report.
  const groups = new Map();
  for (const d of result.diagnostics) {
    const key = d.file || pathOf(files[active]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d);
  }

  const frag = document.createDocumentFragment();
  const multi = files.length > 1;
  let n = 0;
  for (const [file, diags] of groups) {
    if (multi) {
      const head = document.createElement('div');
      head.className = 'report__file';
      head.textContent = file;
      frag.appendChild(head);
    }
    for (const d of diags) {
      const row = document.createElement('div');
      row.className = `finding finding--${severityClass(d.severity)}`;
      row.style.animationDelay = `${Math.min(n++, 12) * 22}ms`;
      row.dataset.line = String(d.line);
      row.dataset.file = file;
      row.innerHTML = `
        <div class="finding__gutter">${d.line}:${d.column}</div>
        <div>
          <span class="finding__sev">${d.severity}</span>
          <span class="finding__rule">${d.ruleId}</span>
          <div class="finding__msg">${escapeHtml(d.message)}</div>
          ${d.hint ? `<div class="finding__hint">${escapeHtml(d.hint)}</div>` : ''}
        </div>`;
      row.addEventListener('mouseenter', () => highlightGutter(d.line, file));
      row.addEventListener('mouseleave', () => highlightGutter(null));
      frag.appendChild(row);
    }
  }
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

function highlightGutter(line, file) {
  gutter.querySelectorAll('.g-hot').forEach((el) => el.classList.remove('g-hot'));
  if (line == null) return;
  // Only the active file's lines map onto the visible gutter.
  if (file && file !== pathOf(files[active])) return;
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

let lastResult = { ok: true, summary: { errors: 0, warnings: 0, infos: 0 }, diagnostics: [] };

function runLint() {
  saveEditor();
  const sources = files
    .filter((f) => f.text.trim().length > 0)
    .map((f) => ({ path: pathOf(f), text: f.text }));
  const hasContent = sources.length > 0;
  const result = hasContent
    ? lintSources(sources, { config: LINT_CONFIG })
    : { ok: true, summary: { errors: 0, warnings: 0, infos: 0 }, diagnostics: [] };
  renderReport(result);
  setCount(counts.error, result.summary.errors);
  setCount(counts.warn, result.summary.warnings);
  setCount(counts.info, result.summary.infos);
  updateStamp(result, hasContent);
  lastResult = result;
}

// ---- Controls ----
editor.addEventListener('input', scheduleLint);
editor.addEventListener('scroll', () => {
  gutter.scrollTop = editor.scrollTop;
});

picker.addEventListener('change', () => {
  const key = picker.value;
  if (EXAMPLES[key]) {
    setFiles(EXAMPLES[key]);
    editor.focus();
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
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, t);
      osc.frequency.exponentialRampToValueAtTime(990, t + 0.12);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.16);
    }
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.start(t);
    osc.stop(t + 0.22);
  } catch {
    /* no audio in this environment */
  }
}

// ---- First paint ----
renderTabs();
renderGutter();
renderReport(lastResult);
