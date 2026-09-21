/* Optional workspace features, isolated from the course catalog and legacy project. */
window.STUDIO_WORKSPACE_PAGES = {
  paths: 'Learning paths', planner: 'Study planner', notebook: 'My notebook', insights: 'Progress insights'
};

window.createStudioWorkspace = function createStudioWorkspace(app) {
  'use strict';
  const { courses, icon, escape: esc, heading, empty, localDate, progress, completed } = app;
  const $ = selector => document.querySelector(selector);
  const key = 'mycourses.workspace.v1';
  const paths = [
    { id: 'frontend', title: 'Become a frontend builder', category: 'Frontend development', color: 'mint', symbol: '</>', description: 'From your first page to your first React app. Build the skills to bring thoughtful interfaces to life.', courses: ['html', 'css', 'javascript', 'react'], project: 'A responsive, interactive portfolio', skills: ['Semantic HTML', 'Responsive layouts', 'JavaScript', 'React'] },
    { id: 'backend', title: 'Build behind the scenes', category: 'Backend development', color: 'lavender', symbol: '{ }', description: 'Connect the pieces that power a product. Learn a language, build a service, and design an API that lasts.', courses: ['csharp', 'aspnet', 'api'], project: 'A well-structured course catalog API', skills: ['C#', 'ASP.NET Core', 'HTTP', 'API contracts'] },
    { id: 'data', title: 'Make sense of your data', category: 'Data & databases', color: 'peach', symbol: 'SQL', description: 'Good products start with good foundations. Learn to ask better questions and organize data with confidence.', courses: ['sql', 'data'], project: 'A relational model for a learning platform', skills: ['SQL queries', 'Joins', 'Data modeling', 'Relationships'] }
  ];
  const courseById = id => courses.find(course => course.id === id);
  const uid = () => window.crypto?.randomUUID?.() || `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const cleanText = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
  const validId = id => typeof id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(id);
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    return !Number.isNaN(date.getTime()) && localDate(date) === value;
  }
  function read() {
    const result = { sessions: [], notes: [], joinedPaths: [] };
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (!saved || typeof saved !== 'object') return result;
      if (Array.isArray(saved.joinedPaths)) result.joinedPaths = [...new Set(saved.joinedPaths.filter(id => paths.some(path => path.id === id)))];
      if (Array.isArray(saved.sessions)) {
        const ids = new Set();
        result.sessions = saved.sessions.filter(item => {
          if (!item || !validId(item.id) || ids.has(item.id) || !courseById(item.courseId) || !validDate(item.date) || typeof item.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) || ![15, 25, 30, 45, 60, 90, 120].includes(item.duration)) return false;
          ids.add(item.id); return true;
        }).map(item => ({ id: item.id, courseId: item.courseId, date: item.date, time: item.time, duration: item.duration, title: cleanText(item.title, 100) || 'Study session', note: cleanText(item.note, 500), done: item.done === true, completedAt: validDate(item.completedAt) ? item.completedAt : item.date }));
      }
      if (Array.isArray(saved.notes)) {
        const ids = new Set();
        result.notes = saved.notes.filter(item => {
          if (!item || !validId(item.id) || ids.has(item.id) || typeof item.title !== 'string' || typeof item.body !== 'string') return false;
          ids.add(item.id); return true;
        }).map(item => {
          const course = courseById(item.courseId);
          return { id: item.id, title: cleanText(item.title, 100) || 'Untitled note', body: cleanText(item.body, 5000), courseId: course?.id || '', lesson: course && Number.isInteger(item.lesson) && item.lesson >= 0 && item.lesson < course.topics.length ? item.lesson : null, pinned: item.pinned === true, updatedAt: typeof item.updatedAt === 'string' && !Number.isNaN(Date.parse(item.updatedAt)) ? item.updatedAt : new Date().toISOString() };
        });
      }
    } catch { /* A restricted browser still supports the workspace in memory. */ }
    return result;
  }
  let data = read();
  let weekOffset = 0;
  let selectedDay = '';
  let sessionFilter = 'all';
  let noteQuery = '';
  let noteCourse = 'all';
  let noteSort = 'recent';
  let insightDays = 7;
  let undoItem = null;
  let returnToLesson = null;
  function persist(message) {
    let saved = true;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { saved = false; }
    if (message) app.toast(message + (saved ? '' : ' Browser storage is unavailable; changes last for this session.'));
    return saved;
  }
  function redraw(selector) { app.render(); if (selector) ($(selector) || $('#main')).focus({ preventScroll: true }); }
  const fmt = (date, options = { month: 'short', day: 'numeric' }) => new Intl.DateTimeFormat('en', options).format(new Date(`${date}T12:00:00`));
  function dayAfter(date, amount) { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + amount); return localDate(next); }
  function week() {
    const now = new Date();
    const monday = dayAfter(localDate(now), -((now.getDay() + 6) % 7) + weekOffset * 7);
    return Array.from({ length: 7 }, (_, index) => dayAfter(monday, index));
  }
  const startsAt = session => new Date(`${session.date}T${session.time}:00`).getTime();
  const sortSessions = sessions => [...sessions].sort((a, b) => startsAt(a) - startsAt(b));
  function readableTime(time) { const [hour, minute] = time.split(':').map(Number); return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`; }
  function durationLabel(minutes) { return minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}` : `${minutes}m`; }
  function download(content, filename, type = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function featureButton(action, label, symbol = 'plus', extra = '', style = 'button-primary') {
    return `<button class="button ${style}" data-workspace="${action}" ${extra}>${icon(symbol)}${label}</button>`;
  }
  function statusPill(session) {
    if (session.done) return '<span class="status-pill success">Completed</span>';
    if (startsAt(session) + session.duration * 60000 < Date.now()) return '<span class="status-pill amber">Needs a new time</span>';
    return `<span class="status-pill">${session.date === localDate() ? 'Today' : 'Scheduled'}</span>`;
  }
  function metrics(items) {
    return `<div class="workspace-metrics">${items.map(([symbol, value, label, detail]) => `<div class="workspace-metric"><span class="metric-symbol">${icon(symbol)}</span><span class="metric-caption">${label}</span><strong>${value}</strong><small>${detail}</small></div>`).join('')}</div>`;
  }

  // Learning paths share the existing enrollment and lesson-progress state.
  function pathStats(path) {
    const collection = path.courses.map(courseById);
    const total = collection.reduce((sum, course) => sum + course.topics.length, 0);
    const done = collection.reduce((sum, course) => sum + completed(course), 0);
    return { collection, total, done, percent: Math.round(done / total * 100), hours: collection.reduce((sum, course) => sum + course.hours, 0) };
  }
  function pathCard(path, index) {
    const stats = pathStats(path); const joined = data.joinedPaths.includes(path.id);
    return `<article class="path-card"><div class="path-visual ${path.color}"><span class="path-number">PATH / 0${index + 1}</span><span class="path-visual-symbol">${esc(path.symbol)}</span><div class="path-mini-steps" aria-hidden="true">${stats.collection.map(course => `<span>${esc(course.symbol)}</span>`).join('<i></i>')}</div><span class="path-visual-caption">ONE DIRECTION. MANY POSSIBILITIES.</span></div><div class="path-card-body"><div class="path-category">${path.category}${joined ? '<span class="status-pill success">Joined</span>' : ''}</div><h2>${path.title}</h2><p>${path.description}</p><div class="path-meta"><span>${icon('book')}${path.courses.length} courses</span><span>${icon('clock')}${stats.hours}h with practice</span></div><div class="skill-tags">${path.skills.map(skill => `<span>${skill}</span>`).join('')}</div><div class="path-progress-label"><span>${stats.done} / ${stats.total} lessons</span><strong>${stats.percent}%</strong></div><div class="progress" role="progressbar" aria-label="${path.title} progress" aria-valuenow="${stats.percent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${stats.percent}%"></span></div>${featureButton('path-details', joined ? 'Continue your path' : 'Explore this path', 'arrow', `data-id="${path.id}"`, joined ? 'button-primary' : 'button-light')}</div></article>`;
  }
  function pathsPage() {
    return `${heading('Less guessing. More growing.', 'A clear route from “where do I start?” to “look what I built.”')}<section class="workspace-hero"><div><span class="eyebrow">A BIGGER PICTURE FOR YOUR LEARNING</span><h2>Small lessons.<br><em>Something bigger.</em></h2><p>Follow a thoughtful sequence of courses, connect your skills, and build toward a project you can be proud of.</p><div class="hero-proof"><span>${icon('check')}Learn in a clear order</span><span>${icon('check')}Keep your existing progress</span></div></div><div class="path-hero-map" aria-hidden="true"><span class="map-node start">01 <b>Discover</b></span><span class="map-line"></span><span class="map-node middle">02 <b>Practice</b></span><span class="map-line"></span><span class="map-node finish">${icon('sparkles')}<b>Create</b></span></div></section><div class="section-heading"><div><h2>Choose your direction</h2><p>Three paths. Plenty of room to make them your own.</p></div><span class="subtle-count">3 CURATED PATHS</span></div><div class="paths-grid">${paths.map(pathCard).join('')}</div><div class="workspace-tip">${icon('compass')}<p>Prefer to follow your own curiosity? <a href="#explore">Explore individual courses ${icon('arrow')}</a></p></div>`;
  }
  function openPath(id) {
    const path = paths.find(item => item.id === id); if (!path) return;
    const stats = pathStats(path); const joined = data.joinedPaths.includes(id);
    app.openDialog(`${app.dialogHeader(path.title, path.category)}<div class="dialog-body"><p>${path.description}</p><div class="path-detail-summary"><span>${icon('book')}${stats.collection.length} courses</span><span>${icon('clock')}${stats.hours}h with practice</span><span>${icon('check')}${stats.done} lessons completed</span></div><div class="outcome"><strong>Your destination</strong>${path.project}</div><ol class="path-roadmap">${stats.collection.map((course, index) => `<li><span class="roadmap-marker ${progress(course) === 100 ? 'done' : ''}">${progress(course) === 100 ? icon('check') : index + 1}</span><div><span class="roadmap-kicker">STEP ${index + 1} · ${course.category}</span><h3>${course.title}</h3><p>${course.outcome}</p><button class="text-button" data-workspace="path-course" data-id="${course.id}">${app.getState().enrollments[course.id] ? 'Open your course' : 'Preview course'} ${icon('arrow')}</button></div><span class="roadmap-percent">${progress(course)}%</span></li>`).join('')}</ol><div class="dialog-actions">${featureButton(joined ? 'path-continue' : 'path-join', joined ? stats.percent === 100 ? 'Review your path' : 'Continue learning' : 'Join this learning path', 'arrow', `data-id="${id}"`)}${featureButton('session-new', 'Plan study time', 'calendar', `data-course="${path.courses[0]}"`, 'button-light')}</div><p class="dialog-footnote">Joining adds these courses to My learning. Your completed lessons are preserved.</p></div>`);
  }

  // A weekly planner with local-time validation, conflict detection, and calendar export.
  function sessionRow(session) {
    const course = courseById(session.courseId);
    return `<article class="session-row ${session.done ? 'session-done' : ''}"><div class="session-date"><strong>${fmt(session.date, { day: 'numeric' })}</strong><span>${fmt(session.date, { month: 'short' })}</span></div><div class="session-info"><div class="session-topline"><span class="session-course">${course.title}</span>${statusPill(session)}</div><h3>${esc(session.title)}</h3><p>${icon('clock')}${readableTime(session.time)} <span>·</span> ${session.duration} min${session.note ? ` <span>·</span> <span class="session-note-preview">${esc(session.note)}</span>` : ''}</p></div><div class="session-actions"><button class="icon-button session-check ${session.done ? 'checked' : ''}" data-workspace="session-toggle" data-id="${session.id}" aria-label="${session.done ? 'Mark unfinished' : 'Mark completed'}: ${esc(session.title)}" aria-pressed="${session.done}">${icon('check')}</button><button class="icon-button" data-workspace="session-edit" data-id="${session.id}" aria-label="Edit ${esc(session.title)}">${icon('edit')}</button><button class="icon-button session-open" data-workspace="path-course" data-id="${course.id}" aria-label="Open ${course.title}">${icon('arrow')}</button></div></article>`;
  }
  function plannerPage() {
    const dates = week();
    const sessions = sortSessions(data.sessions.filter(session => dates.includes(session.date)));
    const visible = sessions.filter(session => (!selectedDay || session.date === selectedDay) && (sessionFilter === 'all' || (sessionFilter === 'completed' ? session.done : !session.done)));
    const plannedMinutes = sessions.reduce((sum, session) => sum + session.duration, 0);
    return `${heading('Make time for your next chapter.', 'A little intention turns “someday” into a date on the calendar.', featureButton('session-new', 'Plan a session', 'plus'))}${metrics([['calendar', sessions.length, 'Sessions this week', 'A plan that fits your life'], ['clock', durationLabel(plannedMinutes), 'Time set aside', 'Across this week’s sessions'], ['check', sessions.filter(session => session.done).length, 'Sessions completed', 'Recorded by you']])}<div class="planner-layout"><section class="panel planner-main"><div class="calendar-heading"><div><span class="section-kicker">YOUR WEEK, AT A GLANCE</span><h2>${fmt(dates[0])} – ${fmt(dates[6], { month: 'short', day: 'numeric', year: 'numeric' })}</h2></div><div class="calendar-navigation"><button class="icon-button previous-arrow" data-workspace="week-prev" aria-label="Previous week">${icon('chevron')}</button><button class="button button-light" data-workspace="week-today">Today</button><button class="icon-button" data-workspace="week-next" aria-label="Next week">${icon('chevron')}</button></div></div><div class="calendar-week" role="group" aria-label="Choose a day to filter sessions">${dates.map(date => `<button class="calendar-day ${date === localDate() ? 'is-today' : ''} ${selectedDay === date ? 'selected' : ''}" data-workspace="day-select" data-date="${date}" aria-pressed="${selectedDay === date}" aria-label="${fmt(date, { weekday: 'long', month: 'long', day: 'numeric' })}, ${sessions.filter(session => session.date === date).length} sessions"><span>${fmt(date, { weekday: 'short' })}</span><strong>${fmt(date, { day: 'numeric' })}</strong><span class="calendar-dots" aria-hidden="true">${sessions.filter(session => session.date === date).slice(0, 3).map(session => `<i class="${session.done ? 'done' : ''}"></i>`).join('')}</span></button>`).join('')}</div><div class="agenda-heading"><h3>${selectedDay ? fmt(selectedDay, { weekday: 'long', month: 'short', day: 'numeric' }) : 'This week’s agenda'}</h3><div>${selectedDay ? '<button class="text-button" data-workspace="day-clear">Show full week</button>' : ''}<label class="sr-only" for="session-filter">Session status</label><select id="session-filter">${[['all', 'All sessions'], ['planned', 'Planned'], ['completed', 'Completed']].map(([value, label]) => `<option value="${value}"${sessionFilter === value ? ' selected' : ''}>${label}</option>`).join('')}</select></div></div><div class="session-list">${visible.length ? visible.map(sessionRow).join('') : empty('A little space for something good.', sessionFilter === 'completed' ? 'Completed sessions will appear here. Your course progress is tracked separately.' : 'Choose a course, set a time, and give your curiosity a place in your week.', featureButton('session-new', 'Add a study session', 'plus', selectedDay ? `data-date="${selectedDay}"` : ''), 'calendar')}</div></section><aside class="planner-aside"><section class="planner-advice"><span class="advice-icon">${icon('sparkles')}</span><span class="eyebrow">MAKE IT MANAGEABLE</span><h2>Start small.<br>Show up often.</h2><p>Twenty-five focused minutes can go a long way. Leave a little breathing room between sessions.</p><div class="advice-divider"></div><strong>Your rhythm, your rules.</strong><p>Reschedule when life happens. Progress doesn’t need to be perfect.</p></section><section class="panel calendar-export"><span class="metric-symbol">${icon('calendar')}</span><h3>Keep your calendars together</h3><p>Download this week’s planned sessions and add them to your calendar app.</p>${featureButton('calendar-export', 'Export this week', 'download', ` ${sessions.filter(session => !session.done).length ? '' : 'disabled'}`, 'button-light')}<small>Downloads an .ics file. No account connection required.</small></section></aside></div>`;
  }
  function sessionDialog(id = '', courseId = '', date = '') {
    returnToLesson = null;
    const session = data.sessions.find(item => item.id === id);
    const now = new Date(); now.setMinutes(Math.ceil((now.getMinutes() + 30) / 15) * 15, 0, 0);
    const defaultDate = validDate(date) && date >= localDate() ? date : localDate(now);
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    app.openDialog(`${app.dialogHeader(session ? 'A plan that works for you.' : 'Give your curiosity some time.', session ? 'EDIT STUDY SESSION' : 'NEW STUDY SESSION')}<div class="dialog-body"><form id="session-form" data-id="${session?.id || ''}"><div class="form-grid"><label class="field full">What would you like to work on?<input name="title" required maxlength="100" placeholder="e.g. Practice CSS Grid layouts" value="${esc(session?.title || '')}"></label><label class="field full">Course<select name="courseId">${courses.map(course => `<option value="${course.id}"${course.id === (session?.courseId || courseId) ? ' selected' : ''}>${course.title}</option>`).join('')}</select></label><label class="field">Date<input name="date" type="date" required value="${session?.date || defaultDate}"${session ? '' : ` min="${localDate()}"`}></label><label class="field">Start time<input name="time" type="time" required value="${session?.time || defaultTime}"></label><label class="field full">Time to focus<select name="duration">${[15, 25, 30, 45, 60, 90, 120].map(value => `<option value="${value}"${value === (session?.duration || 25) ? ' selected' : ''}>${value} minutes${value === 25 ? ' · A focused sprint' : ''}</option>`).join('')}</select></label><label class="field full">A small intention <span class="optional-label">(optional)</span><textarea name="note" maxlength="500" placeholder="What would make this session feel like progress?">${esc(session?.note || '')}</textarea></label></div><p id="session-error" class="form-error" role="alert" hidden></p><div class="form-footer">${session ? `<button class="text-button danger-text" type="button" data-workspace="session-delete" data-id="${session.id}">${icon('trash')}Delete session</button>` : '<p>Times use your device’s local timezone.</p>'}<button type="submit" class="button button-primary">${session ? 'Save changes' : 'Add to my planner'} ${icon('check')}</button></div></form><p class="dialog-footnote">Planning study time doesn’t change your lesson progress. Mark a session completed after you’ve studied.</p></div>`);
    $('#session-form [name="title"]').focus();
  }
  function saveSession(form) {
    const fields = new FormData(form); const id = form.dataset.id; const previous = data.sessions.find(item => item.id === id);
    const session = { id: previous?.id || uid(), courseId: String(fields.get('courseId')), title: String(fields.get('title')).trim(), date: String(fields.get('date')), time: String(fields.get('time')), duration: Number(fields.get('duration')), note: String(fields.get('note')).trim(), done: previous?.done || false, completedAt: previous?.completedAt || '' };
    const error = message => { $('#session-error').textContent = message; $('#session-error').hidden = false; };
    if (!session.title) return error('Give your session a short title.');
    if (!validDate(session.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(session.time) || !courseById(session.courseId) || ![15, 25, 30, 45, 60, 90, 120].includes(session.duration)) return error('Choose a valid course, date, time, and duration.');
    if ((!previous || previous.date !== session.date || previous.time !== session.time) && startsAt(session) < Date.now() - 60000) return error('Choose a time in the future for your study session.');
    const conflict = data.sessions.find(item => item.id !== id && !item.done && !session.done && startsAt(session) < startsAt(item) + item.duration * 60000 && startsAt(session) + session.duration * 60000 > startsAt(item));
    if (conflict) return error(`This overlaps with “${conflict.title}” at ${readableTime(conflict.time)}. Try a different time.`);
    if (previous) data.sessions = data.sessions.map(item => item.id === id ? session : item); else data.sessions.push(session);
    // Bring the new or moved session into view, including dates across a year boundary.
    const targetMonday = dayAfter(session.date, -((new Date(`${session.date}T12:00:00`).getDay() + 6) % 7));
    weekOffset = 0; const baseMonday = week()[0];
    weekOffset = Math.round((Date.parse(`${targetMonday}T12:00:00Z`) - Date.parse(`${baseMonday}T12:00:00Z`)) / 604800000);
    selectedDay = ''; sessionFilter = 'all';
    persist(previous ? 'Your study session is updated.' : 'A little time for yourself, officially on the calendar.');
    $('#app-dialog').close(); redraw();
  }
  function exportCalendar() {
    const sessions = sortSessions(data.sessions.filter(session => week().includes(session.date) && !session.done));
    if (!sessions.length) return;
    const utc = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const ical = text => text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    // RFC 5545 lines are folded by UTF-8 byte length, without splitting characters.
    const fold = line => { let result = ''; let bytes = 0; for (const char of line) { const size = new TextEncoder().encode(char).length; if (bytes + size > 73) { result += '\r\n '; bytes = 1; } result += char; bytes += size; } return result; };
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MyCourses//Study Planner//EN', 'CALSCALE:GREGORIAN'];
    sessions.forEach(session => lines.push('BEGIN:VEVENT', `UID:${session.id}@mycourses.local`, `DTSTAMP:${utc(new Date())}`, `DTSTART:${utc(new Date(startsAt(session)))}`, `DTEND:${utc(new Date(startsAt(session) + session.duration * 60000))}`, `SUMMARY:${ical(session.title)}`, `DESCRIPTION:${ical(`${courseById(session.courseId).title}\n${session.note}`)}`, 'END:VEVENT'));
    lines.push('END:VCALENDAR'); download(lines.map(fold).join('\r\n') + '\r\n', 'mycourses-study-plan.ics', 'text/calendar;charset=utf-8'); app.toast('Your study plan is ready to import into your calendar.');
  }

  // A notebook that links ideas back to the course and lesson where they started.
  function visibleNotes() {
    return data.notes.filter(note => (noteCourse === 'all' || (noteCourse === 'general' ? !note.courseId : note.courseId === noteCourse)) && `${note.title} ${note.body} ${courseById(note.courseId)?.title || ''}`.toLowerCase().includes(noteQuery.trim().toLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned) || (noteSort === 'title' ? a.title.localeCompare(b.title) : Date.parse(b.updatedAt) - Date.parse(a.updatedAt)));
  }
  function noteCard(note) {
    const course = courseById(note.courseId);
    return `<article class="note-card ${note.pinned ? 'pinned' : ''}"><div class="note-card-top"><span class="note-course-label ${course?.color || 'mint'}">${course?.title || 'Personal reflection'}</span><button class="icon-button pin-button" data-workspace="note-pin" data-id="${note.id}" aria-label="${note.pinned ? 'Unpin' : 'Pin'} ${esc(note.title)}" aria-pressed="${note.pinned}">${icon('pin')}</button></div><button class="note-content-button" data-workspace="note-edit" data-id="${note.id}"><h3>${esc(note.title)}</h3><p>${esc(note.body || 'An idea waiting to take shape…')}</p></button><div class="note-card-footer"><span>${note.lesson !== null && course ? `Lesson ${note.lesson + 1} · ` : ''}${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(note.updatedAt))}</span><button class="text-button" data-workspace="note-edit" data-id="${note.id}">Open note ${icon('arrow')}</button></div></article>`;
  }
  function notesResults() {
    const notes = visibleNotes();
    return `<div class="notes-result-heading"><p role="status">${notes.length} ${notes.length === 1 ? 'note' : 'notes'}${data.notes.some(note => note.pinned) ? ' · Pinned notes appear first' : ''}</p>${noteQuery || noteCourse !== 'all' ? '<button class="text-button" data-workspace="notes-clear">Clear filters</button>' : ''}</div><div class="notes-grid">${notes.length ? notes.map(noteCard).join('') : data.notes.length ? empty('No notes match just yet.', 'Try a different word or select another course.', featureButton('notes-clear', 'Clear filters', 'search'), 'search') : empty('Keep the ideas that click.', 'An explanation in your own words. A question for later. A little “aha!” moment. Make this notebook yours.', featureButton('note-new', 'Write your first note', 'plus'), 'note')}</div>`;
  }
  function notebookPage() {
    return `${heading('Good ideas deserve a home.', 'Your thoughts, questions, and little breakthroughs. All in one place.', featureButton('note-new', 'New note', 'plus'))}<div class="notebook-banner"><span class="notebook-banner-icon">${icon('note')}</span><div><span class="eyebrow">YOUR PERSONAL KNOWLEDGE LIBRARY</span><h2>Learn it. Write it. Make it yours.</h2><p>Add a note from any lesson, or start with a blank page here.</p></div><span class="notebook-decoration" aria-hidden="true">a little<br><em>aha!</em></span></div><div class="notes-toolbar"><label class="notes-search">${icon('search')}<span class="sr-only">Search your notes</span><input id="note-search" type="search" placeholder="Find a thought, topic, or course…" value="${esc(noteQuery)}"></label><div class="toolbar-controls"><label class="sr-only" for="note-course">Filter notes by course</label><select id="note-course"><option value="all">All courses</option><option value="general"${noteCourse === 'general' ? ' selected' : ''}>Personal reflections</option>${courses.map(course => `<option value="${course.id}"${noteCourse === course.id ? ' selected' : ''}>${course.title}</option>`).join('')}</select><label class="sr-only" for="note-sort">Sort notes</label><select id="note-sort"><option value="recent">Recently edited</option><option value="title"${noteSort === 'title' ? ' selected' : ''}>Title: A to Z</option></select><button class="icon-button export-notes" data-workspace="notes-export" aria-label="Export all notes as Markdown" title="Export all notes"${data.notes.length ? '' : ' disabled'}>${icon('download')}</button></div></div><section id="notes-results" aria-label="Your notes">${notesResults()}</section>`;
  }
  function noteDialog(id = '', courseId = '', lesson = null, fromLesson = false) {
    const note = data.notes.find(item => item.id === id);
    returnToLesson = fromLesson ? { courseId, lesson } : null;
    const course = courseById(note?.courseId || courseId);
    const linkedLesson = note ? note.lesson : lesson;
    app.openDialog(`${app.dialogHeader(note ? 'A thought worth keeping.' : 'What clicked for you?', note ? 'EDIT YOUR NOTE' : 'A NEW PAGE')}<div class="dialog-body"><form id="note-form" data-id="${note?.id || ''}" data-lesson="${linkedLesson ?? ''}" data-original-course="${course?.id || ''}"><div class="form-grid"><label class="field full">Give your thought a title<input name="title" maxlength="100" required placeholder="e.g. How CSS Grid finally made sense" value="${esc(note?.title || (linkedLesson !== null && course ? course.topics[linkedLesson] : ''))}"></label><label class="field full">Keep it with a course<select name="courseId"><option value="">Personal reflection</option>${courses.map(item => `<option value="${item.id}"${item.id === course?.id ? ' selected' : ''}>${item.title}</option>`).join('')}</select></label><label class="field full">Your note<textarea class="note-editor" name="body" maxlength="5000" placeholder="Explain it in your own words. Capture a code snippet. Ask your next question.">${esc(note?.body || '')}</textarea><small><span id="note-character-count">${note?.body.length || 0}</span> / 5,000 characters · Plain text, saved when you choose Save note.</small></label><label class="checkbox-field"><input type="checkbox" name="pinned"${note?.pinned ? ' checked' : ''}>Pin this note for easy access</label></div>${linkedLesson !== null && course ? `<div class="note-lesson-context">${icon('book')}Linked to lesson ${linkedLesson + 1}: ${course.topics[linkedLesson]}</div>` : ''}<p class="form-error" id="note-error" role="alert" hidden></p><div class="form-footer">${note ? `<button class="text-button danger-text" type="button" data-workspace="note-delete" data-id="${note.id}">${icon('trash')}Delete note</button>` : '<p>A space to think, in your own words.</p>'}<button class="button button-primary" type="submit">Save note ${icon('check')}</button></div></form>${note?.courseId ? `<button class="text-button note-back-link" data-workspace="note-course" data-id="${note.id}">Back to ${note.lesson !== null ? 'this lesson' : 'course'} ${icon('arrow')}</button>` : ''}</div>`);
    $('#note-form [name="title"]').focus();
  }
  function saveNote(form) {
    const fields = new FormData(form); const previous = data.notes.find(item => item.id === form.dataset.id);
    const title = String(fields.get('title')).trim(); const courseId = String(fields.get('courseId'));
    if (!title) { $('#note-error').textContent = 'Give your note a title so you can find it later.'; $('#note-error').hidden = false; return; }
    const note = { id: previous?.id || uid(), title, body: String(fields.get('body')), courseId: courseById(courseId)?.id || '', lesson: courseId === form.dataset.originalCourse && form.dataset.lesson !== '' ? Number(form.dataset.lesson) : null, pinned: fields.get('pinned') === 'on', updatedAt: new Date().toISOString() };
    if (previous) data.notes = data.notes.map(item => item.id === previous.id ? note : item); else data.notes.push(note);
    persist('A good thought, safely kept.'); redraw();
    if (returnToLesson) { const target = returnToLesson; returnToLesson = null; app.openLesson(target.courseId, target.lesson); }
    else $('#app-dialog').close();
  }
  function lessonTools(courseId, lesson) {
    const notes = data.notes.filter(note => note.courseId === courseId && note.lesson === lesson);
    return `<div class="lesson-workspace"><div><strong>Make the learning stick.</strong><span>${notes.length ? `${notes.length} ${notes.length === 1 ? 'note' : 'notes'} linked to this lesson` : 'Save a thought. Make a plan to practice.'}</span></div><div>${featureButton('lesson-note', notes.length ? 'Add another note' : 'Take a note', 'note', `data-course="${courseId}" data-lesson="${lesson}"`, 'button-light')}${featureButton('session-new', 'Plan practice', 'calendar', `data-course="${courseId}"`, 'button-light')}</div></div>`;
  }

  // Insights are derived from actual course completions and self-recorded study sessions.
  function activityStreak() {
    const dates = new Set([...app.getState().activity.map(item => item.date), ...data.sessions.filter(item => item.done).map(item => item.completedAt)]);
    let date = dates.has(localDate()) ? localDate() : dayAfter(localDate(), -1);
    let count = 0; while (dates.has(date)) { count++; date = dayAfter(date, -1); } return count;
  }
  function insightsPage() {
    const state = app.getState();
    const dates = Array.from({ length: insightDays }, (_, index) => dayAfter(localDate(), index - insightDays + 1));
    const activity = state.activity.filter(item => dates.includes(item.date));
    const sessions = data.sessions.filter(item => item.done && dates.includes(item.completedAt));
    const minutes = sessions.reduce((sum, item) => sum + item.duration, 0);
    const totalLessons = courses.reduce((sum, course) => sum + completed(course), 0);
    const finished = courses.filter(course => progress(course) === 100);
    const max = Math.max(3, ...dates.map(date => activity.filter(item => item.date === date).length));
    const categories = ['Frontend', 'Backend', 'Database'].map(name => ({ name, count: courses.filter(course => course.category === name).reduce((sum, course) => sum + completed(course), 0) }));
    const firstAngle = totalLessons ? categories[0].count / totalLessons * 360 : 0;
    const secondAngle = totalLessons ? firstAngle + categories[1].count / totalLessons * 360 : 0;
    const milestones = [['First steps', 'Complete your first lesson', totalLessons >= 1, 'play'], ['Finding your rhythm', 'Complete 10 lessons', totalLessons >= 10, 'target'], ['A chapter complete', 'Finish an entire course', finished.length > 0, 'award'], ['Words that stick', 'Save three personal notes', data.notes.length >= 3, 'note']];
    return `${heading('See how far you’ve come.', 'Small steps add up. Here’s the story your progress is telling.', `<div class="range-selector" role="group" aria-label="Insight time period">${[7, 28].map(days => `<button data-workspace="insights-range" data-days="${days}" class="${insightDays === days ? 'active' : ''}" aria-pressed="${insightDays === days}">${days} days</button>`).join('')}</div>`)}${metrics([['check', activity.length, 'Lessons completed', `In the last ${insightDays} days`], ['clock', durationLabel(minutes), 'Study time recorded', 'From sessions you marked complete'], ['sparkles', `${activityStreak()} ${activityStreak() === 1 ? 'day' : 'days'}`, 'Your current streak', 'Study sessions or lesson completions'], ['award', finished.length, 'Courses completed', `${totalLessons} lessons across all time`]])}<div class="insights-grid"><section class="panel activity-panel"><div class="section-heading"><div><span class="section-kicker">SHOWING UP IS THE FIRST STEP</span><h2>Your learning rhythm</h2></div><span class="chart-legend"><i></i>Lessons completed</span></div><div class="activity-chart" role="img" aria-label="${activity.length} lessons completed in the last ${insightDays} days"><div class="chart-grid" aria-hidden="true"><span>${max}</span><span>${Math.round(max / 2)}</span><span>0</span></div><div class="chart-bars ${insightDays === 28 ? 'compact' : ''}">${dates.map((date, index) => { const count = activity.filter(item => item.date === date).length; return `<div class="chart-column"><div class="bar-space"><div class="activity-bar ${date === localDate() ? 'current' : ''}" style="height:${count / max * 100}%" title="${fmt(date)}: ${count} lessons"><span>${count || ''}</span></div></div><span class="bar-label">${insightDays === 7 ? fmt(date, { weekday: 'short' }) : index % 7 === 0 || index === 27 ? fmt(date, { day: 'numeric' }) : ''}</span></div>`; }).join('')}</div></div><p class="chart-footnote">${activity.length ? `${activity.length} small steps forward. Every one counts.` : 'Your next completed lesson will be your first mark on this chart.'}</p><details class="chart-data"><summary>View activity as a table</summary><table><caption>Lesson completions by day</caption><thead><tr><th scope="col">Date</th><th scope="col">Lessons</th></tr></thead><tbody>${dates.map(date => `<tr><th scope="row">${fmt(date)}</th><td>${activity.filter(item => item.date === date).length}</td></tr>`).join('')}</tbody></table></details></section><section class="panel skills-panel"><span class="section-kicker">WHERE YOUR CURIOSITY GOES</span><h2>Your skill mix</h2><div class="skill-donut" style="background:conic-gradient(#72997b 0deg ${firstAngle}deg,#a69ac0 ${firstAngle}deg ${secondAngle}deg,#d4b087 ${secondAngle}deg ${totalLessons ? 360 : 0}deg,#edf0e9 ${totalLessons ? 360 : 0}deg 360deg)" role="img" aria-label="${categories.map(item => `${item.name}: ${item.count} lessons`).join(', ')}"><div><strong>${totalLessons}</strong><span>lessons learned</span></div></div><div class="skill-legend">${categories.map((item, index) => `<div><i class="skill-${index}"></i><span>${item.name}</span><strong>${item.count} lessons</strong></div>`).join('')}</div><p class="chart-footnote">All-time progress, including the demo’s starting lessons.</p></section><section class="panel milestone-panel"><div class="section-heading"><div><span class="section-kicker">LITTLE WINS WORTH KEEPING</span><h2>Your milestones</h2></div><span class="subtle-count">${milestones.filter(item => item[2]).length} / ${milestones.length} UNLOCKED</span></div><div class="milestone-grid">${milestones.map(([title, description, unlocked, symbol]) => `<div class="milestone ${unlocked ? 'unlocked' : ''}"><span class="milestone-symbol">${icon(symbol)}</span><h3>${title}</h3><p>${description}</p><span class="milestone-state">${unlocked ? `${icon('check')} Achieved` : 'Something to work toward'}</span></div>`).join('')}</div></section></div><div class="workspace-tip">${icon('help')}<p>Charts use recorded activity. Study time comes from sessions you mark complete; it is not an automatic timer.</p><button class="text-button" data-workspace="insights-export">Export progress ${icon('download')}</button></div>`;
  }
  function overview() {
    const next = sortSessions(data.sessions.filter(session => !session.done && startsAt(session) + session.duration * 60000 >= Date.now()))[0];
    return `<section class="workspace-overview" aria-label="Your personal workspace"><div class="next-session"><span class="workspace-tile-icon">${icon('calendar')}</span><div><span class="section-kicker">${next ? 'YOUR NEXT STUDY DATE' : 'A LITTLE INTENTION GOES A LONG WAY'}</span><h3>${next ? esc(next.title) : 'Give your learning a little space.'}</h3><p>${next ? `${fmt(next.date)} · ${readableTime(next.time)} · ${next.duration} min` : 'Plan a session. Show up for your future self.'}</p></div>${next ? '<a href="#planner" class="text-button">View planner ' + icon('arrow') + '</a>' : featureButton('session-new', 'Plan a session', 'plus', '', 'button-light')}</div><a href="#paths" class="workspace-shortcut"><span>${icon('route')}</span><div><strong>Find your direction</strong><small>Explore learning paths</small></div>${icon('arrow')}</a></section>`;
  }

  function searchResults(query) {
    const words = query.trim().toLowerCase().split(/\s+/);
    const matches = value => words.every(word => value.toLowerCase().includes(word));
    const results = [
      ...paths.filter(path => matches(`${path.title} ${path.category} ${path.skills.join(' ')} ${path.courses.map(id => courseById(id).title).join(' ')}`)).map(path => ({ type: 'Learning path', title: path.title, detail: `${path.courses.length} connected courses`, symbol: 'route', action: 'path-details', id: path.id })),
      ...data.notes.filter(note => matches(`${note.title} ${note.body} ${courseById(note.courseId)?.title || ''}`)).map(note => ({ type: 'Notebook', title: note.title, detail: courseById(note.courseId)?.title || 'Personal reflection', symbol: 'note', action: 'note-edit', id: note.id })),
      ...data.sessions.filter(session => matches(`${session.title} ${session.note} ${courseById(session.courseId).title}`)).map(session => ({ type: 'Study session', title: session.title, detail: `${fmt(session.date)} · ${readableTime(session.time)}`, symbol: 'calendar', action: 'session-edit', id: session.id }))
    ];
    if (!results.length) return '';
    return `<section class="workspace-search-results" aria-label="Matching items in your workspace"><div class="section-heading"><h2>From your workspace</h2><span class="subtle-count">${results.length} ${results.length === 1 ? 'MATCH' : 'MATCHES'}${results.length > 6 ? ' · SHOWING FIRST 6' : ''}</span></div><div class="workspace-search-grid">${results.slice(0, 6).map(result => `<button class="workspace-result" data-workspace="${result.action}" data-id="${result.id}"><span class="workspace-result-icon">${icon(result.symbol)}</span><span><small>${result.type}</small><strong>${esc(result.title)}</strong><span>${esc(result.detail)}</span></span>${icon('arrow')}</button>`).join('')}</div></section>`;
  }

  function removeItem(collection, id) {
    const item = data[collection].find(value => value.id === id); if (!item) return;
    data[collection] = data[collection].filter(value => value.id !== id);
    undoItem = { collection, item }; persist(collection === 'notes' ? 'Note deleted.' : 'Session removed.');
    $('#app-dialog').close(); redraw();
    const button = document.createElement('button'); button.className = 'undo-button'; button.dataset.workspace = 'undo'; button.textContent = 'Undo'; $('#toast').append(button);
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-workspace]'); if (!button) return;
    const { workspace: action, id, course, lesson, date } = button.dataset;
    switch (action) {
      case 'path-details': openPath(id); break;
      case 'path-join': {
        const path = paths.find(item => item.id === id); if (!path) break;
        if (!data.joinedPaths.includes(id)) data.joinedPaths.push(id);
        persist(); app.enrollCourses(path.courses); openPath(id); break;
      }
      case 'path-continue': { const path = paths.find(item => item.id === id); if (path) { const next = path.courses.find(value => progress(courseById(value)) < 100) || path.courses[0]; if (app.getState().enrollments[next]) app.resume(next); else app.openDetails(next); } break; }
      case 'path-course': if (app.getState().enrollments[id]) app.resume(id); else app.openDetails(id); break;
      case 'session-new': sessionDialog('', course, date); break;
      case 'session-edit': sessionDialog(id); break;
      case 'session-delete': removeItem('sessions', id); break;
      case 'session-toggle': {
        const session = data.sessions.find(item => item.id === id); if (!session) break;
        if (!session.done && startsAt(session) > Date.now()) { app.toast('This session hasn’t started yet. You can edit its time if your plans change.'); break; }
        session.done = !session.done; session.completedAt = session.done ? localDate() : '';
        persist(session.done ? 'Time well spent. Your session is recorded in Progress insights.' : 'Session moved back to planned.'); redraw(`[data-workspace="session-toggle"][data-id="${id}"]`); break;
      }
      case 'week-prev': weekOffset--; selectedDay = ''; redraw('[data-workspace="week-prev"]'); break;
      case 'week-next': weekOffset++; selectedDay = ''; redraw('[data-workspace="week-next"]'); break;
      case 'week-today': weekOffset = 0; selectedDay = ''; redraw('[data-workspace="week-today"]'); break;
      case 'day-select': selectedDay = selectedDay === date ? '' : date; redraw(`[data-date="${date}"]`); break;
      case 'day-clear': selectedDay = ''; redraw('#session-filter'); break;
      case 'calendar-export': exportCalendar(); break;
      case 'note-new': noteDialog(); break;
      case 'note-edit': noteDialog(id); break;
      case 'lesson-note': noteDialog('', course, Number(lesson), true); break;
      case 'note-delete': removeItem('notes', id); break;
      case 'note-pin': { const note = data.notes.find(item => item.id === id); if (note) { note.pinned = !note.pinned; persist(note.pinned ? 'Pinned to the top of your notebook.' : 'Note unpinned.'); redraw(`[data-workspace="note-pin"][data-id="${id}"]`); } break; }
      case 'note-course': { const note = data.notes.find(item => item.id === id); if (note?.courseId) { if (note.lesson !== null && app.getState().enrollments[note.courseId]) app.openLesson(note.courseId, note.lesson); else app.openDetails(note.courseId); } break; }
      case 'notes-clear': noteQuery = ''; noteCourse = 'all'; redraw('#note-search'); break;
      case 'notes-export': if (data.notes.length) { download(`# MyCourses · My notebook\n\n${data.notes.map(note => `## ${note.title}\n\n${courseById(note.courseId)?.title || 'Personal reflection'}${note.lesson !== null ? ` · Lesson ${note.lesson + 1}` : ''}\n\n${note.body}\n`).join('\n---\n\n')}`, 'mycourses-notebook.md', 'text/markdown;charset=utf-8'); app.toast('Your notebook is ready to take with you.'); } break;
      case 'insights-range': insightDays = Number(button.dataset.days) === 28 ? 28 : 7; redraw(`[data-days="${insightDays}"]`); break;
      case 'insights-export': download('Course,Category,Lessons completed,Total lessons,Progress percent\r\n' + courses.map(item => `${item.title},${item.category},${completed(item)},${item.topics.length},${progress(item)}`).join('\r\n'), 'mycourses-progress.csv', 'text/csv;charset=utf-8'); app.toast('Your course progress has been exported.'); break;
      case 'undo': if (undoItem) { const { collection, item } = undoItem; if (!data[collection].some(value => value.id === item.id)) data[collection].push(item); undoItem = null; persist('Restored. Right where you left it.'); redraw(); } break;
    }
  });
  document.addEventListener('submit', event => {
    if (event.target.id === 'session-form') { event.preventDefault(); saveSession(event.target); }
    if (event.target.id === 'note-form') { event.preventDefault(); saveNote(event.target); }
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'note-search') { noteQuery = event.target.value; $('#notes-results').innerHTML = notesResults(); }
    if (event.target.matches('#note-form [name="body"]')) $('#note-character-count').textContent = event.target.value.length;
    if (event.target.closest('#session-form') && $('#session-error')) $('#session-error').hidden = true;
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'session-filter') { sessionFilter = event.target.value; redraw('#session-filter'); }
    if (event.target.id === 'note-course') { noteCourse = event.target.value; redraw('#note-course'); }
    if (event.target.id === 'note-sort') { noteSort = event.target.value; redraw('#note-sort'); }
    if (event.target.matches('#note-form [name="courseId"]')) { const context = $('.note-lesson-context'); if (context) context.hidden = event.target.value !== $('#note-form').dataset.originalCourse; }
  });
  window.addEventListener('storage', event => { if (event.key === key || event.key === null) { data = read(); undoItem = null; app.render(); if ($('#app-dialog').open) $('#app-dialog').close(); } });
  return { pages: { paths: pathsPage, planner: plannerPage, notebook: notebookPage, insights: insightsPage }, overview, lessonTools, searchResults };
};
