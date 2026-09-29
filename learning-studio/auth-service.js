/* Local demo session only. Replace this adapter when a real auth service exists. */
(() => {
  'use strict';
  const key = 'mycourses.demo-session.v1';
  const credentials = { email: 'alex.morgan@example.com', password: 'learn-together' };
  function read() {
    try { return JSON.parse(localStorage.getItem(key))?.account === 'studio-demo'; }
    catch {
      try { return JSON.parse(sessionStorage.getItem(key))?.account === 'studio-demo'; }
      catch { return false; }
    }
  }
  function destination(value) {
    // Return only to known pages in this directory, never to an external URL.
    if (typeof value !== 'string' || !/^(index|course-details)\.html(?:[?#]|$)/.test(value)) return 'index.html';
    const url = new URL(value, location.href);
    const base = new URL('.', location.href);
    if (url.protocol !== base.protocol || url.host !== base.host || !['index.html', 'course-details.html'].some(name => url.pathname === base.pathname + name)) return 'index.html';
    return value;
  }
  window.STUDIO_AUTH = {
    credentials,
    isSignedIn: read,
    destination,
    async signIn(email, password) {
      if (email.trim().toLowerCase() !== credentials.email || password !== credentials.password) {
        throw new Error('Those details don’t match the demo account. Try the demo details below, or choose Explore the demo.');
      }
      const record = JSON.stringify({ account: 'studio-demo' });
      try { localStorage.setItem(key, record); }
      catch {
        try { sessionStorage.setItem(key, record); }
        catch { throw new Error('Browser storage is unavailable. Allow storage for this site, then try again.'); }
      }
    },
    signOut() {
      try { localStorage.removeItem(key); } catch { /* Session storage may be in use. */ }
      try { sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
      if (read()) throw new Error('We couldn’t end this demo session. Please try again.');
    }
  };
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) document.dispatchEvent(new Event('studio:session'));
  });
})();
