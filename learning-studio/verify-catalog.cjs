'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');

module.exports = async ({ browser, address }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.route('https://**/*', route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(`${address}/#explore`);
    assert.equal(await page.locator('.course-card').count(), 6);
    assert.match(await page.locator('.results-label').textContent(), /Showing 1–6 of 9/);
    assert.equal(await page.getByRole('button', { name: 'Previous page' }).isDisabled(), true);
    await page.getByRole('button', { name: 'Next page' }).click();
    assert.equal(await page.locator('.course-card').count(), 3);
    assert.equal(await page.locator('#catalog-results').evaluate(el => el === document.activeElement), true);
    assert.equal(await page.getByRole('button', { name: 'Next page' }).isDisabled(), true);
    assert.match(page.url(), /page=2/);
    await page.reload();
    assert.match(await page.locator('.results-label').textContent(), /Showing 7–9 of 9/);
    await page.locator('[data-category="Database"]').click();
    assert.equal(await page.locator('.course-card').count(), 2);
    assert.equal(await page.locator('.pagination').count(), 0);
    await page.goBack();
    await page.waitForFunction(() => document.querySelector('.results-label')?.textContent.includes('Showing 7–9'));
    await page.goForward();
    await page.waitForFunction(() => document.querySelector('[data-category="Database"]')?.getAttribute('aria-pressed') === 'true');
    await page.getByRole('button', { name: 'Browse categories' }).click();
    assert.equal(await page.locator('#category-search').evaluate(el => el === document.activeElement), true);
    await page.locator('#category-search').fill('front');
    assert.equal(await page.locator('.category-choice').count(), 1);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('dialog').evaluate(el => el.open), false);
    await page.waitForFunction(() => document.activeElement?.dataset.category === 'Frontend');
    assert.equal(await page.locator('.course-card').count(), 4);
    await page.getByRole('button', { name: 'Browse categories' }).click();
    await page.locator('#category-search').fill('no-such-category');
    assert.equal(await page.locator('.category-no-results').count(), 1);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement?.dataset.action === 'browse-categories');

    await page.evaluate(() => {
      const key = 'mycourses.learning-studio.v1';
      const saved = { favorites: window.STUDIO_COURSES.map(course => course.id) };
      localStorage.setItem(key, JSON.stringify(saved));
    });
    await page.reload();
    await page.goto(`${address}/#favorites?page=2`);
    assert.equal(await page.locator('.course-card').count(), 3);
    for (let index = 0; index < 3; index++) await page.locator('.favorite-button').first().click();
    assert.equal(await page.locator('.course-card').count(), 6);
    assert.equal(await page.locator('.pagination').count(), 0);
    assert.equal(new URL(page.url()).hash, '#favorites');

    // Add fixture data only in this browser; the shipped demo remains nine real courses.
    await context.route('**/courses.js', async route => {
      const response = await route.fetch();
      const fixture = `\nfor (let i = 0; i < 240; i++) window.STUDIO_COURSES.push({ ...window.STUDIO_COURSES[0], id: 'fixture-' + i, title: 'Fixture course ' + i, category: 'Topic ' + String(i % 40).padStart(2, '0') });`;
      await route.fulfill({ response, body: await response.text() + fixture });
    });
    await page.goto(`${address}/#explore`);
    await page.reload();
    assert.equal(await page.locator('.course-card').count(), 6);
    assert.equal(await page.locator('.category-tab').count(), 4);
    assert.match(await page.locator('.results-label').textContent(), /of 249 courses/);
    await page.locator('#page-number').fill('20');
    await page.locator('#page-jump button').click();
    assert.match(await page.locator('.results-label').textContent(), /Showing 115–120 of 249/);
    assert.equal(await page.locator('.pagination-gap').count(), 2);
    assert.ok(await page.locator('.page-numbers button').count() <= 7);
    await page.reload();
    assert.match(await page.locator('[aria-current="page"][data-page]').textContent(), /20/);
    await page.locator('[data-action="page-size"][data-size="24"]').click();
    assert.equal(await page.locator('.course-card').count(), 24);
    assert.match(await page.locator('.results-label').textContent(), /Showing 1–24/);
    await page.selectOption('#sort-filter', 'title');
    await page.getByRole('button', { name: 'Next page' }).click();
    await page.selectOption('#level-filter', 'Advanced');
    assert.equal(await page.locator('.course-card').count(), 1);
    assert.equal(await page.locator('.pagination').count(), 0);
    await page.locator('[data-action="reset-filters"]').click();
    await page.getByRole('button', { name: 'Browse categories' }).click();
    assert.equal(await page.locator('.category-choice').count(), 44);
    await page.locator('#category-search').fill('topic 39');
    await page.locator('.category-choice').click();
    assert.equal(await page.locator('.course-card').count(), 6);
    assert.equal(await page.locator('.category-tab.active').getAttribute('data-category'), 'Topic 39');
    await page.reload();
    assert.equal(await page.locator('.category-tab.active').getAttribute('data-category'), 'Topic 39');
    await page.goto(`${address}/#explore?page=999999`);
    assert.match(await page.locator('.results-label').textContent(), /Showing 247–249/);
    assert.match(page.url(), /page=42/);
    await page.goto(`${address}/#explore?page=-5&size=0&category=unknown&sort=unknown`);
    assert.equal(await page.locator('.course-card').count(), 6);
    assert.equal(new URL(page.url()).hash, '#explore');
    await page.locator('#global-search').fill('no-such-course');
    assert.equal(await page.locator('.catalog-pagination').count(), 0);
    await page.locator('[data-action="reset-filters"]').click();

    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Catalog fits ${width}px`);
      await page.getByRole('button', { name: 'Browse categories' }).click();
      assert.equal(await page.locator('dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
      await page.keyboard.press('Escape');
    }
    await page.getByRole('button', { name: 'Next page' }).click();
    assert.match(await page.locator('.mobile-page-position').textContent(), /2 \/ 42/);
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    if (process.env.STUDIO_SCREENSHOT_DIR) {
      await page.screenshot({ path: path.join(process.env.STUDIO_SCREENSHOT_DIR, 'catalog-mobile-dark.png'), fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1100 });
      await page.getByRole('button', { name: 'Switch to light mode' }).click();
      await page.screenshot({ path: path.join(process.env.STUDIO_SCREENSHOT_DIR, 'catalog-desktop.png'), fullPage: true });
    }
    assert.deepEqual(errors, []);
    console.log('PASS: category search and keyboard focus, 249-course/43-category fixture, pagination, page sizes, jump, URL/history, filter resets, invalid URLs, and responsive catalog.');
  } finally { await context.close(); }
};
