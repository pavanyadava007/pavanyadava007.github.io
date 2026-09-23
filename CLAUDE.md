# Portfolio v2 — Claude Code Build Spec

Target: rebuild `pavanyadava007.github.io` as a research-lab-grade interactive portfolio (reference tier: Google DeepMind, Waymo Research, NVIDIA Research, Linear, Vercel).
Positioning: **"Perception engineer who ships to hardware — every number measured."**

---

## 0. How to use this file

1. Create an empty repo or branch `v2` in `pavanyadava007.github.io`.
2. Save this file as `CLAUDE.md` in the repo root.
3. Start Claude Code in the repo and paste the kickoff prompt below.
4. Run phases in order; review after each phase (`npm run build && npm run preview`).

### Kickoff prompt (paste into Claude Code)

```
Read CLAUDE.md fully. Build the portfolio exactly as specified, phase by phase.
Before each phase: state the plan in ≤10 lines. After each phase: run lint, typecheck,
build, Lighthouse CI, and Playwright; fix failures before continuing.
Content source of truth: the live site https://pavanyadava007.github.io/ — scrape it
into src/content/ first (Phase 1). Never invent, round, or alter any metric,
date, dataset name, or hardware name. If a number is missing, leave a TODO, do not guess.
Commit after each phase with a conventional-commit message.
```

---

## 1. Non-negotiable rules

- **Numeric integrity:** every metric copied verbatim from current site/repos; each metric carries `hardware`, `dataset`, `n`, `source` (link to RESULTS.md). No synthetic numbers in UI demos unless labelled `illustrative`.
- **Honest-limits blocks preserved** for every project — this is the differentiator; design it as a first-class component, not a footnote.
- **Static output only** (GitHub Pages). No server, no secrets, no client API keys.
- **Performance budget:** Lighthouse ≥ 95 all categories (mobile); LCP < 2.0 s; CLS < 0.05; INP < 200 ms; initial JS ≤ 90 kB gz on `/`; 3D bundle lazy-loaded, never blocks LCP.
- **Accessibility:** WCAG 2.2 AA; full keyboard nav; visible focus; `prefers-reduced-motion` disables all motion and swaps 3D hero for static poster; alt text on every image; charts have table fallback.
- **Language:** English only.
- **No stock imagery, no emoji decoration, no gradient-blob clichés, no "AI sparkle" icons.**

---

## 2. Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Astro 5** (static) + React 19 islands | Zero-JS by default, per-component hydration |
| Language | TypeScript strict | — |
| Styling | Tailwind CSS v4 + CSS custom properties (design tokens) | — |
| Content | Astro Content Collections + MDX, Zod schemas | Typed metrics |
| 3D | three.js via `@react-three/fiber` + `@react-three/drei`, `client:visible` | Hero + BEV viewer |
| Motion | Motion (Framer Motion) for UI; GSAP ScrollTrigger only for hero scroll scrub | — |
| Charts | Visx or D3 (SVG, themeable, accessible) | Pareto/latency charts |
| Search | Pagefind (static) + ⌘K palette (`cmdk`) | — |
| Fonts | Self-hosted: **Inter Tight** (UI), **Newsreader** or **Fraunces** (display), **JetBrains Mono** (numbers/code) | No FOUT, `font-display: swap`, subset |
| Analytics | Plausible or GoatCounter (cookie-less) | GDPR, no banner |
| OG images | `astro-og-canvas` / Satori, one per project | Share previews |
| Test | Vitest, Playwright (+ axe), Lighthouse CI | — |
| CI/CD | GitHub Actions → GitHub Pages | — |

---

## 3. Information architecture

```
/                      Home (hero, proof strip, featured work, experience, skills, contact)
/work                  Filterable project index (grid + list toggle)
/work/[slug]           Case study (one per project)
/lab                   "Also on the bench" + negative-results log
/about                 Longer bio, timeline, safety/process philosophy, CV download
/cv.pdf                Generated from content (Phase 7)
/404
```

Slugs: `langgrasp`, `offroad-bevfusion`, `aeroedge`, `makerspace-reuse-scanner`, `sigint-fusion`, `hw-validation-agent`, `sparsedrive`, `embedded-codegen-lm`, `scalable-4d-perception`, `latentsync-optimization`.

---

## 4. Visual design system

### Concept: "Sensor Console"
Dark instrumentation aesthetic — oscilloscope, rviz, BEV grid — restrained and precise. Data is the decoration.

### Tokens (`src/styles/tokens.css`)
```css
:root {
  --bg: #0A0B0D;  --bg-elev: #111317;  --bg-sunk: #07080A;
  --line: #1F232A; --line-strong: #2E343D;
  --fg: #E8EAED;  --fg-muted: #9AA1AC; --fg-dim: #5F6670;
  --accent: #5CE1E6;      /* LiDAR cyan — primary */
  --accent-2: #FFB547;    /* radar amber — warnings/limits */
  --ok: #4ADE80; --fail: #F87171;
  --grid: rgba(92,225,230,0.06);
  --radius: 10px; --radius-sm: 6px;
  --ease: cubic-bezier(.2,.8,.2,1);
  --maxw: 1200px;
}
:root[data-theme="light"] {
  --bg:#FAFAF8; --bg-elev:#FFFFFF; --bg-sunk:#F1F1EE; --line:#E4E4E0; --line-strong:#CFCFCA;
  --fg:#0E1013; --fg-muted:#4B5260; --fg-dim:#8A909A;
  --accent:#0E8A91; --accent-2:#B86E00; --grid: rgba(14,138,145,0.07);
}
```
- Type scale: fluid `clamp()`; display 56–96 px, h2 32–44, body 17/1.6, mono metrics 28–40 px tabular-nums.
- Layout: 12-col grid, 24 px gutters; subtle 40 px background BEV grid (`--grid`) on hero and section dividers only.
- Motion: 200–400 ms, `--ease`; no bounce; stagger 40 ms max.
- Theme toggle: dark default, respects `prefers-color-scheme`, persisted in `localStorage` (try/catch).

---

## 5. Signature interactive components

### 5.1 Hero — live BEV point-cloud scene (`<HeroScene/>`)
- Procedurally generated LiDAR sweep: ~60k points in rings, ego vehicle at centre, 6–10 wireframe 3D boxes (car/pedestrian/cyclist colour-coded), rotating scan line (10 Hz feel).
- Scroll scrub (0–100 vh): camera orbits from perspective to top-down BEV; boxes resolve; overlay labels appear: `Camera → LiDAR → Radar → BEV fusion → TensorRT → ROS 2`.
- Mouse parallax ±3°. Pauses when off-screen (IntersectionObserver) and when tab hidden.
- Points in a single `THREE.Points` with custom shader (size attenuation, distance fade). Target 60 fps on integrated GPU; auto-downgrade to 20k points if frame time > 20 ms for 30 frames.
- Fallback: static WebP/AVIF poster rendered from the same scene (`public/hero-poster.avif`) for reduced-motion, no-WebGL, and as LCP element.
- Do **not** use nuScenes raw data (licence); procedural only. Optionally a user-supplied `.ply` from own GOOSE run if licence allows — flag for manual confirmation.

Hero copy (left column, over scene):
```
Pavan Yadava Annappa
ML Engineer — 3D Perception, Sensor Fusion & Edge Deployment
From BEV fusion to TensorRT on the metal. Every number measured on stated hardware.
[View work]  [Download CV]      Nürnberg, DE · available from 20 Oct 2026
```

### 5.2 Proof strip (`<MetricTicker/>`)
Horizontal band of 4–6 headline metrics in mono, count-up on enter (disabled under reduced motion). Each has a tooltip with hardware/dataset/source. Examples (verbatim):
- `36.4 → 15.2 ms` PyTorch FP32 → TensorRT FP16, NVIDIA L4 (offroad-bevfusion)
- `115/120` language-guided placements (LangGrasp)
- `10.61 → 3.17 MB` INT8, 20-device OTA canary, 0 failures (AeroEdge)
- `F1 0.531 → 0.900` spec-limit screen → supervised RF (HW validation agent)

### 5.3 Project cards (`<ProjectCard/>`)
- Poster image/video (muted autoplay loop only on hover/focus; `preload="none"`).
- Title, one-line claim, 3 metric chips, stack tags, status badge (`Live demo` / `New` / `Private` / `Design study`).
- Hover: 1 px accent border sweep + slight lift; keyboard focus identical.
- `/work` index: filter chips (Perception · Edge/MLOps · Robotics · LLM/RAG · Signals), sort (recent / impact), grid↔list toggle, URL-synced state.

### 5.4 Case-study template (`/work/[slug]`)
Sticky left rail TOC (scrollspy) + right content. Sections in fixed order:
1. **TL;DR** — 2 sentences + 4 metric cards.
2. **Problem & constraints** (hardware, budget, safety standard).
3. **System architecture** — interactive diagram (`<ArchDiagram/>`): SVG nodes; hover a node → highlights data path + shows latency/params; click → scrolls to detail.
4. **Pipeline latency waterfall** (`<LatencyWaterfall/>`): stacked horizontal bars per stage (e.g. LangGrasp: grounding 275 ms, segmentation 13 ms, depth fusion 3.5 ms …).
5. **Results** — interactive charts + table toggle.
6. **Ablations** — before/after toggle.
7. **Honest limits** (`<LimitsPanel/>`): amber-bordered panel, icon-free, always expanded; each item typed `failed | not-measured | small-n | sim-only`.
8. **Demo embed** — HF Space via click-to-load iframe (facade pattern; no third-party load until click).
9. **Links** — code, RESULTS.md, model card, hazard analysis.
10. Prev/next project nav.

### 5.5 Interactive charts
- **Pareto explorer** (AeroEdge): latency vs mAP scatter, FP32→INT8 arrows, dashed Pareto front, hover tooltips, toggle "show file size as point radius". Table fallback always rendered in DOM.
- **Before/after slider** (`<CompareSlider/>`) for GOOSE zero-shot vs fine-tuned BEV seg (IoU 0.021 → 0.348), rviz screenshots.
- **Per-SNR accuracy curve** (SIGINT-Fusion) with SNR range brush.
- **Canary rollout replay** (AeroEdge): 20 device dots animating 5% → 50% → 100% with timestamps (90.6 s) and an "abort" button replaying rollback (4.7 s). Label: `replay of measured run`.

### 5.6 In-browser model demo (stretch, Phase 6)
- AeroEdge INT8 ONNX (3.17 MB) running via **onnxruntime-web (WASM/WebGPU)** on 3–5 bundled sample aerial images; show boxes + measured browser latency with device caveat ("your device, not the benchmark hardware"). Lazy-load model only on click.

### 5.7 Global UX
- **⌘K command palette**: jump to any project/section, toggle theme, copy email, open CV/GitHub/HF/LinkedIn.
- Sticky minimal nav with section progress bar.
- Custom cursor: **no** (hurts a11y/perf).
- View Transitions API between index ↔ case study (card image morphs to case-study header).
- `/about` experience timeline: vertical, animated line fill on scroll, each role expandable.
- Footer: availability line, contact, "All benchmarks measured on hardware named beside them."

---

## 6. Content model (`src/content/config.ts`)

```ts
const metric = z.object({
  value: z.string(),            // verbatim, e.g. "36.4 → 15.2 ms"
  label: z.string(),
  hardware: z.string().optional(),
  dataset: z.string().optional(),
  n: z.string().optional(),
  source: z.string().url().optional(),
  illustrative: z.boolean().default(false),
});
const limit = z.object({
  kind: z.enum(['failed','not-measured','small-n','sim-only','other']),
  text: z.string(),
});
projects: defineCollection({ type:'content', schema: z.object({
  title: z.string(), slug: z.string(), order: z.number(),
  kicker: z.string(),            // "Project 02 · perception"
  claim: z.string(),
  status: z.enum(['live','new','private','design-study','pipeline-only']),
  categories: z.array(z.enum(['perception','edge-mlops','robotics','llm-rag','signals','hardware'])),
  stack: z.array(z.string()),
  metrics: z.array(metric).min(1),
  limits: z.array(limit),
  links: z.object({ demo:z.string().url().optional(), code:z.string().url().optional(),
    results:z.string().url().optional(), modelCard:z.string().url().optional(),
    hazard:z.string().url().optional() }),
  poster: z.string(), video: z.string().optional(),
  featured: z.boolean().default(false),
})})
experience: { role, org, location, start, end|null, bullets[] }
skills: { group, items[] }
```

A build-time check (`scripts/verify-metrics.ts`) diffs every `metric.value` against the scraped snapshot `data/source-snapshot.json`; CI fails on mismatch.

---

## 7. Repo structure

```
.
├─ CLAUDE.md
├─ astro.config.mjs
├─ src/
│  ├─ content/{projects,experience,skills}/
│  ├─ components/
│  │  ├─ hero/HeroScene.tsx  hero/HeroPoster.astro
│  │  ├─ MetricTicker.tsx  ProjectCard.astro  LimitsPanel.astro
│  │  ├─ charts/{Pareto,LatencyWaterfall,SnrCurve,CanaryReplay}.tsx
│  │  ├─ ArchDiagram.tsx  CompareSlider.tsx  DemoFacade.astro
│  │  ├─ CommandPalette.tsx  ThemeToggle.tsx  Nav.astro  Footer.astro
│  ├─ layouts/{Base,CaseStudy}.astro
│  ├─ pages/{index,work/index,work/[slug],lab,about,404}.astro
│  ├─ styles/{tokens.css,global.css}
│  └─ lib/{seo.ts,format.ts}
├─ public/{assets/,fonts/,cv.pdf,hero-poster.avif}
├─ scripts/{scrape-site.ts,verify-metrics.ts,build-cv.ts,optimize-media.sh}
├─ tests/{e2e/*.spec.ts,a11y.spec.ts}
└─ .github/workflows/{ci.yml,deploy.yml}
```

---

## 8. Phases & acceptance criteria

| # | Phase | Done when |
|---|---|---|
| 1 | Scaffold + content migration: Astro/TS/Tailwind; scrape live site → MDX + `source-snapshot.json`; copy `/assets` | All 10 projects render as plain pages; `verify-metrics` passes |
| 2 | Design system: tokens, fonts, Base layout, Nav, Footer, theme toggle | Light/dark correct; axe 0 violations |
| 3 | Home: HeroPoster (LCP), MetricTicker, featured cards, experience, skills, contact | Lighthouse mobile ≥95 **before** 3D |
| 4 | HeroScene (3D, lazy) + scroll scrub + fallbacks | Still ≥95; 60 fps desktop; reduced-motion shows poster |
| 5 | Case-study template + ArchDiagram, LatencyWaterfall, LimitsPanel, DemoFacade, Pareto, CompareSlider | Every project fully populated; charts have table fallback |
| 6 | `/work` filters, ⌘K palette, Pagefind, View Transitions; stretch: onnxruntime-web demo, CanaryReplay | Keyboard-only walkthrough passes (Playwright) |
| 7 | SEO/meta: JSON-LD `Person` + `CreativeWork`, OG images, sitemap, robots, canonical; CV PDF generated from content | Rich-results test valid; OG previews correct |
| 8 | CI/CD + QA: Actions (lint, typecheck, verify-metrics, build, Playwright, axe, Lighthouse CI budgets) → Pages | Green pipeline; deployed |

---

## 9. Media pipeline
- Images → AVIF + WebP via `astro:assets`, responsive `srcset`, explicit width/height.
- Videos (`showcase.mp4`, rviz GIF) → H.264 + AV1 MP4, ≤ 2.5 MB each, poster frame, `muted playsinline loop`, no autoplay above the fold except hero poster. Replace GIFs with MP4.
- `scripts/optimize-media.sh` using ffmpeg + sharp.

---

## 10. SEO & recruiter optimisation
- `<title>`: `Pavan Yadava Annappa — ML Engineer, 3D Perception & Edge Deployment`.
- Meta description ≤ 155 chars; per-project descriptions.
- JSON-LD `Person`: jobTitle, knowsAbout (BEV perception, TensorRT, ROS 2, sensor fusion, ISO 26262), sameAs (GitHub, LinkedIn, HF).
- Above-the-fold: availability date, location, CV button, email — reachable in ≤ 1 click.
- Recruiter 30-second path: hero → proof strip → 3 featured cards → CV. Test with a stopwatch.

---

## 11. CI (`.github/workflows/ci.yml` essentials)
```yaml
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint && npm run typecheck
      - run: npm run verify:metrics
      - run: npm run build
      - run: npx playwright install --with-deps chromium && npm run test:e2e
      - run: npx @lhci/cli autorun   # budgets in lighthouserc.json
```
Deploy: `actions/upload-pages-artifact` + `actions/deploy-pages` on `main`.

---

## 12. Review checklist (manual, before going live)
- [ ] Every metric matches source repo RESULTS.md.
- [ ] Experience dates consistent across site, CV and LinkedIn (no overlapping full-time roles without explanation).
- [ ] Honest-limits panels present on all projects.
- [ ] Works on Safari iOS, Firefox, Chrome; 360 px width; no horizontal scroll.
- [ ] No WebGL → poster; reduced motion → no animation.
- [ ] HF Spaces load only on click.
- [ ] Mobile Lighthouse ≥ 95 on `/` and one case study.
