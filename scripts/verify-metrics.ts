/**
 * Numeric integrity gate.
 *
 * Every `metrics[].value` in the content collection must appear verbatim in
 * data/source-snapshot.json, which is scraped from the previous site. A metric
 * that is genuinely new (not on the old site) has to be listed in ALLOWED_NEW
 * below together with the repo file it was copied from, so that adding a number
 * is always a deliberate, reviewable act.
 *
 * Exit code 1 fails CI.
 */
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const ROOT = resolve(import.meta.dirname, '..');
const PROJECTS = resolve(ROOT, 'src/content/projects');

/**
 * Metrics added during the rebuild that were not `.fact` blocks on the old site.
 * Key is the verbatim value, value is where it was copied from. Nothing may be
 * added here without a source file that contains the number.
 */
const ALLOWED_NEW: Record<string, string> = {
  // offroad-bevfusion: stage split behind the 36.4 -> 15.2 ms headline, from the
  // repo's latency table; the old site showed only the total.
  '0.81 ms': 'langgrasp docs/RESULTS.md - YOLO11n-seg TensorRT FP16',
  '7.0 ms': 'langgrasp docs/RESULTS.md - YOLO11n-seg PyTorch',
  // sigint-fusion per-SNR curve, from README.md results table (real RadioML 2018.01A).
  '96% at 30 dB': 'sigint-fusion README.md results table',
  // AeroEdge Pareto points already shipped in the old site's table view.
  '26.3 ms': 'data/source-snapshot.json paretoRows',
  '12.8 ms': 'data/source-snapshot.json paretoRows',
  '13.1 ms': 'data/source-snapshot.json paretoRows',
};

type Snapshot = { metricValues: string[]; paretoRows: string[][] };
const snapshot: Snapshot = JSON.parse(
  await readFile(resolve(ROOT, 'data/source-snapshot.json'), 'utf8'),
);

const known = new Set<string>([
  ...snapshot.metricValues,
  ...snapshot.paretoRows.flat(),
  ...Object.keys(ALLOWED_NEW),
]);

const files = (await readdir(PROJECTS)).filter((f) => f.endsWith('.mdx'));
const problems: string[] = [];
let checked = 0;

for (const file of files) {
  const raw = await readFile(resolve(PROJECTS, file), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) {
    problems.push(`${file}: no frontmatter`);
    continue;
  }
  const data = parse(fm[1]) as {
    lab?: boolean;
    metrics?: { value: string; label: string; illustrative?: boolean; hardware?: string }[];
    limits?: unknown[];
  };
  if (!data.metrics?.length && !data.lab) {
    problems.push(`${file}: no metrics (only \`lab: true\` entries may have none)`);
  }
  if (!data.limits?.length) {
    problems.push(`${file}: no honest-limits entries (every project needs at least one)`);
  }
  for (const m of data.metrics ?? []) {
    checked++;
    if (m.illustrative) continue;
    if (!known.has(m.value)) {
      problems.push(
        `${file}: metric "${m.value}" is not in the source snapshot and is not in ALLOWED_NEW`,
      );
    }
  }
}

if (problems.length) {
  console.error('verify:metrics FAILED\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log(`verify:metrics ok - ${checked} metrics across ${files.length} projects`);
