(() => {
  'use strict';
  const auth = window.STUDIO_AUTH;
  const next = auth.destination(new URLSearchParams(location.search).get('next'));
  document.querySelectorAll('[data-auth-link]').forEach(link => {
    if (new URLSearchParams(location.search).has('next')) link.href += `?next=${encodeURIComponent(next)}`;
  });
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
  const registration = document.body.dataset.authPage === 'sign-up';
  const form = document.querySelector(registration ? '#signup-form' : '#signin-form');
  const fullName = document.querySelector('#full-name');
  const confirmation = document.querySelector('#confirm-password');
  const email = document.querySelector('#email');
  const password = document.querySelector('#password');
  const submit = document.querySelector(registration ? '#signup-submit' : '#signin-submit');
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
    if (field === fullName) field.setCustomValidity(field.value.trim() ? '' : 'Enter your full name.');
    if (field === password && registration) field.setCustomValidity(field.value.length >= 8 ? '' : 'Use at least 8 characters.');
    if (field === confirmation) field.setCustomValidity(field.value === password.value ? '' : 'Your passwords don’t match.');
    const valid = field.validity.valid;
    field.setAttribute('aria-invalid', String(!valid));
    message.textContent = valid ? '' : field.validity.customError ? field.validationMessage : field.validity.valueMissing ? `Enter your ${field === email ? 'email address' : field === confirmation ? 'password again' : 'password'}.` : 'Enter a valid email address.';
    return valid;
  }
  const fields = registration ? [fullName, email, password, confirmation] : [email, password];
  fields.forEach(field => field.addEventListener('input', () => {
    if (field.getAttribute('aria-invalid') === 'true') validate(field);
    if (field === password && confirmation?.value) validate(confirmation);
    error.hidden = true;
  }));
  let pending = false;
  async function signIn(useDemo = false) {
    if (pending) return;
    error.hidden = true;
    if (!useDemo) {
      const valid = fields.map(validate);
      if (valid.includes(false)) { fields[valid.indexOf(false)].focus(); return; }
    }
    pending = true;
    submit.disabled = demo.disabled = true;
    form.setAttribute('aria-busy', 'true');
    submit.textContent = registration && !useDemo ? 'Creating your account…' : 'Opening your workspace…';
    try {
      if (registration && !useDemo) await auth.register(fullName.value, email.value, password.value);
      else await auth.signIn(useDemo ? auth.credentials.email : email.value, useDemo ? auth.credentials.password : password.value);
      password.value = '';
      if (confirmation) confirmation.value = '';
      location.replace(next);
    } catch (issue) {
      showError(issue.message);
      pending = false;
      submit.disabled = demo.disabled = false;
      form.setAttribute('aria-busy', 'false');
      submit.textContent = registration ? 'Create account' : 'Sign in';
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); signIn(); });
  demo.addEventListener('click', () => signIn(true));
  // Clear any password restored by the browser when returning from another page.
  window.addEventListener('pageshow', () => { password.value = ''; if (confirmation) confirmation.value = ''; });
})();
