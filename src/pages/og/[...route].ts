import { getCollection } from 'astro:content';
import { OGImageRoute } from 'astro-og-canvas';
import { site } from '~/lib/site';

const projects = await getCollection('projects');

/**
 * One share card per page. Keyed by the path the page's `og:image` points at, so
 * /work/aeroedge renders /og/work/aeroedge.png.
 */
const pages: Record<string, { title: string; description: string; kicker: string }> = {
  index: {
    title: site.name,
    description: 'ML Engineer - 3D Perception, Sensor Fusion & Edge Deployment',
    kicker: 'Every number measured on stated hardware',
  },
  work: {
    title: 'Work',
    description: 'Ten projects, every number measured on the hardware it names.',
    kicker: site.name,
  },
  lab: {
    title: 'Lab',
    description: 'Every experiment that failed, did not help, or could not be measured.',
    kicker: site.name,
  },
  about: {
    title: 'About',
    description: 'Perception engineer who ships to hardware.',
    kicker: site.name,
  },
};

for (const p of projects) {
  pages[`work/${p.id}`] = {
    title: p.data.title,
    description: p.data.claim,
    kicker: p.data.kicker,
  };
}

export const { getStaticPaths, GET } = await OGImageRoute({
  pages,
  getImageOptions: (_path, page: (typeof pages)[string]) => ({
    title: page.title,
    description: page.description,
    bgGradient: [
      [10, 11, 13],
      [17, 19, 23],
    ],
    border: { color: [92, 225, 230], width: 8, side: 'inline-start' },
    padding: 72,
    font: {
      title: { size: 68, weight: 'Bold', color: [232, 234, 237], lineHeight: 1.1 },
      description: { size: 30, weight: 'Normal', color: [154, 161, 172], lineHeight: 1.35 },
    },
    fonts: [
      './public/fonts/inter-tight-400-normal-latin.woff2',
      './public/fonts/jetbrains-mono-400-normal-custom.woff2',
    ],
  }),
});
