import { getCollection } from 'astro:content';
import { site } from './site';

export interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  group: 'Projects' | 'Pages' | 'Links' | 'Actions';
  /** Navigate to this URL. */
  href?: string;
  /** Or run a named built-in action. */
  action?: 'theme' | 'copy-email';
  external?: boolean;
}

/** Built once at build time and embedded in the page - the palette needs no network. */
export async function buildPaletteItems(): Promise<PaletteItem[]> {
  const projects = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);

  return [
    ...projects.map((p) => ({
      id: `project:${p.id}`,
      label: p.data.title,
      hint: p.data.kicker,
      group: 'Projects' as const,
      href: `/work/${p.id}`,
    })),
    { id: 'page:home', label: 'Home', group: 'Pages', href: '/' },
    { id: 'page:work', label: 'All work', group: 'Pages', href: '/work' },
    { id: 'page:lab', label: 'Lab & negative results', group: 'Pages', href: '/lab' },
    { id: 'page:about', label: 'About & timeline', group: 'Pages', href: '/about' },
    { id: 'link:cv', label: 'Download CV (PDF)', group: 'Links', href: site.cv },
    {
      id: 'link:github',
      label: 'GitHub',
      hint: 'pavanyadava007',
      group: 'Links',
      href: site.social.github,
      external: true,
    },
    {
      id: 'link:linkedin',
      label: 'LinkedIn',
      group: 'Links',
      href: site.social.linkedin,
      external: true,
    },
    {
      id: 'link:hf',
      label: 'Hugging Face',
      group: 'Links',
      href: site.social.huggingface,
      external: true,
    },
    { id: 'action:email', label: 'Copy email address', hint: site.email, group: 'Actions', action: 'copy-email' },
    { id: 'action:theme', label: 'Toggle dark / light theme', group: 'Actions', action: 'theme' },
  ];
}
