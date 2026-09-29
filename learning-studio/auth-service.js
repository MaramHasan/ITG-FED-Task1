/* Local demo session only. Replace this adapter when a real auth service exists. */
(() => {
  'use strict';
  const key = 'mycourses.demo-session.v1';
  const accountsKey = 'mycourses.local-accounts.v1';
  const credentials = { email: 'alex.morgan@example.com', password: 'learn-together' };
  function accounts() {
    const saved = JSON.parse(localStorage.getItem(accountsKey) || '[]');
    if (!Array.isArray(saved)) throw new Error('The saved accounts could not be read.');
    return saved.filter(item => item && typeof item.id === 'string' && /^[a-f0-9-]{36}$/.test(item.id) && typeof item.name === 'string' && typeof item.email === 'string' && /^[a-f0-9]{32}$/.test(item.salt) && /^[a-f0-9]{64}$/.test(item.hash));
  }
  function session() {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } }
  }
  function currentAccount() {
    const id = session()?.account;
    if (id === 'studio-demo') return { id, name: 'Alex Morgan', email: credentials.email };
    if (!id) return null;
    try {
      const found = accounts().find(item => item.id === id);
      return found ? { id: found.id, name: found.name, email: found.email } : null;
    } catch { return null; }
  }
  function read() {
    return !!currentAccount();
  }
  function saveSession(account) {
    const record = JSON.stringify({ account });
    try { localStorage.setItem(key, record); }
    catch {
      try { sessionStorage.setItem(key, record); }
      catch { throw new Error('Browser storage is unavailable. Allow storage for this site, then try again.'); }
    }
  }
  const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  async function passwordHash(password, salt) {
    if (!window.crypto?.subtle) throw new Error('Account creation needs a secure browser context. Open this site using HTTPS or localhost.');
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: Uint8Array.from(salt.match(/../g), value => parseInt(value, 16)), iterations: 210000, hash: 'SHA-256' }, material, 256);
    return hex(new Uint8Array(bits));
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
    get account() { return currentAccount(); },
    storageKey(base) {
      const account = currentAccount();
      return account && account.id !== 'studio-demo' ? `${base}.${account.id}` : base;
    },
    destination,
    async signIn(email, password) {
      const normalized = email.trim().toLowerCase();
      if (normalized === credentials.email && password === credentials.password) { saveSession('studio-demo'); return; }
      let account;
      try { account = accounts().find(item => item.email === normalized); }
      catch { throw new Error('Your saved account could not be read. Allow browser storage, then try again.'); }
      if (!account || await passwordHash(password, account.salt) !== account.hash) {
        throw new Error('Those details don’t match an account in this browser. Check your email and password, or explore the demo.');
      }
      saveSession(account.id);
    },
    async register(name, email, password) {
      const fullName = name.trim();
      const normalized = email.trim().toLowerCase();
      if (!fullName || fullName.length > 60) throw new Error('Enter your name, up to 60 characters.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 100) throw new Error('Enter a valid email address, up to 100 characters.');
      if (password.length < 8 || password.length > 128) throw new Error('Use a password between 8 and 128 characters.');
      let existing;
      try { existing = accounts(); } catch { throw new Error('Browser storage is unavailable. Allow storage for this site, then try again.'); }
      const duplicate = list => normalized === credentials.email || list.some(item => item.email === normalized);
      if (duplicate(existing)) throw new Error('An account with this email already exists in this browser. Sign in instead.');
      if (!window.crypto?.subtle) throw new Error('Account creation needs HTTPS or localhost. You can still explore the demo.');
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const hash = await passwordHash(password, salt);
      const account = { id: crypto.randomUUID(), name: fullName, email: normalized, salt, hash };
      // Re-read after hashing so concurrent registrations do not overwrite earlier saves.
      try {
        existing = accounts();
        if (duplicate(existing)) throw new Error('An account with this email already exists in this browser. Sign in instead.');
        localStorage.setItem(accountsKey, JSON.stringify([...existing, account]));
      } catch (issue) {
        if (issue.message.includes('already exists')) throw issue;
        throw new Error('We couldn’t save your account. Allow browser storage and try again.');
      }
      saveSession(account.id);
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
