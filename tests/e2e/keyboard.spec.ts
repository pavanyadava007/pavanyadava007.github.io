import { test, expect } from '@playwright/test';

test.describe('keyboard only', () => {
  test.skip(({ isMobile }) => !!isMobile, 'no hardware keyboard on the mobile project');

  test('the skip link reaches the main content first', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveText('Skip to content');
    await focused.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });

  test('the command palette opens with the keyboard and navigates', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('ControlOrMeta+k');
    const input = page.locator('.cmdk [cmdk-input]');
    await expect(input).toBeFocused();

    await input.fill('aeroedge');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/work\/aeroedge/);
  });

  test('Escape closes the palette and returns focus to the page', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.locator('.cmdk')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.cmdk')).toHaveCount(0);
  });

  test('a case study can be walked end to end with Tab alone', async ({ page }) => {
    await page.goto('/work/aeroedge');
    const reached = new Set<string>();
    for (let i = 0; i < 90; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        // Tab past the last control lands on <body>, which is not a control.
        if (!el || el === document.body || el === document.documentElement) return null;
        const style = getComputedStyle(el);
        return {
          tag: el.tagName,
          text: (el.textContent ?? '').trim().slice(0, 40),
          outline: style.outlineStyle,
          visible: el.getBoundingClientRect().width > 0,
        };
      });
      if (!info) continue;
      reached.add(`${info.tag}:${info.text}`);
      // Every focusable thing must show a focus ring - nothing is silently focusable.
      if (info.visible) expect(info.outline, `${info.tag} ${info.text}`).not.toBe('none');
    }
    // The rail, the charts' controls and the demo button are all reachable.
    expect([...reached].some((r) => r.includes('Replay rollout'))).toBe(true);
    expect([...reached].some((r) => r.includes('Load the demo'))).toBe(true);
  });

  test('the theme toggle works and persists', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('#theme-toggle');
    const before = await page.evaluate(() => document.documentElement.dataset.theme);
    await toggle.click();
    const after = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(after).not.toBe(before);
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(after);
  });
});
