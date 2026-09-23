/**
 * Mounts the React command palette. This module is only ever reached through a
 * dynamic import from PaletteLoader.astro, so React and cmdk are code-split out of
 * the initial bundle and cost nothing until someone presses Cmd-K.
 */
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import CommandPalette from '~/components/CommandPalette';
import type { PaletteItem } from '~/lib/palette';

let root: Root | null = null;

export async function mountPalette(items: PaletteItem[], host: HTMLElement) {
  if (!root) root = createRoot(host);
  root.render(createElement(CommandPalette, { items, startOpen: true }));
}
