import { test, expect } from '@playwright/test';

test('no third-party request is made until the demo is clicked', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const host = new URL(r.url()).host;
    if (host && !host.startsWith('127.0.0.1') && !host.startsWith('localhost')) {
      external.push(r.url());
    }
  });

  await page.goto('/work/aeroedge', { waitUntil: 'networkidle' });
  expect(external, 'case study loaded third-party resources before any click').toEqual([]);

  await page.getByRole('button', { name: /Load the demo/ }).click();
  await expect(page.locator('#demo iframe')).toHaveAttribute(
    'src',
    'https://huggingface.co/spaces/pavanyadava07/aeroedge',
  );
});

test('every chart ships a table of its own values', async ({ page }) => {
  await page.goto('/work/aeroedge');
  const paretoRows = page.locator('.pareto__table tbody tr');
  await expect(paretoRows).toHaveCount(4);
  await expect(paretoRows.first()).toContainText('12.8 ms');

  await page.goto('/work/langgrasp');
  await expect(page.locator('.wf__table table tbody tr')).toHaveCount(6);

  await page.goto('/work/sigint-fusion');
  await expect(page.locator('.snr__table tbody tr')).toHaveCount(7);
});

test('the Pareto front is computed, not drawn: both FP32 builds are on it', async ({ page }) => {
  await page.goto('/work/aeroedge');
  const rows = await page.locator('.pareto__table tbody tr').evaluateAll((trs) =>
    trs.map((tr) => [...tr.querySelectorAll('th,td')].map((c) => c.textContent!.trim())),
  );
  const front = Object.fromEntries(rows.map((r) => [r[0], r[4]]));
  expect(front['FP32 @416']).toBe('yes');
  expect(front['FP32 @640']).toBe('yes');
  expect(front['INT8 @416']).toBe('no');
  expect(front['INT8 @640']).toBe('no');
});

test('the architecture diagram highlights a node and its edges on hover', async ({ page }) => {
  await page.goto('/work/aeroedge');
  const node = page.locator('[data-node="gates"]').first();
  await node.hover();
  await expect(page.locator('.arch__edge[data-active]')).not.toHaveCount(0);
});

test('reduced motion keeps the poster and skips the 3D scene', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await expect(page.locator('[data-hero-scene]')).not.toHaveAttribute('data-scene-ready', '');
  await expect(page.locator('[data-hero-scene] img')).toBeVisible();
  await ctx.close();
});
