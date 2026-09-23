# pavanyadava007.github.io

Portfolio v2. Astro 7 static site, deployed to GitHub Pages.

Positioning: perception engineer who ships to hardware, every number measured.
The build spec is in [CLAUDE.md](CLAUDE.md); this file records how to run it and
where it deviates from that spec.

## Run it

```bash
npm ci
npm run dev            # dev server
npm run build          # -> dist/
npm run serve          # serve dist/ the way GitHub Pages does, on :4322
```

## The gates

```bash
npm run lint           # eslint + prettier
npm run typecheck      # astro check
npm run verify:metrics # every published number still matches its source snapshot
npm run check:budgets  # initial JS on /, media file sizes, 3D chunk stays lazy
npm run test:e2e       # Playwright: 48 axe checks + 28 behaviour tests
npx @lhci/cli autorun  # Lighthouse budgets
```

CI runs all of these on every push. `deploy.yml` publishes from `main` only, after
CI on that commit is green.

**Deploying needs one manual change**: Settings → Pages → Build and deployment →
Source must be set to **GitHub Actions**. While it is still "Deploy from a branch",
`deploy.yml` will fail and the old branch deploy keeps serving.

## Numeric integrity

Every metric rendered on the site lives in `src/content/projects/*.mdx` frontmatter
with its `hardware`, `dataset`, `n` and `source`. `data/source-snapshot.json` is
scraped from the previous site (`npm run snapshot`), and `npm run verify:metrics`
fails the build if any rendered value is not in that snapshot or in the explicit
`ALLOWED_NEW` list in `scripts/verify-metrics.ts`, which names the repo file each
addition was copied from.

Adding a number to this site is therefore a deliberate, reviewable act. 24 metrics
across 10 projects are currently under the gate.

Every project also carries a `limits` array. `/lab` assembles the negative-results
log from those arrays, so it cannot drift from the case studies.

## Regenerating assets

These outputs are committed so the site build needs no network and no ffmpeg:

```bash
npm run build:fonts    # download + subset the three families, write src/styles/fonts.css
npm run build:poster   # render public/hero-poster*.{avif,webp,jpg} from the 3D scene
npm run build:cv       # render public/cv.pdf from src/content (--png to preview)
./scripts/optimize-media.sh   # re-encode assets/ -> public/media (needs ffmpeg)
```

`scripts/build-poster.ts` and the live hero both import `src/lib/bev-scene.ts`, so
the static poster is the same scene as the WebGL one and cannot drift from it.

## Deviations from CLAUDE.md, and why

| Spec | Built | Reason |
|---|---|---|
| Astro 5 | **Astro 7** | Every Astro advisory at or below 7.2.7, including a critical one, is fixed only in the 7.x line. |
| three.js via `@react-three/fiber` + `drei` | **raw three.js**, dynamically imported | The hero is one `Points`, one `LineSegments` and a camera. R3F + drei would put a React runtime on a page whose entire initial JS budget is 90 kB. Measured: 6.5 kB gz initial JS, three.js chunk lazy. |
| GSAP ScrollTrigger for the hero scrub | **native scroll + rAF** | The scrub is a lerp between two camera poses. GSAP is ~70 kB for that. |
| Visx or D3 for charts | **d3-scale / d3-shape at build time** | Scales run in the Astro frontmatter and the SVG ships complete, so every chart renders and is readable with JavaScript disabled. Client scripts only add the Pareto radius toggle, the SNR brush and the canary replay. |
| Fonts: Fraunces or Newsreader for display | **Instrument Serif** | Both spec choices are variable fonts that stay 45-80 kB even glyph-subset, and a display face is fetched at VeryHigh priority *ahead of* the LCP image. Instrument Serif is a static display serif at 17 kB. Measured. |
| `font-display: swap` | **`font-display: optional`** | With metric-matched fallbacks a swap still changes a large heading's line count, which moved the whole hero: CLS 0.233. `optional` cannot shift; the real face renders from cache on any later view. |
| React islands for the proof strip | **plain Astro + ~1 kB script** | Same reason as the hero: React is most of the 90 kB budget. The command palette keeps React and `cmdk`, code-split and fetched on first ⌘K. |
| Analytics (Plausible / GoatCounter) | **not added** | Needs an account and a domain registered with a third party. It is also the only thing that would break the "no third-party request before a click" test. |
| `astro preview` for tests | **`scripts/serve-dist.mjs`** | Astro 7's preview is a singleton daemon a test runner cannot own. The replacement matches GitHub Pages' path resolution exactly, which is what we deploy to. |

## Known gaps

- **`<CompareSlider/>` is implemented and unused.** It needs a matched pair of rviz
  screenshots of the *same* GOOSE frame, zero-shot and fine-tuned, and only the
  fine-tuned replay exists. Drop the pair into `src/assets/`, register them in
  `src/lib/media.ts`, and the slider activates. Until then the offroad case study
  reports IoU 0.021 → 0.348 as numbers, and says so in a TODO in the MDX.
- **The in-browser onnxruntime-web demo (spec §5.6) is not built.** It is marked a
  stretch item; it needs the 3.17 MB INT8 ONNX plus bundled sample images, and it
  would be the largest single asset on the site.
- **LCP on `/` measures 2039 ms against the spec's < 2000 ms**, on Lighthouse's
  simulated mobile link. Every other page is ~1500 ms. The remaining cost is the
  three self-hosted font files on the critical path; the honest options are dropping
  the display or mono family, which is a design decision rather than a code one.

## Layout

```
src/
  content/{projects,experience,skills}/   typed content, Zod-validated
  content.config.ts                       the metric and limit schemas
  components/                             charts/, hero/, cards, panels
  layouts/{Base,CaseStudy}.astro
  pages/                                  index, work/, lab, about, 404, og/
  lib/                                    bev-scene, media, seo, site, format
scripts/                                  scrape, verify, fonts, poster, cv, media, budgets, serve
tests/                                    a11y.spec.ts + e2e/
data/                                     legacy-index.html, source-snapshot.json
```
