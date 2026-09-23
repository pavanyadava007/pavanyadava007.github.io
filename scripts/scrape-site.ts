/**
 * Snapshot the metrics of the previous portfolio so the rebuild cannot drift.
 *
 * Source of truth is the live site. `data/legacy-index.html` is the byte-identical
 * copy committed from `main`, used when the build host has no network (CI runs
 * offline for this step by design - the snapshot is a committed artefact, not a
 * live dependency).
 *
 *   npx tsx scripts/scrape-site.ts            # from the committed copy
 *   npx tsx scripts/scrape-site.ts --live     # re-fetch https://pavanyadava007.github.io/
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const LIVE_URL = 'https://pavanyadava007.github.io/';

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function loadHtml(): Promise<string> {
  if (process.argv.includes('--live')) {
    const res = await fetch(LIVE_URL);
    if (!res.ok) throw new Error(`${LIVE_URL} -> HTTP ${res.status}`);
    return res.text();
  }
  return readFile(resolve(ROOT, 'data/legacy-index.html'), 'utf8');
}

const html = await loadHtml();

/** Every `<section id>` with its heading, in document order. */
const sections = [...html.matchAll(/<section id="([^"]+)">([\s\S]*?)<\/section>/g)].map(
  ([, id, body]) => {
    const heading = decode(body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? '');
    const kicker = decode(body.match(/class="kicker"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '');
    /** `.fact` blocks are the measured numbers: `.n` is the value, `.lbl` the provenance. */
    const metrics = [...body.matchAll(/<div class="fact">([\s\S]*?)<\/div>/g)].map(([, f]) => ({
      value: decode(f.match(/<span class="n">([\s\S]*?)<\/span>/)?.[1] ?? ''),
      label: decode(f.match(/<span class="lbl">([\s\S]*?)<\/span>/)?.[1] ?? ''),
    }));
    const note = decode(body.match(/<div class="note">([\s\S]*?)<\/div>/)?.[1] ?? '');
    const links = [...body.matchAll(/<a class="btn[^"]*" href="([^"]+)">([\s\S]*?)<\/a>/g)].map(
      ([, href, text]) => ({ href, text: decode(text) }),
    );
    return { id, kicker, heading, metrics, note, links };
  },
);

/** The Pareto table in the AeroEdge figure is the only tabular source on the page. */
const paretoRows = [
  ...(html.match(/<table>[\s\S]*?<\/table>/)?.[0] ?? '').matchAll(/<tr><td>([\s\S]*?)<\/tr>/g),
].map(([, row]) => row.split(/<\/td>\s*<td>/).map(decode));

const snapshot = {
  source: process.argv.includes('--live') ? LIVE_URL : 'data/legacy-index.html',
  scrapedAt: new Date().toISOString().slice(0, 10),
  title: decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''),
  sections,
  paretoRows,
  /** Flat list used by verify-metrics.ts. */
  metricValues: [...new Set(sections.flatMap((s) => s.metrics.map((m) => m.value)))].sort(),
};

await writeFile(
  resolve(ROOT, 'data/source-snapshot.json'),
  JSON.stringify(snapshot, null, 2) + '\n',
);
console.log(
  `snapshot: ${sections.length} sections, ${snapshot.metricValues.length} distinct metric values`,
);
