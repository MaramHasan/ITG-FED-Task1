/* Optional browser checks. No dependencies are added to the original project. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const root = __dirname;
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, body) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
    res.end(body);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    const defaultBrowser = process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined;
    browser = await chromium.launch({ headless: true, executablePath: process.env.STUDIO_BROWSER_PATH || defaultBrowser });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
    // Verify that the application works without any external font or CDN request.
    await context.route('https://**/*', route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(address);
    await page.waitForSelector('.course-card');
    assert.equal(await page.locator('.continue-card').count(), 2);
    assert.equal(await page.locator('.stat-value').allTextContents().then(values => values.join(',')), '02,02,00,04');
    if (process.env.STUDIO_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.STUDIO_SCREENSHOT_DIR, 'studio-desktop.png'), fullPage: true });

    // Search is global, including instructor and topic; filtering and reset recover empty results.
    const search = page.locator('#global-search');
    await search.fill('Lisa');
    assert.equal(await page.locator('.course-card').count(), 2);
    assert.equal(await page.locator('h1').textContent(), 'Results for “Lisa”');
    await search.fill('a-topic-that-does-not-exist');
    assert.equal(await page.locator('.empty-state h2').textContent(), 'No courses found');
    await page.locator('[data-action="reset-filters"]').click();
    assert.equal(await page.locator('.course-card').count(), 9);
    await page.locator('[data-category="Database"]').click();
    assert.equal(await page.locator('.course-card').count(), 2);
    await page.selectOption('#level-filter', 'Intermediate');
    assert.equal(await page.locator('.course-card').count(), 1);
    await page.selectOption('#level-filter', 'All levels');
    await page.locator('[data-category="All courses"]').click();
    await page.selectOption('#sort-filter', 'duration');
    assert.match(await page.locator('.course-card').first().textContent(), /CSS Essentials/);

    await page.locator('.main-nav [data-route="favorites"]').click();
    await page.waitForURL('**/#favorites');
    assert.equal(await page.locator('.course-card').count(), 2);
    await page.locator('[data-action="favorite"][data-id="sql"]').click();
    assert.equal(await page.locator('.course-card').count(), 1);
    await page.reload();
    await page.waitForSelector('.course-card');
    assert.equal(await page.locator('.course-card').count(), 1);

    // Enrollment, lesson progress, completion records, persistence, and review idempotence.
    await page.locator('.main-nav [data-route="explore"]').click();
    await page.locator('.course-title[data-id="sql"]').click();
    await page.locator('[data-action="enroll"]').click();
    for (let index = 0; index < 5; index++) {
      await page.locator(`[data-action="complete"][data-index="${index}"]`).click();
    }
    await page.waitForSelector('[data-action="download"]');
    assert.match(await page.locator('#dialog-content').textContent(), /All 5 lessons completed/);
    const downloadEvent = page.waitForEvent('download');
    await page.locator('[data-action="download"]').click();
    const download = await downloadEvent;
    assert.equal(download.suggestedFilename(), 'mycourses-sql-completion.txt');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mycourses.learning-studio.v1')));
    assert.equal(saved.enrollments.sql.completed.length, 5);
    assert.equal(saved.activity.length, 5);
    await page.locator('#app-dialog [data-action="resume"]').click();
    await page.locator('[data-action="complete"]').click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mycourses.learning-studio.v1')).activity.length), 5);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog').evaluate(el => el.open), false);

    await page.locator('.main-nav [data-route="learning"]').click();
    await page.locator('[data-tab="completed"]').click();
    assert.equal(await page.locator('.learning-card').count(), 1);
    await page.locator('[data-action="goal"]').first().click();
    await page.selectOption('#goal-form select', '7');
    await page.locator('#goal-form button[type="submit"]').click();
    assert.match(await page.locator('.page-banner').textContent(), /5 of 7 lessons/);

    await page.locator('.main-nav [data-route="profile"]').click();
    await page.locator('[name="name"]').fill('Jordan Rivera');
    await page.locator('[name="bio"]').fill('<img src=x onerror=alert(1)> Learning every day.');
    await page.locator('#profile-form button[type="submit"]').click();
    await page.reload();
    await page.waitForSelector('#profile-form');
    assert.equal(await page.locator('[name="name"]').inputValue(), 'Jordan Rivera');
    assert.match(await page.locator('[name="bio"]').inputValue(), /<img/);
    assert.equal(await page.locator('img[src="x"]').count(), 0);
    await page.keyboard.press('Control+k');
    assert.equal(await search.evaluate(el => el === document.activeElement), true);
    await search.fill('JavaScript');
    assert.equal(await page.locator('.course-card').count(), 1);
    await page.goBack();
    await page.waitForSelector('#profile-form');

    await require('./verify-workspace.cjs')({ page, address, context });
    await require('./verify-appearance.cjs')({ browser, address });

    // Every page stays within the viewport at common desktop, tablet, and phone widths.
    for (const width of [1440, 1024, 768, 700, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['overview', 'explore', 'learning', 'favorites', 'profile', 'paths', 'planner', 'notebook', 'insights']) {
        await page.goto(`${address}/#${route}`);
        await page.waitForSelector('h1');
        const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
        assert.ok(dimensions.content <= dimensions.viewport + 1, `${route} overflows at ${width}px: ${dimensions.content}`);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(address);
    await page.waitForSelector('.course-card');
    if (process.env.STUDIO_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.STUDIO_SCREENSHOT_DIR, 'studio-mobile.png'), fullPage: true });
    assert.equal(await page.locator('#sidebar').evaluate(el => el.inert), true);
    await page.locator('.menu-toggle').click();
    assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('.app-shell').evaluate(el => el.inert), true);
    await page.locator('.main-nav [data-route="favorites"]').click();
    await page.waitForURL('**/#favorites');
    assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
    await page.locator('.menu-toggle').click();
    await page.locator('.main-nav [data-route="favorites"]').click();
    assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
    await page.locator('.menu-toggle').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.menu-toggle').evaluate(el => el === document.activeElement), true);
    await page.locator('.course-title').first().click();
    assert.equal(await page.locator('dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
    await page.keyboard.press('Escape');

    // Malformed saved data recovers safely; denied storage still supports interaction.
    await page.evaluate(() => localStorage.setItem('mycourses.learning-studio.v1', '{broken'));
    await page.reload();
    await page.waitForSelector('h1');
    assert.equal(await page.locator('#learning-count').textContent(), '2');
    const ephemeral = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ephemeral.route('https://**/*', route => route.abort());
    await ephemeral.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } }); });
    const restricted = await ephemeral.newPage();
    restricted.on('pageerror', error => errors.push(error.message));
    await restricted.goto(address);
    await restricted.locator('[data-action="favorite"]').first().click();
    assert.match(await restricted.locator('#toast').textContent(), /storage is unavailable/);
    await ephemeral.close();
    assert.deepEqual(errors, []);
    console.log('PASS: global search, filters, sorting, favorites, enrollment, lessons, downloads, persistence, profile escaping, goals, browser history, keyboard dialogs, mobile navigation, storage recovery, and nine-page layouts at six viewport widths.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
