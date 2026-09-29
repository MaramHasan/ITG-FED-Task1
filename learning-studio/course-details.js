/* Course Details presentation. Data is supplied by the application controller. */
window.createCourseDetails = ({ icon, escape, courseArt, initials, getState }) => {
  const back = `<a class="details-back" href="#explore">${icon('arrow')} Back to courses</a>`;
  return ({ status, course, lessons = [] }) => {
    if (status !== 'ready') {
      const messages = {
        loading: ['A little curiosity goes a long way.', 'Getting your course and lessons ready…', 'book'],
        missing: ['Course not found', 'This course may have moved, or the link is incomplete. Find your next chapter in the course catalog.', 'search'],
        error: ['We couldn’t load this course', 'Something went wrong while loading the course or its lessons. Give it another try.', 'help']
      };
      const [title, description, symbol] = messages[status];
      return `${back}<section class="details-state panel" role="${status === 'error' ? 'alert' : 'status'}" aria-busy="${status === 'loading'}">${icon(symbol)}<h1>${title}</h1><p>${description}</p>${status === 'loading' ? '<div class="details-skeleton" aria-hidden="true"><i></i><i></i><i></i></div>' : status === 'error' ? '<button class="button button-primary" data-action="retry-course">Try again</button>' : '<a class="button button-primary" href="#explore">Explore courses</a>'}</section>`;
    }
    const state = getState();
    const id = escape(course.id);
    const enrollment = state.enrollments[course.id];
    const saved = state.favorites.includes(course.id);
    const count = lessons.filter(lesson => enrollment?.completed.includes(lesson.index)).length;
    const percent = lessons.length ? Math.round(count / lessons.length * 100) : 0;
    const next = lessons.find(lesson => !enrollment?.completed.includes(lesson.index));
    const complete = lessons.length > 0 && percent === 100;
    const action = enrollment ? 'resume' : 'enroll';
    return `<div class="course-details">
      <div class="details-topline">${back}<span>${icon('compass')} A little learning. A world of possibility.</span></div>
      <section class="details-hero">
        <div class="details-hero-copy"><div class="details-badges"><span>${escape(course.category)}</span><span>${icon('bars')}${escape(course.level)}</span>${course.label ? `<span class="details-label">${escape(course.label)}</span>` : ''}</div>
          <h1>${escape(course.title)}</h1><p>${escape(course.description)}</p>
          <div class="details-byline">${course.instructor ? `<span class="instructor-avatar">${escape(initials(course.instructor))}</span><span>Created by <strong>${escape(course.instructor)}</strong></span>` : ''}${course.rating ? `<span class="details-rating">${icon('star')}<strong>${escape(course.rating)}</strong><span>course rating</span></span>` : ''}</div>
        </div><div class="details-hero-art">${courseArt(course, false)}</div>
      </section>
      <div class="details-layout"><div class="details-main">
        <div class="details-facts"><div>${icon('clock')}<span><strong>${escape(course.hours)} hours</strong><small>Suggested learning time</small></span></div><div>${icon('book')}<span><strong>${lessons.length} ${lessons.length === 1 ? 'lesson' : 'lessons'}</strong><small>Read, explore, practice</small></span></div><div>${icon('target')}<span><strong>At your own pace</strong><small>Make room to grow</small></span></div></div>
        ${course.outcome ? `<section class="details-outcome"><span class="details-outcome-icon">${icon('sparkles')}</span><div><div class="eyebrow">FROM LEARNING TO DOING</div><h2>What you’ll build</h2><p>${escape(course.outcome)}</p></div></section>` : ''}
        <section class="panel details-curriculum" aria-labelledby="curriculum-title"><div class="details-section-heading"><div><div class="eyebrow">ONE STEP AT A TIME</div><h2 id="curriculum-title">Your course roadmap</h2><p>Small lessons. Practical skills. Real progress.</p></div><span class="details-count">${lessons.length} ${lessons.length === 1 ? 'lesson' : 'lessons'}</span></div>
        ${lessons.length ? `<ol class="details-lessons">${lessons.map(lesson => {
          const done = enrollment?.completed.includes(lesson.index);
          const current = enrollment && next?.id === lesson.id;
          return `<li class="${done ? 'is-complete' : current ? 'is-next' : ''}"><details><summary><span class="details-lesson-number">${done ? icon('check') : String(lesson.order).padStart(2, '0')}</span><span class="details-lesson-copy"><strong>${escape(lesson.title)}</strong><small>${escape(lesson.format)}${done ? ' · Completed' : current ? ' · Up next' : ''}</small></span><span class="details-expand">${icon('plus')}</span></summary><div class="details-lesson-preview"><p>${escape(lesson.summary)}</p><button class="text-button" data-action="${enrollment ? 'lesson' : 'enroll'}" data-id="${id}"${enrollment ? ` data-index="${lesson.index}"` : ''}>${done ? 'Review lesson' : enrollment ? 'Open lesson' : 'Start this course'} ${icon('arrow')}</button></div></details></li>`;
        }).join('')}</ol>` : '<div class="details-no-lessons"><h3>Your next chapter is on its way.</h3><p>No lessons are available for this course yet. Check back soon.</p></div>'}
        <div class="details-curriculum-foot">${icon('book')} Short readings, code examples, and a little practice of your own.</div></section>
        ${course.instructor ? `<section class="panel details-instructor"><span class="avatar">${escape(initials(course.instructor))}</span><div><div class="eyebrow">MEET YOUR INSTRUCTOR</div><h2>${escape(course.instructor)}</h2>${course.role ? `<p>${escape(course.role)}</p>` : ''}</div>${icon('sparkles')}</section>` : ''}
      </div><aside class="details-aside" aria-label="Your learning">
        <section class="panel details-enrollment"><div class="eyebrow">${enrollment ? 'YOUR NEXT SMALL STEP' : 'MAKE TIME FOR YOURSELF'}</div><h2>${complete ? 'Look how far you’ve come.' : enrollment ? 'Keep your curiosity going.' : 'Your next chapter starts here.'}</h2><p>${complete ? 'Every lesson, a step forward. Revisit what you’ve learned whenever you like.' : enrollment ? 'Pick up where you left off. Your progress is right here waiting.' : 'A new skill is closer than you think. Start small, learn by doing, and make it yours.'}</p>
        ${enrollment && lessons.length ? `<div class="details-progress-label"><strong>${percent}% complete</strong><span>${count} / ${lessons.length} lessons</span></div><div class="progress" role="progressbar" aria-label="Course progress" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${percent}%"></span></div>${next ? `<p class="details-next">UP NEXT<strong>${escape(next.title)}</strong></p>` : ''}` : '<div class="details-price">Free<span>A little investment in you.</span></div>'}
        <button class="button button-primary details-start" data-action="${action}" data-id="${id}"${lessons.length ? '' : ' disabled'}>${icon(complete ? 'book' : 'play')}${lessons.length ? complete ? 'Review course' : enrollment ? 'Continue learning' : 'Start learning' : 'Lessons coming soon'}${icon('arrow')}</button>
        <button class="button button-light details-save" data-action="favorite" data-id="${id}" aria-pressed="${saved}">${icon('heart')}${saved ? 'Saved to favorites' : 'Save for later'}</button>
        <ul class="details-includes"><li>${icon('check')}Self-paced, hands-on learning</li><li>${icon('check')}Readings & independent practice</li><li>${icon('check')}Progress saved as you go</li></ul><p class="details-enrollment-foot">A little progress, every single day.</p></section>
        <div class="details-note">${icon('sparkles')}<p>You don’t have to see the whole staircase.<br><strong>Just take the first step.</strong></p></div>
      </aside></div></div>`;
  };
};
