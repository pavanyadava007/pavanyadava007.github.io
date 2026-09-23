/**
 * Live BEV point-cloud hero.
 *
 * Loaded dynamically, after load + idle, and only when the device passes the checks in
 * HeroPoster.astro - so three.js never touches the LCP path. The scene matches
 * scripts/build-poster.ts exactly at scroll 0, which is what makes the hand-off from
 * the static poster invisible.
 *
 * Raw three.js rather than react-three-fiber: the hero is one Points object, one
 * LineSegments object and a camera, and R3F plus drei would add a React runtime to a
 * page whose whole initial JS budget is 90 kB.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';
import { generateSweep, BOXES, CLASS_COLOR, boxCorners, EGO, type Box } from '~/lib/bev-scene';

const FULL_POINTS = 60_000;
const REDUCED_POINTS = 20_000;

/** Camera at scroll 0 - identical to the poster's camera. */
const START = { pos: new Vector3(0, 6.2, -24), look: new Vector3(0, -1.2, 6) };
/** Camera at scroll 1 - straight down, the BEV view the work is actually about. */
const END = { pos: new Vector3(0, 46, 0.001), look: new Vector3(0, -1.7, 4) };

const VERTEX = /* glsl */ `
  uniform float uSize;
  uniform float uScan;
  uniform float uPixelRatio;
  attribute float aIntensity;
  varying float vAlpha;
  varying float vScan;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;

    float dist = -mv.z;
    // Size attenuation: nearer returns are larger, clamped so the far field stays crisp.
    gl_PointSize = clamp(uSize * uPixelRatio * (34.0 / max(dist, 1.0)), 0.9, 5.0);

    // Distance fade, so the sweep dissolves into the background instead of ending.
    float fade = 1.0 - smoothstep(18.0, 54.0, length(position.xz));
    vAlpha = aIntensity * mix(0.18, 1.0, fade);

    // The rotating scan line: brighten a narrow wedge of bearing around uScan.
    float bearing = atan(position.z, position.x);
    float delta = abs(mod(bearing - uScan + 3.14159265, 6.28318531) - 3.14159265);
    vScan = smoothstep(0.55, 0.0, delta);
  }
`;

const FRAGMENT = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform vec3 uScanColor;
  varying float vAlpha;
  varying float vScan;

  void main() {
    // Round points, cheaper than a texture lookup.
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;

    vec3 color = mix(uColor, uScanColor, vScan * 0.85);
    float alpha = vAlpha * (1.0 + vScan * 1.6) * smoothstep(0.25, 0.04, d);
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;

function boxEdges(b: Box | (Omit<Box, 'cls'> & { cls: Box['cls'] })): number[] {
  const corners = boxCorners(b as Box);
  const y0 = -1.7;
  const y1 = -1.7 + b.h;
  const out: number[] = [];
  const push = (a: [number, number], c: [number, number], y: number) =>
    out.push(a[0], y, a[1], c[0], y, c[1]);
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const c = corners[(i + 1) % 4];
    push(a, c, y0);
    push(a, c, y1);
    out.push(a[0], y0, a[1], a[0], y1, a[1]);
  }
  return out;
}

export interface HeroSceneHandle {
  destroy(): void;
}

export function startHeroScene(canvas: HTMLCanvasElement, host: HTMLElement): HeroSceneHandle {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(0x07080a, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(54, 1, 0.5, 220);

  // ---- points ----
  const material = new ShaderMaterial({
    uniforms: {
      uSize: { value: 2.1 },
      uScan: { value: 0 },
      uPixelRatio: { value: 1 },
      uColor: { value: new Color(0x6fd9de) },
      uScanColor: { value: new Color(0xd6fbfd) },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const geometry = new BufferGeometry();
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  function fill(count: number) {
    const { positions, intensity } = generateSweep({ count });
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('aIntensity', new BufferAttribute(intensity, 1));
    geometry.attributes.position.needsUpdate = true;
  }
  fill(FULL_POINTS);

  // ---- wireframe boxes, one LineSegments per class so each keeps its colour ----
  const boxGroups = (['car', 'pedestrian', 'cyclist'] as const).map((cls) => {
    const verts = BOXES.filter((b) => b.cls === cls).flatMap(boxEdges);
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(verts, 3));
    const m = new LineBasicMaterial({
      color: new Color(CLASS_COLOR[cls]),
      transparent: true,
      opacity: 0.35,
    });
    const ls = new LineSegments(g, m);
    ls.frustumCulled = false;
    scene.add(ls);
    return m;
  });

  const egoGeom = new BufferGeometry();
  egoGeom.setAttribute(
    'position',
    new Float32BufferAttribute(
      boxEdges({ x: 0, z: 0, w: EGO.w, l: EGO.l, h: EGO.h, yaw: 0, cls: 'car' }),
      3,
    ),
  );
  const egoMat = new LineBasicMaterial({ color: 0xe8eaed, transparent: true, opacity: 0.8 });
  scene.add(new LineSegments(egoGeom, egoMat));

  // ---- state ----
  let width = 0;
  let height = 0;
  let scroll = 0;
  let parallaxX = 0;
  let parallaxY = 0;
  let running = false;
  let raf = 0;
  let downgraded = false;
  let slowFrames = 0;
  let last = 0;
  let ready = false;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function resize() {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    // Cap the pixel ratio: a 3x phone screen triples fragment work for no visible gain.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    material.uniforms.uPixelRatio.value = dpr;
  }

  function readScroll() {
    const vh = window.innerHeight || 1;
    scroll = Math.min(1, Math.max(0, window.scrollY / vh));
    host.style.setProperty('--hero-p', scroll.toFixed(3));
  }

  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    // +/- 3 degrees, as a fraction of the viewport from centre.
    parallaxX = (e.clientX / window.innerWidth - 0.5) * 2;
    parallaxY = (e.clientY / window.innerHeight - 0.5) * 2;
  };

  const tmp = new Vector3();

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (!running) return;

    const dt = last ? now - last : 16;
    last = now;

    // Auto-downgrade: 30 consecutive frames over 20 ms means this GPU cannot hold 50 fps.
    if (!downgraded && ready) {
      slowFrames = dt > 20 ? slowFrames + 1 : 0;
      if (slowFrames >= 30) {
        downgraded = true;
        fill(REDUCED_POINTS);
        material.uniforms.uSize.value = 2.6;
      }
    }
    ready = true;

    // easeInOutCubic on the scrub, so the orbit settles at both ends.
    const p = scroll < 0.5 ? 4 * scroll ** 3 : 1 - Math.pow(-2 * scroll + 2, 3) / 2;

    const radians = (3 * Math.PI) / 180;
    camera.position.lerpVectors(START.pos, END.pos, p);
    camera.position.x += Math.sin(parallaxX * radians) * 14 * (1 - p * 0.6);
    camera.position.y += -parallaxY * 0.9 * (1 - p);
    tmp.lerpVectors(START.look, END.look, p);
    camera.lookAt(tmp);
    // Keep "forward" stable as the camera passes overhead, or the view rolls.
    camera.up.set(0, 1 - p, p);

    material.uniforms.uScan.value = (now / 1000) * Math.PI; // ~0.5 rev/s
    const boxOpacity = 0.3 + p * 0.65;
    boxGroups.forEach((m) => (m.opacity = boxOpacity));
    egoMat.opacity = 0.55 + p * 0.4;

    renderer.render(scene, camera);
  }

  function start() {
    if (running || reduced.matches) return;
    running = true;
    last = 0;
    host.dataset.sceneReady = '';
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
  }

  // Pause when the hero leaves the viewport, and when the tab is hidden.
  const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), {
    threshold: 0,
  });
  io.observe(host);

  const onVisibilityChange = () => {
    if (document.hidden) stop();
    else if (host.getBoundingClientRect().bottom > 0) start();
  };

  const onResize = () => {
    resize();
    readScroll();
  };
  const onScroll = () => readScroll();
  const onReducedChange = () => {
    if (reduced.matches) {
      stop();
      delete host.dataset.sceneReady;
    } else start();
  };

  resize();
  readScroll();
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  reduced.addEventListener('change', onReducedChange);

  return {
    destroy() {
      stop();
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      reduced.removeEventListener('change', onReducedChange);
      geometry.dispose();
      material.dispose();
      egoGeom.dispose();
      egoMat.dispose();
      renderer.dispose();
      delete host.dataset.sceneReady;
    },
  };
}
