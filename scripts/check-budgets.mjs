/**
 * Enforce the performance budgets that a Lighthouse score alone does not pin down:
 * the initial JS on `/` and the size of individual media files.
 *
 * Lighthouse covers LCP/CLS/INP; this covers the byte budgets in CLAUDE.md section 1,
 * because a regression there shows up as a slow score long after it shows up as bytes.
 *
 *   node scripts/check-budgets.mjs
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');

const BUDGETS = {
  /** Scripts the browser fetches to render `/`, gzipped. */
  initialJsKb: 90,
  /** Any single video or image served from public/media. */
  mediaFileMb: 2.5,
};

const fail = [];
const report = [];

// --- initial JS on / -------------------------------------------------------------
const html = await readFile(join(DIST, 'index.html'), 'utf8');
const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
const preloads = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)].map(
  (m) => m[1],
);

let initialBytes = 0;
for (const src of [...new Set([...srcs, ...preloads])]) {
  if (!src.startsWith('/')) continue;
  const buf = await readFile(join(DIST, src.slice(1)));
  initialBytes += gzipSync(buf).length;
}
const initialKb = initialBytes / 1024;
report.push(`initial JS on /: ${initialKb.toFixed(1)} kB gz (budget ${BUDGETS.initialJsKb})`);
if (initialKb > BUDGETS.initialJsKb) {
  fail.push(
    `initial JS on / is ${initialKb.toFixed(1)} kB gz, over the ${BUDGETS.initialJsKb} kB budget`,
  );
}

// --- media file sizes ------------------------------------------------------------
const mediaDir = join(DIST, 'media');
try {
  for (const name of await readdir(mediaDir)) {
    const { size } = await stat(join(mediaDir, name));
    const mb = size / 1024 / 1024;
    if (mb > BUDGETS.mediaFileMb) {
      fail.push(`media/${name} is ${mb.toFixed(2)} MB, over the ${BUDGETS.mediaFileMb} MB budget`);
    }
  }
  report.push(`media: every file within ${BUDGETS.mediaFileMb} MB`);
} catch {
  report.push('media: no dist/media directory');
}

// --- the 3D bundle must not be on the critical path ------------------------------
if (/modulepreload[^>]+hero-scene/.test(html) || /<script[^>]+src="[^"]*hero-scene/.test(html)) {
  fail.push('the three.js hero chunk is referenced from the initial HTML of /');
} else {
  report.push('3D bundle: lazy, not referenced from the initial HTML');
}

console.log(report.map((r) => `  ok  ${r}`).join('\n'));
if (fail.length) {
  console.error('\nbudget check FAILED\n' + fail.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
console.log('\nbudgets ok');
