(() => {
  'use strict';

  const courses = window.STUDIO_COURSES;
  const lessons = window.STUDIO_LESSONS;
  const storageKey = 'mycourses.learning-studio.v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const icons = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
    book: '<path d="M12 5v16M3 3c4 0 7 1 9 3 2-2 5-3 9-3v15c-4 0-7 1-9 3-2-2-5-3-9-3Z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    sparkles: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.5 1-1.5 1-1.5 3m0 3h.01"/>',
    external: '<path d="M14 3h7v7m0-7L10 14M10 3H4v17h17v-6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    award: '<circle cx="12" cy="8" r="5"/><path d="m8 12-2 9 6-3 6 3-2-9"/>',
    play: '<path d="m8 4 12 8-12 8Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
    bars: '<path d="M5 20v-5m7 5V9m7 11V3"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`;
  document.querySelectorAll('[data-icon]').forEach(element => { element.outerHTML = icon(element.dataset.icon); });
  const defaults = () => ({ profile: { name: 'Alex Morgan', email: 'alex.morgan@example.com', role: 'Aspiring frontend developer', bio: 'Curious by nature. Learning to build thoughtful things for the web.', goal: 5 }, favorites: ['javascript', 'sql'], enrollments: { html: { completed: [0, 1, 2] }, css: { completed: [0] } }, activity: [] });
  let storageAvailable = true;
  function loadState() {
    const fallback = defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved || typeof saved !== 'object') return fallback;
      if (saved.profile && typeof saved.profile === 'object') {
        for (const field of ['name', 'email', 'role', 'bio']) {
          if (typeof saved.profile[field] === 'string') fallback.profile[field] = saved.profile[field].slice(0, field === 'bio' ? 500 : 100);
        }
        if ([3, 5, 7, 10].includes(saved.profile.goal)) fallback.profile.goal = saved.profile.goal;
      }
      if (Array.isArray(saved.favorites)) fallback.favorites = [...new Set(saved.favorites.filter(id => courses.some(course => course.id === id)))];
      if (saved.enrollments && typeof saved.enrollments === 'object' && !Array.isArray(saved.enrollments)) {
        fallback.enrollments = {};
        for (const course of courses) {
          const enrollment = saved.enrollments[course.id];
          if (enrollment && Array.isArray(enrollment.completed)) fallback.enrollments[course.id] = { completed: [...new Set(enrollment.completed.filter(index => Number.isInteger(index) && index >= 0 && index < course.topics.length))] };
        }
      }
      if (Array.isArray(saved.activity)) fallback.activity = saved.activity.filter(item => item && typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && courses.some(course => course.id === item.courseId) && Number.isInteger(item.lesson) && item.lesson >= 0 && item.lesson < 5);
      return fallback;
    } catch { storageAvailable = false; return fallback; }
  }
  let state = loadState();
  let route = 'overview';
  let category = 'All courses';
  let level = 'All levels';
  let sort = 'recommended';
  let learningTab = 'in-progress';
  let query = '';
  let toastTimer;
  let dialogCourse = null;
  let lessonIndex = 0;
  let dialogOpener = null;
  const main = $('#main');
  const dialog = $('#app-dialog');
  const pageNames = { overview: 'Overview', explore: 'Explore courses', learning: 'My learning', favorites: 'Favorites', profile: 'My profile' };
  const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase() || 'L';
  const completed = course => state.enrollments[course.id]?.completed.length || 0;
  const progress = course => Math.round(completed(course) / course.topics.length * 100);
  const enrolled = () => courses.filter(course => state.enrollments[course.id]);
  const finished = () => enrolled().filter(course => progress(course) === 100);
  function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  function weekDates() {
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    return Array.from({ length: 7 }, (_, offset) => { const day = new Date(start); day.setDate(day.getDate() + offset); return localDate(day); });
  }
  const weekActivity = () => state.activity.filter(item => weekDates().includes(item.date));
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); storageAvailable = true; }
    catch { storageAvailable = false; }
    updateShell();
    return storageAvailable;
  }
  function toast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4000);
  }
  function saveMessage(message) { toast(storageAvailable ? message : `${message} Browser storage is unavailable; changes last for this session.`); }
  function updateShell() {
    document.querySelectorAll('.profile-name').forEach(el => { el.textContent = state.profile.name; });
    document.querySelectorAll('.profile-initials').forEach(el => { el.textContent = initials(state.profile.name); });
    $('#learning-count').textContent = enrolled().length;
    $('#favorites-count').textContent = state.favorites.length;
    $('#page-label').textContent = pageNames[route];
    document.querySelectorAll('[data-route]').forEach(link => {
      const active = link.dataset.route === route;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    document.title = `${pageNames[route]} · MyCourses`;
  }
  function heading(title, subtitle, extra = '') { return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${extra}</div>`; }
  function empty(title, description, action = '<a class="button button-primary" href="#explore">Explore courses ' + icon('arrow') + '</a>', symbol = 'book') { return `<div class="empty-state">${icon(symbol)}<h2>${title}</h2><p>${description}</p>${action}</div>`; }
  function courseArt(course, favorite = true) { return `<div class="course-art ${course.color}">${course.label ? `<span class="course-label">${course.label}</span>` : ''}${favorite ? `<button class="favorite-button" data-action="favorite" data-id="${course.id}" aria-label="${state.favorites.includes(course.id) ? 'Remove' : 'Save'} ${escape(course.title)} ${state.favorites.includes(course.id) ? 'from' : 'to'} favorites" aria-pressed="${state.favorites.includes(course.id)}">${icon('heart')}</button>` : ''}<span class="course-symbol" aria-hidden="true">${escape(course.symbol)}</span><span class="art-tag">${course.tag}</span></div>`; }
  function courseCard(course, learning = false) {
    const done = progress(course) === 100;
    return `<article class="course-card ${learning ? 'learning-card' : ''}">${courseArt(course)}<div class="course-body"><div class="course-category"><span>${course.category.toUpperCase()}</span><span class="course-rating">${icon('star')} ${course.rating.toFixed(1)} <span class="sr-only">out of 5</span></span></div><h3><button class="course-title" data-action="details" data-id="${course.id}">${course.title}</button></h3><div class="instructor"><span class="instructor-avatar" aria-hidden="true">${initials(course.instructor)}</span>${course.instructor}</div>${learning ? `<div class="progress-line"><div class="progress" role="progressbar" aria-label="${course.title} progress" aria-valuenow="${progress(course)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress(course)}%"></span></div><span>${completed(course)} / ${course.topics.length} lessons</span></div><button class="button ${done ? 'button-soft' : 'button-primary'}" data-action="${done ? 'certificate' : 'resume'}" data-id="${course.id}">${icon(done ? 'award' : 'play')}${done ? 'View completion record' : completed(course) ? 'Continue learning' : 'Start first lesson'}</button>` : `<div class="course-meta"><span>${icon('clock')}${course.hours} hours</span><span>${icon('bars')}${course.level}</span><button class="course-link" data-action="details" data-id="${course.id}">View course ${icon('arrow')}<span class="sr-only">: ${course.title}</span></button></div>`}</div></article>`;
  }
  function stats() {
    const values = [ ['book', enrolled().length, 'Enrolled courses'], ['play', enrolled().filter(course => progress(course) < 100).length, 'In progress'], ['award', finished().length, 'Completed courses'], ['check', enrolled().reduce((total, course) => total + completed(course), 0), 'Lessons completed'] ];
    return `<div class="stats-grid">${values.map(([symbol, value, label]) => `<div class="stat-card"><span class="stat-icon">${icon(symbol)}</span><div><div class="stat-value">${value.toString().padStart(2, '0')}</div><div class="stat-label">${label}</div></div></div>`).join('')}</div>`;
  }
  function continueCard(course) {
    const next = course.topics.findIndex((_, index) => !state.enrollments[course.id].completed.includes(index));
    return `<article class="continue-card"><div class="mini-art ${course.color}" aria-hidden="true">${escape(course.symbol)}</div><div class="continue-content"><h3>${course.title}</h3><p>Up next: ${course.topics[next]}</p><div class="progress-line"><div class="progress" role="progressbar" aria-label="${course.title} progress" aria-valuenow="${progress(course)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress(course)}%"></span></div><span>${progress(course)}%</span></div></div><button class="resume-button" data-action="resume" data-id="${course.id}" aria-label="Continue ${course.title}">${icon('play')}</button></article>`;
  }
  function weeklyCard() {
    const count = weekActivity().length;
    return `<aside class="weekly-card"><div class="section-heading"><h3>Your weekly goal</h3><button class="icon-button" data-action="goal" aria-label="Edit weekly goal">${icon('target')}</button></div><p>Small steps. Real progress.</p><div class="goal-value"><strong>${count}</strong><span>/ ${state.profile.goal} lessons this week</span></div><div class="progress" role="progressbar" aria-label="Weekly learning goal" aria-valuenow="${Math.min(count, state.profile.goal)}" aria-valuemin="0" aria-valuemax="${state.profile.goal}"><span style="width:${Math.min(count / state.profile.goal * 100, 100)}%"></span></div><div class="week-days">${weekDates().map((date, index) => { const done = state.activity.some(item => item.date === date); return `<span class="week-day"><span>${['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</span><span class="day-dot ${done ? 'done' : ''} ${date === localDate() ? 'today' : ''}" aria-label="${date}${done ? ': lesson completed' : ''}${date === localDate() ? ': today' : ''}">${done ? icon('check') : ''}</span></span>`; }).join('')}</div><div class="goal-note">${count >= state.profile.goal ? 'Goal reached. Look at you grow!' : 'Your next lesson is a step forward.'}</div></aside>`;
  }
  function categoryTabs() { return `<div class="category-tabs" role="group" aria-label="Course category">${['All courses', 'Frontend', 'Backend', 'Database'].map(name => `<button class="category-tab ${category === name ? 'active' : ''}" data-action="category" data-category="${name}" aria-pressed="${category === name}">${name}</button>`).join('')}</div>`; }
  function overview() {
    const active = enrolled().filter(course => progress(course) < 100).slice(0, 2);
    const recommendations = courses.filter(course => category === 'All courses' || course.category === category).slice(0, 3);
    const date = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
    return `${heading(`A good day to grow, ${escape(state.profile.name.trim().split(/\s+/)[0] || 'Learner')}. <span aria-hidden="true">✧</span>`, 'A little curiosity today. A world of possibilities tomorrow.', `<span class="date-label">${icon('calendar')}${date}</span>`)}<section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><div class="eyebrow">INVEST IN YOURSELF</div><h2 id="hero-title">Your next chapter<br>starts with <em>a new skill.</em></h2><p>Explore practical courses, learn at your own pace,<br>and turn your ambition into something real.</p><a href="#explore" class="button button-primary">Explore courses ${icon('arrow')}</a></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="code-window"><div class="window-dots"><i></i><i></i><i></i></div><pre>&lt;<b>your-future</b>&gt;\n  curiosity: <b>limitless</b>;\n  potential: <b>infinite</b>;\n  next-step: <b>start</b>;\n&lt;/<b>your-future</b>&gt;</pre></div><span class="floating-symbol one">&lt;/&gt;</span><span class="floating-symbol two">✦</span><span class="hero-spark">✧</span><span class="hero-caption">A WORK IN PROGRESS. JUST LIKE YOU.</span></div></section>${stats()}<div class="overview-middle"><section><div class="section-heading"><div><h2>Pick up where you left off</h2><p>Your next breakthrough is one lesson away.</p></div><a href="#learning" class="text-button">My learning ${icon('arrow')}</a></div><div class="continue-list">${active.length ? active.map(continueCard).join('') : empty('Make room for something new', 'Find your next course and start a new chapter.')}</div></section>${weeklyCard()}</div><section class="recommendations"><div class="section-heading"><div><div class="section-kicker">A LITTLE INSPIRATION</div><h2>Find your next spark</h2></div><a href="#explore" class="text-button">View all courses ${icon('arrow')}</a></div><div class="catalog-toolbar">${categoryTabs()}<span class="results-label" style="margin:0">Handpicked for curious minds</span></div><div class="courses-grid">${recommendations.map(course => courseCard(course)).join('')}</div></section>`;
  }
  function filteredCourses(favoritesOnly = false) {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const result = courses.filter(course => (!favoritesOnly || state.favorites.includes(course.id)) && (category === 'All courses' || category === course.category) && (level === 'All levels' || level === course.level) && words.every(word => `${course.title} ${course.category} ${course.instructor} ${course.level} ${course.description} ${course.topics.join(' ')}`.toLowerCase().includes(word)));
    if (sort === 'title') result.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'duration') result.sort((a, b) => a.hours - b.hours);
    if (sort === 'rating') result.sort((a, b) => b.rating - a.rating);
    return result;
  }
  function catalog(favoritesOnly = false) {
    const list = filteredCourses(favoritesOnly);
    const reset = `<button class="button button-primary" data-action="reset-filters">Clear filters ${icon('arrow')}</button>`;
    return `${heading(favoritesOnly ? 'Saved for a curious day.' : query ? `Results for “${escape(query)}”` : 'What will you learn next?', favoritesOnly ? 'A collection of possibilities, picked by you.' : 'Build real skills. Follow your curiosity. Make your next move.')}<div class="catalog-toolbar">${categoryTabs()}<div class="toolbar-controls"><label class="sr-only" for="level-filter">Course level</label><select id="level-filter">${['All levels', 'Beginner', 'Intermediate', 'Advanced'].map(value => `<option${level === value ? ' selected' : ''}>${value}</option>`).join('')}</select><label class="sr-only" for="sort-filter">Sort courses</label><select id="sort-filter">${[['recommended', 'Recommended'], ['rating', 'Highest rated'], ['duration', 'Shortest first'], ['title', 'Title: A to Z']].map(([value, label]) => `<option value="${value}"${sort === value ? ' selected' : ''}>${label}</option>`).join('')}</select></div></div><p class="results-label" role="status">${list.length} ${list.length === 1 ? 'course' : 'courses'} ${favoritesOnly ? 'in your collection' : 'to explore'}${query ? ` · matching “${escape(query)}”` : ''}</p><div class="courses-grid">${list.length ? list.map(course => courseCard(course)).join('') : favoritesOnly && !state.favorites.length ? empty('Keep a little inspiration here', 'Tap the heart on any course to add it to your personal collection.', undefined, 'heart') : empty('No courses found', 'Try a different topic, instructor, category, or level.', reset, 'search')}</div>`;
  }
  function learning() {
    const list = enrolled().filter(course => learningTab === 'all' || (learningTab === 'completed' ? progress(course) === 100 : progress(course) < 100));
    return `${heading('Your learning, your pace.', 'Every lesson is a little investment in the person you want to become.')}<div class="page-banner"><div><div class="eyebrow">KEEP YOUR MOMENTUM</div><h2>Consistency looks good on you.</h2><p>${weekActivity().length} of ${state.profile.goal} lessons completed toward your weekly goal.</p></div><button class="button button-light" data-action="goal">${icon('target')}Edit goal</button></div>${stats()}<div class="learning-tabs" role="group" aria-label="Learning status">${[['in-progress', 'In progress'], ['completed', 'Completed'], ['all', 'All courses']].map(([value, label]) => `<button class="learning-tab ${learningTab === value ? 'active' : ''}" data-action="learning-tab" data-tab="${value}" aria-pressed="${learningTab === value}">${label} <span>(${enrolled().filter(course => value === 'all' || (value === 'completed' ? progress(course) === 100 : progress(course) < 100)).length})</span></button>`).join('')}</div><div class="courses-grid">${list.length ? list.map(course => courseCard(course, true)).join('') : empty(learningTab === 'completed' ? 'Your first milestone is ahead' : 'Your next chapter is waiting', learningTab === 'completed' ? 'Complete all lessons in a course to see it here and unlock your completion record.' : 'Explore the catalog and enroll in a course that sparks your curiosity.')}</div>`;
  }
  function profile() {
    return `${heading('A space that’s yours.', 'Your details, your goals, your story in the making.')}<div class="profile-grid"><aside class="panel profile-summary"><span class="avatar">${escape(initials(state.profile.name))}</span><h2>${escape(state.profile.name)}</h2><p>${escape(state.profile.role)}</p><div class="profile-stats"><div><strong>${enrolled().length}</strong><span>Courses</span></div><div><strong>${finished().length}</strong><span>Completed</span></div></div><p class="local-note">This is your demo learning space. Profile and progress are saved in this browser.</p></aside><div><section class="panel"><div class="form-heading"><h2>Personal information</h2><p>A little introduction to the person behind the progress.</p></div><form id="profile-form"><div class="form-grid"><label class="field">Full name<input name="name" autocomplete="name" required maxlength="60" value="${escape(state.profile.name)}"></label><label class="field">Email address<input name="email" type="email" autocomplete="email" required maxlength="100" value="${escape(state.profile.email)}"></label><label class="field full">Your headline<input name="role" maxlength="100" placeholder="e.g. Curious designer, future developer" value="${escape(state.profile.role)}"></label><label class="field full">A little about you<textarea name="bio" maxlength="500">${escape(state.profile.bio)}</textarea><small>What are you curious about? What would you love to build?</small></label><label class="field full">Weekly learning goal<select name="goal">${[3, 5, 7, 10].map(value => `<option value="${value}"${value === state.profile.goal ? ' selected' : ''}>${value} lessons per week${value === 5 ? ' · A steady pace' : ''}</option>`).join('')}</select></label></div><div class="form-footer"><p>Saved on this device. No public profile.</p><button class="button button-primary" type="submit">Save changes ${icon('check')}</button></div></form></section><section class="panel profile-achievements"><h2>Your milestones</h2>${finished().length ? finished().map(course => `<div class="achievement"><span class="achievement-icon">${icon('award')}</span><div><h3>${course.title}</h3><p>All ${course.topics.length} lessons completed</p><button class="text-button" data-action="certificate" data-id="${course.id}">View completion record ${icon('arrow')}</button></div></div>`).join('') : `<div class="achievement"><span class="achievement-icon">${icon('sparkles')}</span><div><h3>The first step is already yours.</h3><p>Finish your first course to earn a completion record.</p></div></div>`}</section></div></div>`;
  }
  function render() { updateShell(); main.innerHTML = ({ overview, explore: () => catalog(), favorites: () => catalog(true), learning, profile })[route](); }
  function setNavigation(open) {
    document.body.classList.toggle('nav-open', open);
    $('.sidebar-overlay').hidden = !open;
    $('.menu-toggle').setAttribute('aria-expanded', String(open));
    const mobile = matchMedia('(max-width: 700px)').matches;
    $('#sidebar').inert = mobile && !open;
    $('.app-shell').inert = mobile && open;
    if (open) $('.main-nav a').focus();
  }
  function navigate() {
    const requested = location.hash.slice(1).split('?')[0];
    route = Object.hasOwn(pageNames, requested) ? requested : 'overview';
    category = 'All courses'; level = 'All levels'; sort = 'recommended';
    if (route !== 'explore') { query = ''; $('#global-search').value = ''; }
    setNavigation(false);
    if (dialog.open) dialog.close();
    render(); window.scrollTo(0, 0); main.focus({ preventScroll: true });
  }
  function openDialog(content) {
    if (!dialog.open) dialogOpener = document.activeElement;
    $('#dialog-content').innerHTML = content;
    if (!dialog.open) dialog.showModal();
    $('.dialog-header .icon-button', dialog)?.focus();
  }
  function dialogHeader(title, eyebrow = '') { return `<div class="dialog-header"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h2 id="dialog-title">${title}</h2></div><button class="icon-button" data-action="close" aria-label="Close dialog">${icon('close')}</button></div>`; }
  function openDetails(id) {
    const course = courses.find(item => item.id === id); if (!course) return;
    dialogCourse = id;
    const isEnrolled = !!state.enrollments[id];
    openDialog(`${dialogHeader(course.title, `${course.category} / ${course.level}`)}<div class="dialog-body"><div class="dialog-course-art">${courseArt(course, false)}</div><div class="detail-meta"><span>${icon('user')}${course.instructor}</span><span>${icon('clock')}${course.hours} hour learning path</span><span>${icon('book')}${course.topics.length} reading lessons</span></div><p>${course.description}</p><div class="outcome"><strong>What you’ll build</strong>${course.outcome}</div><h3>Your course roadmap</h3><ol class="curriculum">${course.topics.map((topic, index) => `<li>${isEnrolled ? `<button data-action="lesson" data-id="${id}" data-index="${index}">` : '<div class="curriculum-item">'}<span class="lesson-number">${String(index + 1).padStart(2, '0')}</span>${topic}${state.enrollments[id]?.completed.includes(index) ? icon('check') : icon('book')}${isEnrolled ? '</button>' : '</div>'}</li>`).join('')}</ol><p>Self-paced demo course with short readings, code examples, and practice prompts. Suggested hours include independent practice.</p><div class="dialog-actions"><button class="button button-primary" data-action="${isEnrolled ? 'resume' : 'enroll'}" data-id="${id}">${isEnrolled ? progress(course) === 100 ? 'Review course' : 'Continue learning' : 'Start learning · Free'} ${icon('arrow')}</button><button class="button button-light" data-action="favorite" data-id="${id}" aria-pressed="${state.favorites.includes(id)}">${icon('heart')}${state.favorites.includes(id) ? 'Saved' : 'Save course'}</button></div></div>`);
  }
  function openLesson(id, index) {
    const course = courses.find(item => item.id === id);
    if (!course || !state.enrollments[id]) return;
    dialogCourse = id;
    lessonIndex = Number.isInteger(index) && index >= 0 && index < course.topics.length ? index : 0;
    const lesson = lessons[id][lessonIndex];
    const done = state.enrollments[id].completed.includes(lessonIndex);
    openDialog(`${dialogHeader(course.topics[lessonIndex], course.title)}<div class="dialog-body"><div class="lesson-top"><span>LESSON ${lessonIndex + 1} OF ${course.topics.length}</span><span>${done ? 'Completed' : 'Reading + independent practice'}</span></div><div class="lesson-content"><h3>${escape(lesson[0])}</h3><p>${escape(lesson[1])}</p><pre><code>${escape(lesson[2])}</code></pre><div class="practice-box"><h4>Make it yours · Practice</h4><p>${escape(lesson[3])}</p></div></div><div class="progress-line"><div class="progress" role="progressbar" aria-label="Course progress" aria-valuenow="${progress(course)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress(course)}%"></span></div><span>${progress(course)}% complete</span></div><div class="lesson-navigation"><button class="button button-light" data-action="details" data-id="${id}">Course roadmap</button><button class="button button-primary" data-action="complete" data-id="${id}" data-index="${lessonIndex}">${done ? lessonIndex === course.topics.length - 1 ? 'Finish review' : 'Next lesson' : 'Mark complete & continue'} ${icon('arrow')}</button></div></div>`);
  }
  function resume(id) {
    const course = courses.find(item => item.id === id); if (!course || !state.enrollments[id]) return;
    const next = course.topics.findIndex((_, index) => !state.enrollments[id].completed.includes(index));
    openLesson(id, next < 0 ? 0 : next);
  }
  function certificate(id) {
    const course = courses.find(item => item.id === id); if (!course || progress(course) !== 100) return;
    dialogCourse = id;
    openDialog(`${dialogHeader('Look how far you’ve come.', 'A MOMENT WORTH CELEBRATING')}<div class="dialog-body"><div class="page-banner"><div><div class="eyebrow">COMPLETION RECORD</div><h2>${escape(state.profile.name)}</h2><p>Completed all reading lessons in</p><h3>${course.title}</h3></div><span class="banner-symbol" aria-hidden="true">✦</span></div><p>All ${course.topics.length} lessons completed. This personal demo record acknowledges your progress; it is not an accredited certification.</p><div class="dialog-actions"><button class="button button-primary" data-action="download" data-id="${id}">${icon('download')}Download record</button><button class="button button-light" data-action="resume" data-id="${id}">Review course</button></div></div>`);
  }
  function goalDialog() { openDialog(`${dialogHeader('Make a little room to grow.', 'YOUR WEEKLY GOAL')}<div class="dialog-body"><p>A realistic goal is a great place to start. Every lesson you finish counts toward this week’s progress, Monday through Sunday.</p><form id="goal-form"><label class="field">How many lessons per week?<select name="goal">${[3, 5, 7, 10].map(value => `<option value="${value}"${value === state.profile.goal ? ' selected' : ''}>${value} lessons · ${({ 3: 'A gentle start', 5: 'A steady pace', 7: 'One a day', 10: 'An ambitious week' })[value]}</option>`).join('')}</select></label><div class="form-footer"><p>You can change this anytime.</p><button type="submit" class="button button-primary">Save my goal ${icon('check')}</button></div></form></div>`); }
  function helpDialog() { openDialog(`${dialogHeader('Welcome to your learning space.', 'A QUICK TOUR')}<div class="dialog-body"><div class="help-list"><section><h3>1. Follow your curiosity</h3><p>Explore the catalog or use the header search to find a topic, instructor, or skill. Press Ctrl K (⌘ K on Mac) to jump to search from any page.</p></section><section><h3>2. Make it your own</h3><p>Save interesting courses with the heart button. Open a course to see its roadmap, then choose Start learning to enroll.</p></section><section><h3>3. Turn reading into practice</h3><p>Each lesson includes a short explanation, a code example, and a practice prompt. Try the exercise in your own editor, then mark the lesson complete.</p></section><section><h3>4. See yourself grow</h3><p>My learning tracks your progress. Complete a course to download a personal completion record. Set a weekly goal and edit your details in My profile.</p></section><section><h3>About this demo</h3><p>The sample profile, ratings, initial favorites, and initial course progress are demonstration data. Changes stay in this browser using local storage; there is no server, sign-in, or cross-device synchronization. The original project runs separately.</p></section></div></div>`); }
  function notifications() {
    $('.notification-dot').hidden = true;
    openDialog(`${dialogHeader('Your learning updates', 'LITTLE WINS, BIG POSSIBILITIES')}<div class="dialog-body"><div class="update-item">${icon('target')}<div><h3>${weekActivity().length >= state.profile.goal ? 'Your weekly goal is complete!' : 'Your weekly goal is ready'}</h3><p>${weekActivity().length} of ${state.profile.goal} lessons completed this week.</p><button class="text-button" data-action="goal">Adjust your goal ${icon('arrow')}</button></div></div>${finished().map(course => `<div class="update-item">${icon('award')}<div><h3>You completed ${course.title}</h3><p>Your completion record is ready.</p><button class="text-button" data-action="certificate" data-id="${course.id}">View record ${icon('arrow')}</button></div></div>`).join('')}<div class="update-item">${icon('sparkles')}<div><h3>Your next chapter is here</h3><p>Explore ${courses.length} courses across frontend, backend, and databases. Your progress will be waiting when you return.</p></div></div></div>`);
  }
  function restoreFocus(action, id, value) {
    const candidates = main.querySelectorAll(`[data-action="${action}"]`);
    const target = [...candidates].find(el => (!id || el.dataset.id === id) && (!value || el.dataset.category === value || el.dataset.tab === value));
    (target || main).focus({ preventScroll: true });
  }
  document.addEventListener('click', event => {
    const control = event.target.closest('[data-action]'); if (!control) return;
    const { action, id } = control.dataset;
    switch (action) {
      case 'category': category = control.dataset.category; render(); restoreFocus(action, null, category); break;
      case 'learning-tab': learningTab = control.dataset.tab; render(); restoreFocus(action, null, learningTab); break;
      case 'reset-filters': category = 'All courses'; level = 'All levels'; query = ''; sort = 'recommended'; $('#global-search').value = ''; render(); $('#global-search').focus(); break;
      case 'details': openDetails(id); break;
      case 'favorite': {
        if (!courses.some(course => course.id === id)) break;
        const saved = state.favorites.includes(id);
        state.favorites = saved ? state.favorites.filter(value => value !== id) : [...state.favorites, id];
        persist(); render();
        if (dialog.open) openDetails(id); else restoreFocus(action, id);
        saveMessage(saved ? 'Removed from your favorites.' : 'Saved for your next curious day.');
        break;
      }
      case 'enroll': if (courses.some(course => course.id === id)) { if (!state.enrollments[id]) state.enrollments[id] = { completed: [] }; persist(); render(); saveMessage('Your next chapter starts now. Course added to My learning.'); resume(id); } break;
      case 'resume': resume(id); break;
      case 'lesson': openLesson(id, Number(control.dataset.index)); break;
      case 'complete': {
        const course = courses.find(item => item.id === id); const index = Number(control.dataset.index);
        if (!course || !state.enrollments[id] || !Number.isInteger(index) || index < 0 || index >= course.topics.length) break;
        if (!state.enrollments[id].completed.includes(index)) {
          state.enrollments[id].completed.push(index);
          state.activity.push({ date: localDate(), courseId: id, lesson: index });
          persist(); render(); saveMessage('One step further. Lesson completed!');
        }
        if (progress(course) === 100) certificate(id);
        else if (index < course.topics.length - 1) openLesson(id, index + 1);
        else resume(id);
        break;
      }
      case 'certificate': certificate(id); break;
      case 'download': {
        const course = courses.find(item => item.id === id); if (!course || progress(course) !== 100) break;
        const text = `MYCOURSES · PERSONAL COMPLETION RECORD\n\n${state.profile.name}\nCompleted: ${course.title}\nLessons: ${course.topics.length} of ${course.topics.length}\nInstructor: ${course.instructor}\nRecord generated: ${new Date().toLocaleDateString()}\n\nThis is a personal record from the MyCourses demo.\nIt is not an accredited certification.\n`;
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = `mycourses-${id}-completion.txt`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Your completion record is ready to keep.');
        break;
      }
      case 'goal': goalDialog(); break;
      case 'help': helpDialog(); break;
      case 'notifications': notifications(); break;
      case 'close': dialog.close(); break;
    }
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'level-filter') { level = event.target.value; render(); $('#level-filter').focus(); }
    if (event.target.id === 'sort-filter') { sort = event.target.value; render(); $('#sort-filter').focus(); }
  });
  document.addEventListener('submit', event => {
    if (event.target.id === 'profile-form') {
      event.preventDefault();
      const form = event.target; const data = new FormData(form); const name = String(data.get('name')).trim();
      if (!name) { const input = form.elements.namedItem('name'); input.setCustomValidity('Please enter your name.'); input.reportValidity(); return; }
      state.profile = { name, email: String(data.get('email')).trim(), role: String(data.get('role')).trim(), bio: String(data.get('bio')).trim(), goal: Number(data.get('goal')) };
      persist(); render(); saveMessage('Your profile is up to date.'); $('#profile-form button[type="submit"]').focus();
    }
    if (event.target.id === 'goal-form') {
      event.preventDefault(); state.profile.goal = Number(new FormData(event.target).get('goal')); persist(); render(); dialog.close(); saveMessage('Your new weekly goal is set. You’ve got this.');
    }
  });
  document.addEventListener('input', event => { if (event.target.name === 'name') event.target.setCustomValidity(''); });
  $('#search-form').addEventListener('submit', event => {
    event.preventDefault(); query = $('#global-search').value.trim(); category = 'All courses'; level = 'All levels';
    if (route !== 'explore') location.hash = 'explore'; else { render(); main.focus(); }
  });
  $('#global-search').addEventListener('input', event => {
    query = event.target.value; category = 'All courses'; level = 'All levels';
    if (route !== 'explore') {
      route = 'explore'; history.pushState(null, '', '#explore'); window.scrollTo(0, 0);
    }
    render();
  });
  $('.menu-toggle').addEventListener('click', () => setNavigation(!document.body.classList.contains('nav-open')));
  $('.main-nav').addEventListener('click', event => {
    const link = event.target.closest('[data-route]');
    if (link && link.dataset.route === route) { setNavigation(false); main.focus({ preventScroll: true }); }
  });
  $('.sidebar-overlay').addEventListener('click', () => { setNavigation(false); $('.menu-toggle').focus(); });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !dialog.open) { event.preventDefault(); setNavigation(false); $('#global-search').focus(); $('#global-search').select(); }
    if (event.key === 'Escape' && document.body.classList.contains('nav-open')) { setNavigation(false); $('.menu-toggle').focus(); }
    if (event.key === 'Tab' && document.body.classList.contains('nav-open')) {
      const focusable = [...$('#sidebar').querySelectorAll('a,button')].filter(el => el.getClientRects().length);
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); }
  });
  dialog.addEventListener('close', () => { dialogCourse = null; if (dialogOpener?.isConnected) dialogOpener.focus(); else main.focus({ preventScroll: true }); });
  window.addEventListener('hashchange', navigate);
  window.addEventListener('storage', event => { if (event.key === storageKey || event.key === null) { state = loadState(); render(); if (dialog.open) dialog.close(); } });
  matchMedia('(max-width: 700px)').addEventListener('change', () => setNavigation(false));
  navigate();
})();
