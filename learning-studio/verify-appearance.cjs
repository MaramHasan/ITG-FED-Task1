'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');

module.exports = async ({ browser, address }) => {
  const context = await browser.newContext({ colorScheme: 'light', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.route('https://**/*', route => route.abort());
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const theme = () => page.locator('html').getAttribute('data-theme');
    await page.goto(address);
    assert.equal(await theme(), 'light');
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    assert.equal(await theme(), 'dark');
    await page.reload();
    assert.equal(await theme(), 'dark');
    assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'), '#14191f');
    assert.equal(await page.locator('.category-tab.active').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(213, 244, 120)', 'The selected filter stays visible in dark mode');
    if (process.env.STUDIO_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.STUDIO_SCREENSHOT_DIR, 'studio-dark.png'), fullPage: true });

    await page.goto(`${address}/#profile`);
    await page.getByRole('button', { name: 'Preferences' }).click();
    await page.getByRole('radio', { name: /System/ }).check();
    assert.equal(await theme(), 'light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await page.getByRole('radio', { name: /Light/ }).check();
    assert.equal(await theme(), 'light');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.emulateMedia({ colorScheme: 'dark' });
    assert.equal(await theme(), 'light', 'An explicit preference must override the device');
    // Native radio keyboard navigation applies without moving focus or closing preferences.
    await page.getByRole('radio', { name: /Light/ }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await theme(), 'dark');
    assert.equal(await page.getByRole('radio', { name: /Dark/ }).isChecked(), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('button', { name: 'Preferences' }).evaluate(el => el === document.activeElement), true);

    const peer = await context.newPage();
    await peer.goto(address);
    await peer.getByRole('button', { name: 'Switch to light mode' }).click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
    await peer.close();
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['overview', 'explore', 'learning', 'favorites', 'profile', 'paths', 'planner', 'notebook', 'insights']) {
        await page.goto(`${address}/#${route}`);
        await page.waitForSelector('h1');
        assert.equal(await theme(), 'dark');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Dark ${route} overflows at ${width}`);
        assert.equal(await page.locator('h1').evaluate(el => getComputedStyle(el).color), 'rgb(233, 237, 241)');
      }
    }
    await page.goto(`${address}/#profile`);
    await page.getByRole('button', { name: 'Preferences' }).click();
    assert.equal(await page.locator('dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
    if (process.env.STUDIO_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.STUDIO_SCREENSHOT_DIR, 'studio-preferences-mobile.png') });
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.goto(`${address}/#overview`);
    await page.locator('.resume-button').first().click();
    assert.equal(await page.locator('dialog').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(32, 39, 47)');
    await page.keyboard.press('Escape');
    await page.evaluate(() => localStorage.setItem('mycourses.appearance.v1', 'invalid'));
    await page.reload();
    assert.equal(await page.evaluate(() => window.STUDIO_APPEARANCE.preference), 'system');
    assert.equal(await theme(), 'dark');
    assert.deepEqual(errors, []);
  } finally { await context.close(); }

  const restricted = await browser.newContext({ colorScheme: 'light' });
  try {
    await restricted.route('https://**/*', route => route.abort());
    await restricted.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } }); });
    const page = await restricted.newPage();
    await page.goto(address);
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.match(await page.locator('#toast').textContent(), /storage is unavailable/);
  } finally { await restricted.close(); }
  console.log('PASS: appearance toggle, persisted preference, live system changes, explicit overrides, keyboard radios, cross-tab sync, storage fallback, dark dialogs and nine-page layouts at four viewport widths.');
};
