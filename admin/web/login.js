'use strict';

const storageKey = 'hope-admin-token';
const dashboardPath = '/admin/dashboard';

const els = {
  baseUrl: document.getElementById('baseUrl'),
  loginForm: document.getElementById('loginForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  loginStatus: document.getElementById('loginStatus'),
  sessionSummary: document.getElementById('sessionSummary'),
  accessToken: document.getElementById('accessToken'),
  btnUseToken: document.getElementById('btnUseToken'),
  btnClear: document.getElementById('btnClear'),
};

function setStatus(el, label, ok) {
  el.textContent = label;
  el.classList.remove('ok', 'err');
  if (ok === true) el.classList.add('ok');
  if (ok === false) el.classList.add('err');
}

function normalizedBaseUrl() {
  return (els.baseUrl.value || '').trim().replace(/\/+$/, '') || window.location.origin;
}

function setSessionSummary(text) {
  els.sessionSummary.textContent = text;
}

function storeToken(token) {
  localStorage.setItem(storageKey, String(token || '').trim());
}

function clearToken() {
  localStorage.removeItem(storageKey);
}

async function parseJsonResponse(res) {
  return res.json().catch(() => ({}));
}

async function fetchCurrentUser(token) {
  const res = await fetch(`${normalizedBaseUrl()}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(payload?.message || `HTTP ${res.status}`);
  }
  return payload.user || null;
}

function redirectToDashboard() {
  window.location.href = dashboardPath;
}

async function login(event) {
  event.preventDefault();
  setStatus(els.loginStatus, 'signing in...', null);

  const email = String(els.loginEmail.value || '').trim();
  const password = String(els.loginPassword.value || '');
  if (!email || !password) {
    setStatus(els.loginStatus, 'error', false);
    setSessionSummary('Email and password are required.');
    return;
  }

  try {
    const res = await fetch(`${normalizedBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const payload = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(payload?.message || `HTTP ${res.status}`);
    }

    storeToken(payload.accessToken || '');
    setStatus(els.loginStatus, 'signed in', true);
    setSessionSummary(`${payload.user?.email || email} (${(payload.user?.roles || []).join(', ') || 'no roles'})`);
    els.loginPassword.value = '';
    redirectToDashboard();
  } catch (err) {
    setStatus(els.loginStatus, 'error', false);
    setSessionSummary(err.message);
  }
}

async function useExistingToken() {
  const token = String(els.accessToken.value || '').trim();
  if (!token) {
    setStatus(els.loginStatus, 'error', false);
    setSessionSummary('Bearer token is required.');
    return;
  }

  setStatus(els.loginStatus, 'validating token...', null);
  try {
    const user = await fetchCurrentUser(token);
    storeToken(token);
    setStatus(els.loginStatus, 'token accepted', true);
    setSessionSummary(`${user?.email || 'User'} (${(user?.roles || []).join(', ') || 'no roles'})`);
    redirectToDashboard();
  } catch (err) {
    setStatus(els.loginStatus, 'error', false);
    setSessionSummary(err.message);
  }
}

async function bootstrap() {
  const token = localStorage.getItem(storageKey);
  if (!token) return;

  setStatus(els.loginStatus, 'checking session...', null);
  try {
    const user = await fetchCurrentUser(token);
    setStatus(els.loginStatus, 'session ready', true);
    setSessionSummary(`${user?.email || 'User'} (${(user?.roles || []).join(', ') || 'no roles'})`);
    redirectToDashboard();
  } catch (_err) {
    clearToken();
    setStatus(els.loginStatus, 'idle', null);
    setSessionSummary('No active session.');
  }
}

els.loginForm.addEventListener('submit', login);
els.btnUseToken.addEventListener('click', useExistingToken);
els.btnClear.addEventListener('click', () => {
  clearToken();
  els.accessToken.value = '';
  els.loginPassword.value = '';
  setStatus(els.loginStatus, 'idle', null);
  setSessionSummary('No active session.');
});

bootstrap();
