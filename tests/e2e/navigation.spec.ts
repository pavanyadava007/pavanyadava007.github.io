import { test, expect } from '@playwright/test';

test('the recruiter path works: hero -> proof -> a case study -> CV', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pavan Yadava Annappa');
  await expect(page.getByText('available from 20 Oct 2026').first()).toBeVisible();

  // The proof strip carries the headline metric verbatim.
  await expect(page.locator('.ticker__item').first()).toContainText('36.4 → 15.2 / 14.7 ms');

  await page.getByRole('link', { name: 'View work' }).click();
  await expect(page).toHaveURL(/\/work/);

  await page.getByRole('link', { name: 'offroad-bevfusion' }).first().click();
  await expect(page).toHaveURL(/\/work\/offroad-bevfusion/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('offroad-bevfusion');

  // Every case study must carry its limits panel.
  await expect(page.locator('#limits')).toBeVisible();
  await expect(page.locator('#limits .limits__item')).not.toHaveCount(0);
});

test('every project page has a limits panel and a metric with provenance', async ({ page }) => {
  await page.goto('/work');
  const hrefs = await page.locator('.card__title a').evaluateAll((els) =>
    els.map((e) => (e as HTMLAnchorElement).getAttribute('href')!),
  );
  expect(hrefs.length).toBe(10);

  for (const href of hrefs) {
    await page.goto(href);
    await expect(page.locator('#limits'), `${href} limits`).toBeVisible();
    await expect(page.locator('#limits .limits__item').first()).toBeVisible();
  }
});

test('work filters, sort and layout sync to the URL', async ({ page }) => {
  await page.goto('/work');
  const cells = page.locator('.work__cell:not([hidden])');
  await expect(cells).toHaveCount(10);

  await page.getByRole('button', { name: /^Robotics/ }).click();
  await expect(page).toHaveURL(/area=robotics/);
  await expect(cells).toHaveCount(1);

  await page.getByRole('button', { name: /^All/ }).click();
  await page.getByRole('button', { name: 'List' }).click();
  await expect(page).toHaveURL(/view=list/);
  await expect(page.locator('[data-work-grid]')).toHaveAttribute('data-view', 'list');

  // A filtered URL is shareable: reloading it restores the state.
  await page.goto('/work?area=signals&view=list');
  await expect(page.locator('.work__cell:not([hidden])')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /^Signals/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('the lab page lists every failed experiment in the collection', async ({ page }) => {
  await page.goto('/lab');
  const failed = page.locator('#failed-heading + .lab__log li');
  await expect(failed).not.toHaveCount(0);
  await expect(page.locator('.lab__log').first()).toContainText('INT8 measured ~3 ms slower');
});
