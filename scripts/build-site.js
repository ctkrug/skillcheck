// Builds the self-contained web validator into dist/.
//
// The web app imports the SAME pure engine the CLI uses. Rather than bundle, we
// copy the browser-safe engine modules (no node:fs imports) into dist/engine/,
// preserving the relative structure their imports expect. Everything uses
// relative paths so the site can be served from any subpath.

import { mkdirSync, copyFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

// Pure, browser-safe engine files (index.js and reporters are Node-only).
const ENGINE_FILES = [
  'diagnostics.js',
  'parser.js',
  'lint.js',
  'rules/index.js',
  'rules/helpers.js',
  'rules/missingFrontmatter.js',
  'rules/nameFormat.js',
  'rules/descriptionQuality.js',
  'rules/nameCollision.js',
];

function copyInto(srcDir, destDir) {
  mkdirSync(destDir, { recursive: true });
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.isDirectory()) continue; // web/ is flat
    copyFileSync(join(srcDir, entry.name), join(destDir, entry.name));
  }
}

function build() {
  if (existsSync(dist)) rmSync(dist, { recursive: true });
  mkdirSync(dist, { recursive: true });

  // Static web assets (index.html, styles.css, app.js).
  copyInto(join(root, 'web'), dist);

  // Engine, under dist/engine/ mirroring src/ so relative imports resolve.
  for (const rel of ENGINE_FILES) {
    const from = join(root, 'src', rel);
    const to = join(dist, 'engine', rel);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
  }

  process.stdout.write(`built dist/ (${ENGINE_FILES.length} engine modules)\n`);
}

build();
