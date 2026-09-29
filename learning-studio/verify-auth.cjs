'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

module.exports = async function verifyAuth({ browser, address }) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.route('https://**/*', route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', issue => errors.push(issue.message));
  await page.goto(`${address}/course-details.html?id=css`);
  await page.waitForSelector('#signin-form');
  assert.match(page.url(), /sign-in\.html\?next=course-details/);
  await page.locator('#signin-submit').click();
  assert.equal(await page.locator('#email').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.locator('#password').getAttribute('aria-invalid'), 'true');
  await page.locator('#email').fill('bad-email');
  await page.locator('#password').fill('incorrect');
  await page.locator('#signin-submit').click();
  assert.match(await page.locator('#email-error').textContent(), /valid email/);
  await page.locator('#email').fill('alex.morgan@example.com');
  await page.locator('#reveal-password').click();
  assert.equal(await page.locator('#password').getAttribute('type'), 'text');
  await page.locator('#reveal-password').click();
  assert.equal(await page.locator('#password').getAttribute('type'), 'password');
  await page.locator('#signin-submit').click();
  await page.waitForSelector('#auth-error:not([hidden])');
  assert.match(await page.locator('#auth-error').textContent(), /don’t match/);
  await page.locator('#password').fill('learn-together');
  await page.locator('#signin-submit').click();
  await page.waitForSelector('.details-lessons');
  assert.match(page.url(), /course-details.html\?id=css$/);
  assert.equal(await page.evaluate(() => JSON.stringify(localStorage).includes('learn-together')), false);
  await page.reload();
  await page.waitForSelector('.details-lessons');
  await page.locator('.details-save').click();
  const saved = await page.evaluate(() => localStorage.getItem('mycourses.learning-studio.v1'));
  const other = await context.newPage();
  await other.goto(`${address}/index.html#profile`);
  await other.waitForSelector('.session-panel');
  await page.locator('.sidebar-signout').click();
  await page.waitForSelector('#signout-success:not([hidden])');
  assert.equal(await page.locator('#signout-retry').isVisible(), false);
  assert.equal(await page.evaluate(() => localStorage.getItem('mycourses.learning-studio.v1')), saved);
  await other.waitForSelector('#signin-form');
  await page.goBack();
  await page.waitForSelector('#signin-form');
  await page.locator('#demo-signin').click();
  await page.waitForSelector('.details-lessons');
  assert.equal(await page.locator('.details-save').getAttribute('aria-pressed'), 'true');
  await page.goto(`${address}/index.html#profile`);
  await page.locator('.session-panel a').click();
  await page.waitForSelector('#signout-success:not([hidden])');
  await page.reload();
  await page.waitForSelector('#signout-success:not([hidden])');
  for (const theme of ['light', 'dark']) {
    for (const name of ['sign-in', 'sign-out']) {
      await page.goto(`${address}/${name}.html`);
      await page.evaluate(theme => window.STUDIO_APPEARANCE.set(theme), theme);
      for (const width of [1440, 1024, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 950 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name} ${theme} overflows at ${width}`);
        if (process.env.STUDIO_SCREENSHOT_DIR && [1440, 390].includes(width)) await page.screenshot({ path: path.join(process.env.STUDIO_SCREENSHOT_DIR, `${name}-${theme}-${width}.png`), fullPage: true });
      }
    }
  }
  await page.goto(`${address}/sign-in.html?next=${encodeURIComponent('https://example.com')}`);
  await page.locator('#demo-signin').click();
  await page.waitForSelector('.course-card');
  assert.equal(new URL(page.url()).pathname, '/index.html');
  await page.goto(`${address}/sign-in.html`);
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.locator('[data-auth-theme]').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  // The static file entry points use the same flow without a server.
  await page.goto(pathToFileURL(path.join(__dirname, '../sign-in.html')).href);
  await page.locator('#demo-signin').click();
  await page.waitForSelector('.course-card');
  await page.locator('.menu-toggle').click();
  await page.locator('.sidebar-signout').click();
  await page.waitForSelector('#signout-success:not([hidden])');
  assert.deepEqual(errors, []);
  await context.close();

  const restricted = await browser.newContext();
  await restricted.route('https://**/*', route => route.abort());
  await restricted.addInitScript(() => {
    for (const name of ['localStorage', 'sessionStorage']) Object.defineProperty(window, name, { get() { throw new Error('Unavailable'); } });
  });
  const blocked = await restricted.newPage();
  await blocked.goto(`${address}/sign-in.html`);
  await blocked.locator('#demo-signin').click();
  await blocked.waitForSelector('#auth-error:not([hidden])');
  assert.match(await blocked.locator('#auth-error').textContent(), /storage is unavailable/);
  assert.equal(await blocked.locator('#signin-submit').isEnabled(), true);
  await restricted.close();
  console.log('PASS: sign-in validation, password visibility, demo login, return URL, persistence, sign-out, cross-tab logout, preserved progress, history guard, safe redirects, blocked storage, file opening and responsive light/dark auth pages.');
};
