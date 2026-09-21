'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

module.exports = async function verifyWorkspace({ page, address, context }) {
  // Joining a path preserves existing lessons and enrolls only the missing courses.
  await page.goto(`${address}/#paths`);
  await page.waitForSelector('.path-card');
  assert.equal(await page.locator('.path-card').count(), 3);
  await page.locator('[data-workspace="path-details"][data-id="frontend"]').click();
  await page.locator('[data-workspace="path-join"]').click();
  const enrollment = await page.evaluate(() => JSON.parse(localStorage.getItem('mycourses.learning-studio.v1')).enrollments);
  assert.deepEqual(enrollment.html.completed, [0, 1, 2]);
  assert.ok(enrollment.react && enrollment.javascript);
  await page.locator('[data-workspace="path-continue"]').click();
  assert.match(await page.locator('#dialog-title').textContent(), /Forms and accessibility/);

  // Notes created in a lesson return to that lesson after saving.
  await page.locator('[data-workspace="lesson-note"]').click();
  await page.locator('#note-form [name="title"]').fill('Grid <img src=x onerror=alert(1)>');
  await page.locator('#note-form [name="body"]').fill('An accessible form needs a visible label.\nKeep <code> as plain text.');
  await page.locator('#note-form [name="pinned"]').check();
  await page.locator('#note-form [type="submit"]').click();
  assert.ok(await page.locator('.lesson-content').isVisible());
  assert.match(await page.locator('.lesson-workspace').textContent(), /1 note linked/);
  await page.keyboard.press('Escape');
  await page.locator('.main-nav [data-route="notebook"]').click();
  await page.waitForSelector('.note-card');
  assert.equal(await page.locator('.note-card').count(), 1);
  assert.equal(await page.locator('img[src="x"]').count(), 0);
  assert.match(await page.locator('.note-card').textContent(), /<img/);
  await page.locator('#note-search').fill('visible label');
  assert.equal(await page.locator('.note-card').count(), 1);
  await page.locator('#note-search').fill('does-not-exist');
  assert.equal(await page.locator('.note-card').count(), 0);
  await page.locator('[data-workspace="notes-clear"]').first().click();
  await page.selectOption('#note-course', 'css');
  assert.equal(await page.locator('.note-card').count(), 0);
  await page.selectOption('#note-course', 'all');
  await page.locator('.note-content-button').click();
  await page.locator('#note-form [name="body"]').fill('A revised explanation about labels.');
  await page.locator('#note-form [type="submit"]').click();
  await page.reload();
  await page.waitForSelector('.note-card');
  assert.match(await page.locator('.note-card').textContent(), /revised explanation/);
  assert.equal(await page.locator('.pin-button').getAttribute('aria-pressed'), 'true');
  await page.locator('.note-content-button').click();
  await page.locator('[data-workspace="note-delete"]').click();
  assert.equal(await page.locator('.note-card').count(), 0);
  await page.locator('[data-workspace="undo"]').click();
  assert.equal(await page.locator('.note-card').count(), 1);
  const notesDownload = page.waitForEvent('download');
  await page.locator('[data-workspace="notes-export"]').click();
  assert.equal((await notesDownload).suggestedFilename(), 'mycourses-notebook.md');

  // Workspace data is synchronized between tabs on the same origin.
  const secondTab = await context.newPage();
  await secondTab.goto(`${address}/#notebook`);
  await secondTab.waitForSelector('.note-card');
  await page.locator('.page-heading [data-workspace="note-new"]').click();
  await page.locator('#note-form [name="title"]').fill('A second small breakthrough');
  await page.locator('#note-form [name="body"]').fill('Practice helps the pieces fit together.');
  await page.locator('#note-form [type="submit"]').click();
  await secondTab.waitForFunction(() => document.querySelectorAll('.note-card').length === 2);
  await secondTab.close();
  await page.locator('#global-search').fill('second small breakthrough');
  assert.equal(await page.locator('.workspace-result').count(), 1);
  await page.locator('.workspace-result').click();
  assert.equal(await page.locator('#note-form [name="title"]').inputValue(), 'A second small breakthrough');
  await page.keyboard.press('Escape');

  // Plan a session, catch overlaps, and export interoperable calendar data.
  await page.locator('.main-nav [data-route="planner"]').click();
  await page.waitForSelector('.calendar-week');
  const tomorrow = await page.evaluate(() => { const day = new Date(); day.setDate(day.getDate() + 1); return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`; });
  await page.locator('.page-heading [data-workspace="session-new"]').click();
  await page.locator('#session-form [name="title"]').fill('Practice forms, labels; and inputs');
  await page.selectOption('#session-form [name="courseId"]', 'html');
  await page.locator('#session-form [name="date"]').fill(tomorrow);
  await page.locator('#session-form [name="time"]').fill('13:00');
  await page.locator('#session-form [name="note"]').fill('Use the keyboard\nCheck focus order');
  await page.locator('#session-form [type="submit"]').click();
  assert.equal(await page.locator('.session-row').count(), 1);
  await page.locator('[data-workspace="session-toggle"]').click();
  assert.match(await page.locator('#toast').textContent(), /hasn’t started/);
  await page.locator('.page-heading [data-workspace="session-new"]').click();
  await page.locator('#session-form [name="title"]').fill('Overlapping session');
  await page.locator('#session-form [name="date"]').fill(tomorrow);
  await page.locator('#session-form [name="time"]').fill('13:10');
  await page.locator('#session-form [type="submit"]').click();
  assert.match(await page.locator('#session-error').textContent(), /overlaps/);
  assert.equal(await page.locator('dialog').evaluate(element => element.open), true);
  await page.keyboard.press('Escape');
  const calendarDownload = page.waitForEvent('download');
  await page.locator('[data-workspace="calendar-export"]').click();
  const calendar = await calendarDownload;
  assert.equal(calendar.suggestedFilename(), 'mycourses-study-plan.ics');
  const ics = fs.readFileSync(await calendar.path(), 'utf8');
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /SUMMARY:Practice forms\\, labels\\; and inputs/);
  assert.match(ics, /DTSTART:\d{8}T\d{6}Z/);
  assert.match(ics, /DTEND:\d{8}T\d{6}Z/);
  await page.locator(`[data-workspace="day-select"][data-date="${tomorrow}"]`).click();
  assert.equal(await page.locator('.session-row').count(), 1);
  await page.locator('[data-workspace="day-clear"]').click();
  await page.locator('[data-workspace="week-next"]').click();
  assert.equal(await page.locator('.session-row').count(), 0);
  await page.locator('[data-workspace="week-prev"]').click();
  assert.equal(await page.locator('.session-row').count(), 1);
  await page.locator('[data-workspace="session-edit"]').click();
  await page.locator('[data-workspace="session-delete"]').click();
  assert.equal(await page.locator('.session-row').count(), 0);
  await page.locator('[data-workspace="undo"]').click();
  assert.equal(await page.locator('.session-row').count(), 1);
  await page.locator('[data-workspace="session-edit"]').click();
  const now = await page.evaluate(() => { const date = new Date(); return { date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }; });
  await page.locator('#session-form [name="date"]').fill(now.date);
  await page.locator('#session-form [name="time"]').fill(now.time);
  await page.locator('#session-form [type="submit"]').click();
  await page.locator('[data-workspace="session-toggle"]').click();
  assert.equal(await page.locator('[data-workspace="session-toggle"]').getAttribute('aria-pressed'), 'true');
  await page.reload();
  await page.waitForSelector('.session-row');
  assert.equal(await page.locator('[data-workspace="session-toggle"]').getAttribute('aria-pressed'), 'true');
  await page.selectOption('#session-filter', 'planned');
  assert.equal(await page.locator('.session-row').count(), 0);
  await page.selectOption('#session-filter', 'all');

  // Insights use recorded study time and expose chart data in an accessible table.
  await page.locator('.main-nav [data-route="insights"]').click();
  await page.waitForSelector('.activity-chart');
  assert.match(await page.locator('.workspace-metric').nth(1).textContent(), /25m/);
  assert.match(await page.locator('.workspace-metric').nth(2).textContent(), /1 day/);
  assert.equal(await page.locator('.chart-column').count(), 7);
  await page.locator('[data-days="28"]').click();
  assert.equal(await page.locator('.chart-column').count(), 28);
  await page.locator('.chart-data summary').click();
  assert.equal(await page.locator('.chart-data tbody tr').count(), 28);
  const progressDownload = page.waitForEvent('download');
  await page.locator('[data-workspace="insights-export"]').click();
  assert.equal((await progressDownload).suggestedFilename(), 'mycourses-progress.csv');
  if (process.env.STUDIO_SCREENSHOT_DIR) {
    for (const route of ['paths', 'planner', 'notebook', 'insights']) {
      await page.goto(`${address}/#${route}`); await page.waitForSelector('h1');
      await page.screenshot({ path: path.join(process.env.STUDIO_SCREENSHOT_DIR, `studio-${route}.png`), fullPage: true });
    }
  }
  console.log('PASS: learning paths preserve progress; lesson notes support search, pinning, editing, undo, export and cross-tab persistence; planner validates overlaps and future sessions, exports calendar data; insights reflect recorded study time.');
};
