// Builds the self-contained web validator into site/.
//
// The web app imports the SAME pure engine the CLI uses. Rather than bundle, we
// copy the browser-safe engine modules (no node:fs imports) into site/engine/,
// preserving the relative structure their imports expect. Everything uses
// relative paths so the site can be served from any subpath. The built output is
// committed so it deploys as plain static files with no build step.

import { mkdirSync, copyFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'site');

// Node-only engine modules the browser must never receive (they import node:fs).
// Everything else under src/ is pure and browser-safe, so we auto-discover it,
// so a new rule module is copied automatically and can't be forgotten.
const NODE_ONLY = new Set(['index.js', 'scaffold.js']);

/** Recursively list every .js file under src/, relative to src/. */
function engineFiles() {
  const srcRoot = join(root, 'src');
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'reporters') continue; // Node-only renderers
        walk(abs);
      } else if (entry.name.endsWith('.js')) {
        const rel = relative(srcRoot, abs);
        if (!NODE_ONLY.has(rel)) out.push(rel);
      }
    }
  };
  walk(srcRoot);
  return out;
}

function copyInto(srcDir, destDir) {
  mkdirSync(destDir, { recursive: true });
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.isDirectory()) continue; // web/ is flat
    copyFileSync(join(srcDir, entry.name), join(destDir, entry.name));
  }
}

function build() {
  if (existsSync(out)) rmSync(out, { recursive: true });
  mkdirSync(out, { recursive: true });

  // Static web assets (index.html, styles.css, app.js).
  copyInto(join(root, 'web'), out);

  // Engine, under site/engine/ mirroring src/ so relative imports resolve.
  const files = engineFiles();
  for (const rel of files) {
    const from = join(root, 'src', rel);
    const to = join(out, 'engine', rel);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
  }

  process.stdout.write(`built site/ (${files.length} engine modules)\n`);
}

build();
