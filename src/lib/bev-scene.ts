/**
 * Procedural LiDAR sweep shared by the 3D hero and the static poster, so the
 * poster is literally the same scene rendered ahead of time.
 *
 * Nothing here is real sensor data. nuScenes and GOOSE raw data are licensed and
 * are deliberately not shipped to the browser - this is a synthetic sweep whose
 * only job is to look like the thing the work is about.
 */

/** mulberry32 - small, seeded, and identical in Node and the browser. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SEED = 20261020;

export interface Box {
  x: number;
  z: number;
  w: number;
  l: number;
  h: number;
  yaw: number;
  cls: 'car' | 'pedestrian' | 'cyclist';
}

/** Fixed, hand-placed actors: a repeatable scene beats a random one that is sometimes empty. */
export const BOXES: Box[] = [
  { x: -3.4, z: 12.0, w: 1.9, l: 4.6, h: 1.6, yaw: 0.04, cls: 'car' },
  { x: 3.6, z: 20.5, w: 1.9, l: 4.8, h: 1.6, yaw: -0.02, cls: 'car' },
  { x: -3.6, z: 30.0, w: 2.0, l: 5.2, h: 2.0, yaw: 0.01, cls: 'car' },
  { x: 7.4, z: -9.5, w: 1.9, l: 4.5, h: 1.6, yaw: 3.1, cls: 'car' },
  { x: -9.2, z: 5.5, w: 0.7, l: 0.7, h: 1.75, yaw: 0.5, cls: 'pedestrian' },
  { x: -8.6, z: 8.2, w: 0.7, l: 0.7, h: 1.7, yaw: 0.9, cls: 'pedestrian' },
  { x: 8.8, z: 14.0, w: 0.7, l: 0.7, h: 1.72, yaw: -0.6, cls: 'pedestrian' },
  { x: 5.6, z: 6.5, w: 0.8, l: 1.8, h: 1.7, yaw: 0.06, cls: 'cyclist' },
  { x: -6.0, z: -4.0, w: 0.8, l: 1.8, h: 1.7, yaw: 3.2, cls: 'cyclist' },
];

export const CLASS_COLOR: Record<Box['cls'], string> = {
  car: '#5ce1e6',
  pedestrian: '#ffb547',
  cyclist: '#4ade80',
};

/** Ego vehicle footprint, drawn at the origin. */
export const EGO = { w: 1.9, l: 4.5, h: 1.5 };

export interface SweepOptions {
  /** Number of points to generate. The hero drops to 20k if frame time slips. */
  count: number;
  /** Number of scan rings (a 32-beam sensor feel). */
  rings?: number;
  seed?: number;
}

/**
 * Generate a sweep as a flat Float32Array of xyz triples plus a per-point
 * intensity in 0..1, arranged in rings around the ego vehicle.
 */
export function generateSweep({ count, rings = 48, seed = SEED }: SweepOptions): {
  positions: Float32Array;
  intensity: Float32Array;
} {
  const rand = rng(seed);
  const positions = new Float32Array(count * 3);
  const intensity = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const ring = i % rings;
    /** Rings get sparser and lower with distance, like a real beam pattern. */
    const base = 3.5 + Math.pow(ring / rings, 1.7) * 46;
    const radius = base + (rand() - 0.5) * 0.34;
    const theta = rand() * Math.PI * 2;

    let x = Math.cos(theta) * radius;
    let z = Math.sin(theta) * radius;
    /** Ground plane with a little roll, plus scattered returns from structure. */
    let y = -1.7 + Math.sin(x * 0.07) * 0.16 + (rand() - 0.5) * 0.09;

    /** Points that land inside an actor get lifted onto it, so the boxes have content. */
    for (const b of BOXES) {
      const dx = x - b.x;
      const dz = z - b.z;
      const c = Math.cos(-b.yaw);
      const s = Math.sin(-b.yaw);
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      if (Math.abs(lx) < b.w / 2 && Math.abs(lz) < b.l / 2) {
        y = -1.7 + rand() * b.h;
        break;
      }
    }

    /** A few returns from building facades either side of the corridor. */
    if (rand() > 0.965) {
      x = (rand() > 0.5 ? 1 : -1) * (13 + rand() * 3);
      y = -1.7 + rand() * 7;
      z = (rand() - 0.5) * 90;
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    intensity[i] = 0.25 + (1 - Math.min(1, radius / 50)) * 0.75 * (0.6 + rand() * 0.4);
  }

  return { positions, intensity };
}

/** Corner offsets of a box in its own frame, as [x, z] pairs. */
export function boxCorners(b: Box): [number, number][] {
  const c = Math.cos(b.yaw);
  const s = Math.sin(b.yaw);
  const hw = b.w / 2;
  const hl = b.l / 2;
  return (
    [
      [-hw, -hl],
      [hw, -hl],
      [hw, hl],
      [-hw, hl],
    ] as [number, number][]
  ).map(([lx, lz]) => [b.x + lx * c - lz * s, b.z + lx * s + lz * c] as [number, number]);
}

export const PIPELINE_STAGES = [
  'Camera',
  'LiDAR',
  'Radar',
  'BEV fusion',
  'TensorRT',
  'ROS 2',
] as const;
