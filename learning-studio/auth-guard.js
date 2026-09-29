/* A navigation guard for the demo UI, not an authentication security boundary. */
(() => {
  function check() {
    if (window.STUDIO_AUTH.isSignedIn()) return;
    document.documentElement.hidden = true;
    const page = location.pathname.endsWith('/course-details.html') ? 'course-details.html' : 'index.html';
    const next = window.STUDIO_AUTH.destination(page + location.search + location.hash);
    location.replace(`sign-in.html?next=${encodeURIComponent(next)}`);
  }
  check();
  window.addEventListener('pageshow', check);
  document.addEventListener('studio:session', check);
})();
