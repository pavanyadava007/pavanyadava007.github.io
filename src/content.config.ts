import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob, file } from 'astro/loaders';

/**
 * A metric is a number that was measured. `value` is copied verbatim from the
 * source repo's results file and is diffed against data/source-snapshot.json at
 * build time by scripts/verify-metrics.ts. Anything not measured on real
 * hardware has to carry `illustrative: true`.
 */
const metric = z.object({
  value: z.string(),
  label: z.string(),
  hardware: z.string().optional(),
  dataset: z.string().optional(),
  n: z.string().optional(),
  source: z.url().optional(),
  illustrative: z.boolean().default(false),
});

const limit = z.object({
  kind: z.enum(['failed', 'not-measured', 'small-n', 'sim-only', 'other']),
  text: z.string(),
});

const stage = z.object({
  name: z.string(),
  ms: z.number(),
  note: z.string().optional(),
});

const archNode = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  col: z.number(),
  row: z.number(),
  kind: z.enum(['input', 'compute', 'head', 'output', 'guard']).default('compute'),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    kicker: z.string(),
    claim: z.string(),
    description: z.string().max(165),
    status: z.enum(['live', 'new', 'private', 'design-study', 'pipeline-only']),
    categories: z
      .array(z.enum(['perception', 'edge-mlops', 'robotics', 'llm-rag', 'signals', 'hardware']))
      .min(1),
    stack: z.array(z.string()),
    /** Lab entries may have none; verify-metrics.ts enforces >= 1 for anything not `lab`. */
    metrics: z.array(metric).default([]),
    limits: z.array(limit),
    links: z.object({
      demo: z.url().optional(),
      code: z.url().optional(),
      results: z.url().optional(),
      modelCard: z.url().optional(),
      hazard: z.url().optional(),
    }),
    poster: z.string().optional(),
    video: z.string().optional(),
    featured: z.boolean().default(false),
    lab: z.boolean().default(false),
    tldr: z.string().optional(),
    latency: z
      .object({
        /** `stages` = one pipeline broken into steps (bars stack to the total).
         *  `variants` = the same workload on different runtimes (bars are independent). */
        mode: z.enum(['stages', 'variants']).default('stages'),
        title: z.string(),
        caption: z.string(),
        total: z.string(),
        hardware: z.string(),
        stages: z.array(stage).min(2),
      })
      .optional(),
    arch: z
      .object({
        title: z.string(),
        caption: z.string(),
        nodes: z.array(archNode).min(2),
        edges: z.array(z.tuple([z.string(), z.string()])),
      })
      .optional(),
  }),
});

const experience = defineCollection({
  loader: file('./src/content/experience/experience.json'),
  schema: z.object({
    id: z.string(),
    order: z.number(),
    role: z.string(),
    org: z.string(),
    location: z.string().optional(),
    start: z.string(),
    end: z.string().nullable(),
    kind: z.enum(['work', 'education']).default('work'),
    bullets: z.array(z.string()).default([]),
  }),
});

const skills = defineCollection({
  loader: file('./src/content/skills/skills.json'),
  schema: z.object({
    id: z.string(),
    order: z.number(),
    group: z.string(),
    items: z.array(z.string()),
  }),
});

export const collections = { projects, experience, skills };
