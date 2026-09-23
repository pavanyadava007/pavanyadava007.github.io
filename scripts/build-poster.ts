/**
 * Render the hero poster from the same procedural scene the 3D hero uses.
 *
 * The poster is the LCP element on `/` and the fallback for reduced-motion,
 * no-WebGL and save-data. It is generated, not drawn, so it can never drift
 * from the live scene.
 *
 *   npx tsx scripts/build-poster.ts
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { generateSweep, BOXES, CLASS_COLOR, boxCorners, EGO, SEED } from '../src/lib/bev-scene.ts';

const ROOT = resolve(import.meta.dirname, '..');
const W = 1600;
const H = 900;

/** Same camera the hero starts at: raised, looking down the corridor. */
const CAM = { y: 6.2, z: -24, pitch: 0.13, fov: 54 };

function project(x: number, y: number, z: number) {
  const ry = y - CAM.y;
  const rz = z - CAM.z;
  const cp = Math.cos(CAM.pitch);
  const sp = Math.sin(CAM.pitch);
  /** Pitch the camera down by CAM.pitch: rotate the world about x by +pitch. */
  const vy = ry * cp + rz * sp;
  const vz = -ry * sp + rz * cp;
  if (vz <= 0.4) return null;
  const f = H / 2 / Math.tan((CAM.fov * Math.PI) / 180 / 2);
  return { sx: W / 2 + (x * f) / vz, sy: H / 2 - (vy * f) / vz, depth: vz };
}

const { positions, intensity } = generateSweep({ count: 60_000, seed: SEED });

/** Points, painted back to front so near returns sit on top. */
const pts: { sx: number; sy: number; d: number; i: number }[] = [];
for (let i = 0; i < intensity.length; i++) {
  const p = project(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
  if (!p || p.sx < -40 || p.sx > W + 40 || p.sy < -40 || p.sy > H + 40) continue;
  pts.push({ sx: p.sx, sy: p.sy, d: p.depth, i: intensity[i] });
}
pts.sort((a, b) => b.d - a.d);

const pointMarkup = pts
  .map((p) => {
    const r = Math.max(0.42, Math.min(1.5, 20 / p.d));
    const o = (0.1 + p.i * 0.62) * Math.max(0.07, Math.min(1, 16 / p.d));
    return `<circle cx="${p.sx.toFixed(1)}" cy="${p.sy.toFixed(1)}" r="${r.toFixed(2)}" fill="#8ef0f4" opacity="${o.toFixed(3)}"/>`;
  })
  .join('');

/** Wireframe 3D boxes: bottom rectangle, top rectangle, four uprights. */
function boxMarkup(b: (typeof BOXES)[number], color: string) {
  const corners = boxCorners(b);
  const bottom = corners.map(([x, z]) => project(x, -1.7, z));
  const top = corners.map(([x, z]) => project(x, -1.7 + b.h, z));
  if (bottom.some((p) => !p) || top.some((p) => !p)) return '';
  const path = (ps: (ReturnType<typeof project> | null)[]) =>
    ps.map((p, i) => `${i ? 'L' : 'M'}${p!.sx.toFixed(1)},${p!.sy.toFixed(1)}`).join('') + 'Z';
  const uprights = corners
    .map(
      (_, i) =>
        `M${bottom[i]!.sx.toFixed(1)},${bottom[i]!.sy.toFixed(1)}L${top[i]!.sx.toFixed(1)},${top[i]!.sy.toFixed(1)}`,
    )
    .join('');
  return (
    `<path d="${path(bottom)}" fill="${color}" fill-opacity="0.06" stroke="${color}" stroke-width="1.6" stroke-opacity="0.85"/>` +
    `<path d="${path(top)}" fill="none" stroke="${color}" stroke-width="1.3" stroke-opacity="0.6"/>` +
    `<path d="${uprights}" fill="none" stroke="${color}" stroke-width="1.1" stroke-opacity="0.45"/>`
  );
}

const boxes = [...BOXES]
  .sort((a, b) => b.z - a.z)
  .map((b) => boxMarkup(b, CLASS_COLOR[b.cls]))
  .join('');

const ego = boxMarkup({ x: 0, z: 0, w: EGO.w, l: EGO.l, h: EGO.h, yaw: 0, cls: 'car' }, '#e8eaed');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <radialGradient id="vig" cx="50%" cy="46%" r="72%">
    <stop offset="0%" stop-color="#0d1015"/><stop offset="100%" stop-color="#070809"/>
  </radialGradient>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M40 0H0V40" fill="none" stroke="#5ce1e6" stroke-opacity="0.055" stroke-width="1"/>
  </pattern>
</defs>
<rect width="${W}" height="${H}" fill="url(#vig)"/>
<rect width="${W}" height="${H}" fill="url(#grid)"/>
${pointMarkup}
${boxes}
${ego}
</svg>`;

const png = await sharp(Buffer.from(svg)).png().toBuffer();

/**
 * Two widths. The poster is the LCP element, so a phone must not download the
 * desktop one - on a simulated mobile link those bytes are the whole LCP budget.
 */
const SIZES = [
  { suffix: '-sm', width: 820, avif: 38, webp: 60 },
  { suffix: '-md', width: 1100, avif: 44, webp: 66 },
  { suffix: '', width: 1600, avif: 50, webp: 72 },
];

for (const { suffix, width, avif, webp } of SIZES) {
  const base = sharp(png).resize({ width });
  await writeFile(
    resolve(ROOT, `public/hero-poster${suffix}.avif`),
    await base.clone().avif({ quality: avif }).toBuffer(),
  );
  await writeFile(
    resolve(ROOT, `public/hero-poster${suffix}.webp`),
    await base.clone().webp({ quality: webp }).toBuffer(),
  );
  await writeFile(
    resolve(ROOT, `public/hero-poster${suffix}.jpg`),
    await base.clone().jpeg({ quality: 74, progressive: true }).toBuffer(),
  );
}
console.log(
  `hero poster: ${pts.length} visible points, ${BOXES.length} boxes, ${SIZES.length} widths`,
);
