/* Apply before styles load, so a saved dark theme never flashes light. */
(() => {
  'use strict';
  const key = 'mycourses.appearance.v1';
  const system = matchMedia('(prefers-color-scheme: dark)');
  const valid = value => ['light', 'dark', 'system'].includes(value) ? value : 'system';
  function read() {
    try { return valid(localStorage.getItem(key)); }
    catch { return 'system'; }
  }
  let preference = read();
  function apply() {
    const theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#14191f' : '#f6f6f2';
    document.dispatchEvent(new Event('studio:appearance'));
  }
  window.STUDIO_APPEARANCE = {
    get preference() { return preference; },
    get theme() { return document.documentElement.dataset.theme; },
    set(value) {
      preference = valid(value);
      let saved = true;
      try { localStorage.setItem(key, preference); }
      catch { saved = false; }
      apply();
      return saved;
    }
  };
  system.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { preference = read(); apply(); }
  });
  apply();
})();
