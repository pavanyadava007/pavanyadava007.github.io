/**
 * Generate public/cv.pdf from the content collections.
 *
 * The CV and the site therefore cannot disagree: both read src/content. Rendering is
 * Chromium's print pipeline via the Playwright browser the test suite already
 * installs, so there is no second typesetting toolchain to keep working.
 *
 *   npx tsx scripts/build-cv.ts
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { readdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const ROOT = resolve(import.meta.dirname, '..');

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface Experience {
  order: number;
  role: string;
  org: string;
  location?: string;
  start: string;
  end: string | null;
  kind: 'work' | 'education';
  bullets: string[];
}
interface Skill {
  order: number;
  group: string;
  items: string[];
}
interface Project {
  title: string;
  order: number;
  claim: string;
  featured: boolean;
  lab: boolean;
  stack: string[];
  metrics: { value: string; label: string }[];
  links: { code?: string; demo?: string };
}

const experience: Experience[] = JSON.parse(
  await readFile(resolve(ROOT, 'src/content/experience/experience.json'), 'utf8'),
);
const skills: Skill[] = JSON.parse(
  await readFile(resolve(ROOT, 'src/content/skills/skills.json'), 'utf8'),
);

const projectDir = resolve(ROOT, 'src/content/projects');
const projects: Project[] = [];
for (const file of (await readdir(projectDir)).filter((f) => f.endsWith('.mdx'))) {
  const raw = await readFile(resolve(projectDir, file), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  if (fm) projects.push(parse(fm[1]) as Project);
}
projects.sort((a, b) => a.order - b.order);

const featured = projects.filter((p) => p.featured);
const work = experience.filter((e) => e.kind === 'work').sort((a, b) => a.order - b.order);
const education = experience.filter((e) => e.kind === 'education').sort((a, b) => a.order - b.order);

const range = (e: Experience) =>
  e.end === null ? `${e.start} - present` : e.start === e.end ? e.start : `${e.start} - ${e.end}`;

const repo = (url?: string) => (url ? url.replace(/^https:\/\//, '') : '');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Pavan Yadava Annappa - CV</title>
<style>
  @page { size: A4; margin: 13mm 14mm; }
  * { box-sizing: border-box; margin: 0; }
  body {
    font: 9.4pt/1.42 "Inter Tight", Arial, sans-serif;
    color: #14171c;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  a { color: #0b5f64; text-decoration: none; }
  h1 { font-size: 21pt; letter-spacing: -0.02em; line-height: 1.1; }
  .role { font-size: 10.6pt; color: #2c323c; margin-top: 2pt; font-weight: 600; }
  .contact { margin-top: 5pt; font-size: 8.5pt; color: #4a515c; display: flex; flex-wrap: wrap; gap: 2pt 10pt; }
  .summary { margin-top: 7pt; font-size: 9pt; color: #2c323c; }
  h2 {
    font-size: 8pt; letter-spacing: 0.1em; text-transform: uppercase; color: #0b5f64;
    margin-top: 12pt; padding-bottom: 2.5pt; border-bottom: 0.6pt solid #cdd3da;
  }
  .entry { margin-top: 7pt; break-inside: avoid; }
  .entry-head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
  .entry-role { font-weight: 700; font-size: 9.6pt; }
  .entry-when { font-size: 8.2pt; color: #5b626d; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .entry-org { font-size: 8.8pt; color: #4a515c; }
  ul { margin: 3pt 0 0; padding-left: 11pt; }
  li { margin-top: 1.5pt; }
  .proj { margin-top: 7pt; break-inside: avoid; }
  .proj-claim { font-size: 8.8pt; color: #3b424d; margin-top: 1pt; }
  .metrics { margin-top: 2.5pt; font-size: 8.4pt; display: flex; flex-wrap: wrap; gap: 1pt 8pt; }
  .metrics b { font-family: "JetBrains Mono", monospace; color: #0b5f64; font-weight: 600; }
  .metrics span { color: #5b626d; }
  .stack { margin-top: 2pt; font-size: 7.9pt; color: #5b626d; }
  .skills { margin-top: 5pt; display: grid; grid-template-columns: 82pt 1fr; gap: 2.5pt 9pt; font-size: 8.6pt; }
  .skills dt { color: #0b5f64; font-weight: 600; }
  .skills dd { margin: 0; color: #3b424d; }
  .note { margin-top: 9pt; font-size: 7.8pt; color: #5b626d; border-top: 0.6pt solid #cdd3da; padding-top: 4pt; }
</style></head>
<body>
  <header>
    <h1>Pavan Yadava Annappa</h1>
    <p class="role">Machine Learning Engineer - 3D Perception, Sensor Fusion &amp; Edge Deployment</p>
    <div class="contact">
      <span>Nürnberg, Germany</span>
      <span>available from 20 Oct 2026</span>
      <a href="mailto:pavanyadava07@gmail.com">pavanyadava07@gmail.com</a>
      <a href="https://pavanyadava007.github.io">pavanyadava007.github.io</a>
      <a href="https://github.com/pavanyadava007">github.com/pavanyadava007</a>
      <a href="https://www.linkedin.com/in/pavan-yadav-annappa">linkedin.com/in/pavan-yadav-annappa</a>
      <a href="https://huggingface.co/pavanyadava07">huggingface.co/pavanyadava07</a>
    </div>
    <p class="summary">
      3+ years in automotive ADAS and perception (Continental AG / AUMOVIO), currently researching
      end-to-end autonomy alongside an M.Sc. in AI for Autonomous Driving at FAU Erlangen-Nürnberg.
      I build perception systems the whole way down: BEV LiDAR-camera-radar fusion, transformer
      encoders and multitask heads, then ONNX, TensorRT FP16/INT8, ROS 2 C++, Rust and OTA fleet
      rollout, until it runs in real time on hardware I can measure. Every figure below was
      measured on the hardware named beside it.
    </p>
  </header>

  <h2>Selected projects</h2>
  ${featured
    .map(
      (p) => `<div class="proj">
      <div class="entry-head">
        <span class="entry-role">${esc(p.title)}</span>
        <span class="entry-when">${esc(repo(p.links.code))}</span>
      </div>
      <p class="proj-claim">${esc(p.claim)}</p>
      <p class="metrics">${p.metrics
        .slice(0, 3)
        .map((m) => `<b>${esc(m.value)}</b> <span>${esc(m.label)}</span>`)
        .join('')}</p>
      <p class="stack">${esc(p.stack.slice(0, 8).join(' · '))}</p>
    </div>`,
    )
    .join('')}

  <h2>Experience</h2>
  ${work
    .map(
      (e) => `<div class="entry">
      <div class="entry-head">
        <span class="entry-role">${esc(e.role)}</span>
        <span class="entry-when">${esc(range(e))}</span>
      </div>
      <p class="entry-org">${esc(e.org)}${e.location ? ` · ${esc(e.location)}` : ''}</p>
      ${e.bullets.length ? `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
    </div>`,
    )
    .join('')}

  <h2>Education</h2>
  ${education
    .map(
      (e) => `<div class="entry">
      <div class="entry-head">
        <span class="entry-role">${esc(e.role)}</span>
        <span class="entry-when">${esc(range(e))}</span>
      </div>
      <p class="entry-org">${esc(e.org)}${e.location ? ` · ${esc(e.location)}` : ''}</p>
    </div>`,
    )
    .join('')}

  <h2>Skills</h2>
  <dl class="skills">
    ${skills
      .sort((a, b) => a.order - b.order)
      .map((s) => `<dt>${esc(s.group)}</dt><dd>${esc(s.items.join(' · '))}</dd>`)
      .join('')}
  </dl>

  <p class="note">
    Generated from the content of pavanyadava007.github.io on ${new Date().toISOString().slice(0, 10)}.
    Benchmarks were measured on an NVIDIA L4 and an AMD EPYC 7R13 on an AWS EC2 host; nothing is
    extrapolated to hardware not run on, and each project's write-up lists what failed or could not
    be measured.
  </p>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
// The fonts are the site's own, served from disk so the PDF needs no network.
await page.route('**/fonts/*.woff2', async (route) => {
  const name = new URL(route.request().url()).pathname.split('/').pop()!;
  route.fulfill({
    body: await readFile(resolve(ROOT, 'public/fonts', name)),
    contentType: 'font/woff2',
  });
});
await page.setContent(
  html.replace(
    '<style>',
    `<style>
      @font-face { font-family: "Inter Tight"; src: url("http://cv.local/fonts/inter-tight-400-normal-latin.woff2") format("woff2"); font-weight: 400 700; }
      @font-face { font-family: "JetBrains Mono"; src: url("http://cv.local/fonts/jetbrains-mono-400-normal-custom.woff2") format("woff2"); font-weight: 400 700; }`,
  ),
  { waitUntil: 'networkidle' },
);
await page.evaluate(() => document.fonts.ready);

const pdf = await page.pdf({ format: 'A4', printBackground: true });
await writeFile(resolve(ROOT, 'public/cv.pdf'), pdf);

// `--png <path>` renders the same markup as an image, for eyeballing the layout
// without a PDF viewer. It is a review aid, not a build artefact.
const pngIndex = process.argv.indexOf('--png');
if (pngIndex !== -1 && process.argv[pngIndex + 1]) {
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.screenshot({ path: process.argv[pngIndex + 1], fullPage: true });
}

await browser.close();

console.log(
  `cv.pdf: ${(pdf.length / 1024).toFixed(0)} kB, ${featured.length} projects, ` +
    `${work.length} roles, ${education.length} education entries`,
);
