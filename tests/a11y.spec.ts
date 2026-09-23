import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  '/',
  '/work',
  '/lab',
  '/about',
  '/404',
  '/work/langgrasp',
  '/work/offroad-bevfusion',
  '/work/aeroedge',
  '/work/makerspace-reuse-scanner',
  '/work/sigint-fusion',
  '/work/hw-validation-agent',
  '/work/sparsedrive',
];

for (const path of PAGES) {
  for (const theme of ['dark', 'light'] as const) {
    /**
     * The theme is set by the browser's colour-scheme preference, not by toggling
     * `data-theme` after load: colour transitions are 200 ms, and sampling contrast
     * mid-transition reports the colour the page is animating through rather than the
     * one it renders.
     */
    test(`axe: ${path} (${theme})`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: theme });
      const page = await context.newPage();
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`),
      ).toEqual([]);
      await context.close();
    });
  }
}
