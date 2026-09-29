/* A navigation guard for the demo UI, not an authentication security boundary. */
(() => {
  const initialAccount = window.STUDIO_AUTH.account?.id;
  function check() {
    if (window.STUDIO_AUTH.isSignedIn()) {
      if (initialAccount && window.STUDIO_AUTH.account.id !== initialAccount) { location.reload(); return; }
      document.documentElement.hidden = false;
      return;
    }
    document.documentElement.hidden = true;
    const page = location.pathname.endsWith('/course-details.html') ? 'course-details.html' : 'index.html';
    const next = window.STUDIO_AUTH.destination(page + location.search + location.hash);
    location.replace(`sign-in.html?next=${encodeURIComponent(next)}`);
  }
  check();
  window.addEventListener('pageshow', check);
  document.addEventListener('studio:session', check);
})();
