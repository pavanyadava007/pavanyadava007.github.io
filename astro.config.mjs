// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import pagefind from 'astro-pagefind';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://pavanyadava007.github.io',
  output: 'static',
  trailingSlash: 'ignore',
  compressHTML: true,
  integrations: [react(), mdx(), sitemap(), pagefind()],
  vite: {
    plugins: [tailwindcss()],
    build: { cssCodeSplit: false },
  },
  image: { responsiveStyles: true },
});
