'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');

module.exports = async function verifyCourseDetails({ browser, address }) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  await context.route('https://**/*', route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const ready = () => page.waitForSelector('.details-lessons');
  await page.goto(`${address}/#explore?category=Frontend`);
  await page.locator('.course-title[data-id="html"]').click();
  await ready();
  assert.match(page.url(), /course-details\.html\?id=html$/);
  assert.equal(await page.locator('h1').textContent(), 'HTML Fundamentals');
  assert.equal(await page.locator('.details-lessons li').count(), 5);
  assert.equal(await page.locator('.details-progress-label strong').textContent(), '60% complete');
  await page.goBack();
  await page.waitForSelector('.catalog-toolbar');
  assert.match(page.url(), /#explore\?category=Frontend$/);
  await page.goForward();
  await ready();
  await page.reload();
  await ready();
  await page.locator('.details-save').click();
  assert.equal(await page.locator('.details-save').getAttribute('aria-pressed'), 'true');
  await page.locator('.details-start').click();
  assert.equal(await page.locator('#dialog-title').textContent(), 'Forms and accessibility');
  await page.locator('[data-action="complete"]').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.details-progress-label strong').textContent(), '80% complete');
  await page.locator('.details-lessons summary').first().click();
  assert.match(await page.locator('.details-lesson-preview').first().textContent(), /Every page starts with structure/);
  await page.locator('.details-lesson-preview [data-action="lesson"]').first().click();
  await page.locator('[data-action="details"]').click();
  await ready();
  assert.equal(await page.locator('dialog').evaluate(el => el.open), false);

  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => window.STUDIO_APPEARANCE.set(theme), theme);
    for (const width of [1440, 1024, 768, 700, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${theme} details overflow at ${width}px`);
      if (process.env.STUDIO_SCREENSHOT_DIR && [1440, 390].includes(width)) await page.screenshot({ path: path.join(process.env.STUDIO_SCREENSHOT_DIR, `details-${theme}-${width}.png`), fullPage: true });
    }
  }
  await page.locator('.menu-toggle').click();
  await page.locator('.main-nav [data-route="learning"]').click();
  await page.waitForSelector('.learning-tabs');
  assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
  assert.match(page.url(), /index\.html#learning$/);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(`${address}/course-details.html?id=sql`);
  await ready();
  await page.locator('.details-start').click();
  await page.waitForSelector('.lesson-content');
  await page.keyboard.press('Escape');
  assert.match(await page.locator('.details-start').textContent(), /Continue learning/);
  await page.locator('#global-search').fill('CSS');
  await page.waitForSelector('.course-card');
  assert.match(page.url(), /index\.html#explore/);

  for (const query of ['', '?id=', '?id=not-a-course', '?id=%3Cscript%3E']) {
    await page.goto(`${address}/course-details.html${query}`);
    await page.waitForSelector('.details-state h1');
    assert.equal(await page.locator('h1').textContent(), 'Course not found');
  }
  await page.goto(`${address}/course-details.html?id=html`);
  await ready();
  // Hold the local service promises to verify the loading UI and stale-request guard.
  await page.evaluate(() => {
    window.originalService = { ...window.STUDIO_COURSE_SERVICE };
    window.STUDIO_COURSE_SERVICE.getCourse = () => new Promise(resolve => { window.finishCourse = resolve; });
    dispatchEvent(new PopStateEvent('popstate'));
  });
  assert.equal(await page.locator('.details-state').getAttribute('aria-busy'), 'true');
  await page.locator('.details-back').click();
  await page.waitForSelector('.catalog-toolbar');
  await page.evaluate(async () => { window.finishCourse(await window.originalService.getCourse('html')); Object.assign(window.STUDIO_COURSE_SERVICE, window.originalService); });
  assert.equal(await page.locator('.catalog-toolbar').count(), 1);

  for (const method of ['getCourse', 'getLessons']) {
    await page.goto(`${address}/course-details.html?id=html`);
    await ready();
    await page.evaluate(method => {
      const original = window.STUDIO_COURSE_SERVICE[method];
      window.restoreService = () => { window.STUDIO_COURSE_SERVICE[method] = original; };
      window.STUDIO_COURSE_SERVICE[method] = async () => { throw new Error('Fixture failure'); };
      dispatchEvent(new PopStateEvent('popstate'));
    }, method);
    await page.waitForSelector('[role="alert"]');
    assert.match(await page.locator('h1').textContent(), /couldn’t load/);
    await page.evaluate(() => window.restoreService());
    await page.locator('[data-action="retry-course"]').click();
    await ready();
  }
  await page.evaluate(() => { window.STUDIO_LESSONS.html = []; dispatchEvent(new PopStateEvent('popstate')); });
  await page.waitForSelector('.details-no-lessons');
  assert.equal(await page.locator('.details-start').isDisabled(), true);
  await page.evaluate(() => { window.STUDIO_LESSONS.html = Array.from({ length: 7 }, (_, i) => [`Reading ${i + 1}`, 'Content', 'Code', 'Practice']); dispatchEvent(new PopStateEvent('popstate')); });
  await ready();
  assert.equal(await page.locator('.details-lessons li').count(), 7);
  // Both the root entry and direct file opening are supported by this static project.
  const { pathToFileURL } = require('node:url');
  await page.goto(`${pathToFileURL(path.join(__dirname, '../course-details.html')).href}?id=css`);
  await ready();
  assert.equal(await page.locator('h1').textContent(), 'CSS Essentials');
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#main').evaluate(el => el === document.activeElement), true);
  assert.equal(await page.locator('.details-lessons').count(), 1);
  await page.locator('.details-back').click();
  await page.waitForSelector('.catalog-toolbar');
  await page.locator('.course-title[data-id="html"]').click();
  await ready();
  await page.locator('#global-search').fill('CSS');
  await page.waitForSelector('.catalog-toolbar');
  assert.match(page.url(), /index\.html#explore\?q=CSS$/);
  assert.deepEqual(errors, []);
  await context.close();
  console.log('PASS: Course Details navigation, history, refresh, lessons, enrollment, progress, favorites, loading, errors/retry, invalid IDs, empty lessons, dynamic lesson count, and light/dark layouts at six widths.');
};
