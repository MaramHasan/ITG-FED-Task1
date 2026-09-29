(() => {
  'use strict';
  const auth = window.STUDIO_AUTH;
  const next = auth.destination(new URLSearchParams(location.search).get('next'));
  const themeButton = document.querySelector('[data-auth-theme]');
  function syncTheme() {
    const dark = window.STUDIO_APPEARANCE.theme === 'dark';
    themeButton.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
    themeButton.textContent = dark ? '☀' : '☾';
  }
  themeButton.addEventListener('click', () => { window.STUDIO_APPEARANCE.set(window.STUDIO_APPEARANCE.theme === 'dark' ? 'light' : 'dark'); });
  document.addEventListener('studio:appearance', syncTheme);
  syncTheme();
  const error = document.querySelector('#auth-error');
  function showError(message) {
    error.textContent = message;
    error.hidden = false;
    error.focus();
  }
  if (document.body.dataset.authPage === 'sign-out') {
    function signOut() {
      try {
        auth.signOut();
        document.querySelector('#signout-title').textContent = 'A pause, not a goodbye.';
        document.querySelector('#signout-message').textContent = 'You’re signed out. Come back whenever you’re ready for your next small step.';
        document.querySelector('#signout-success').hidden = false;
        document.querySelector('#signout-retry').hidden = true;
        error.hidden = true;
      } catch (issue) { showError(issue.message); document.querySelector('#signout-retry').hidden = false; }
    }
    document.querySelector('#signout-retry').addEventListener('click', signOut);
    window.addEventListener('pageshow', signOut);
    signOut();
    return;
  }
  const form = document.querySelector('#signin-form');
  const email = document.querySelector('#email');
  const password = document.querySelector('#password');
  const submit = document.querySelector('#signin-submit');
  const demo = document.querySelector('#demo-signin');
  const reveal = document.querySelector('#reveal-password');
  reveal.addEventListener('click', () => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    reveal.textContent = show ? 'Hide' : 'Show';
    reveal.setAttribute('aria-label', `${show ? 'Hide' : 'Show'} password`);
    reveal.setAttribute('aria-pressed', String(show));
  });
  function validate(field) {
    const message = document.querySelector(`#${field.id}-error`);
    const valid = field.validity.valid;
    field.setAttribute('aria-invalid', String(!valid));
    message.textContent = valid ? '' : field.validity.valueMissing ? `Enter your ${field.id === 'email' ? 'email address' : 'password'}.` : 'Enter a valid email address.';
    return valid;
  }
  [email, password].forEach(field => field.addEventListener('input', () => {
    if (field.getAttribute('aria-invalid') === 'true') validate(field);
    error.hidden = true;
  }));
  let pending = false;
  async function signIn(useDemo = false) {
    if (pending) return;
    error.hidden = true;
    if (!useDemo) {
      const valid = [email, password].map(validate);
      if (valid.includes(false)) { [email, password][valid.indexOf(false)].focus(); return; }
    }
    pending = true;
    submit.disabled = demo.disabled = true;
    form.setAttribute('aria-busy', 'true');
    submit.textContent = 'Opening your workspace…';
    try {
      await auth.signIn(useDemo ? auth.credentials.email : email.value, useDemo ? auth.credentials.password : password.value);
      password.value = '';
      location.replace(next);
    } catch (issue) {
      showError(issue.message);
      pending = false;
      submit.disabled = demo.disabled = false;
      form.setAttribute('aria-busy', 'false');
      submit.textContent = 'Sign in';
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); signIn(); });
  demo.addEventListener('click', () => signIn(true));
  // Clear any password restored by the browser when returning from another page.
  window.addEventListener('pageshow', () => { password.value = ''; });
})();
