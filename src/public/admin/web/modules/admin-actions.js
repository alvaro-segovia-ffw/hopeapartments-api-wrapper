import { apiFetch, redirectToLogin } from './admin-api.js';
import { els } from './admin-elements.js';
import { renderApiKeys, renderSession, renderStats } from './admin-renderers.js';
import { getApiKeys, setSelectedApiKeyId } from './admin-state.js';
import { setActiveView } from './admin-view.js';
import { setStatus, writeJson } from './dom-utils.js';

function handleAuthError(err) {
  if (/session|authorized|role/i.test(err.message)) {
    redirectToLogin();
  }
}

export async function fetchCurrentSession() {
  const payload = await apiFetch('/admin/session');
  renderSession(payload.user || null);
  return payload.user || null;
}

export async function loadStats() {
  setStatus(els.statsStatus, 'loading...', null);
  try {
    const payload = await apiFetch('/api-keys/stats');
    renderStats(payload.stats || {});
    setStatus(els.statsStatus, 'loaded', true);
  } catch (err) {
    setStatus(els.statsStatus, 'error', false);
    writeJson(els.keyActionOutput, { error: err.message });
    handleAuthError(err);
  }
}

export async function loadApiKeys() {
  setStatus(els.keysStatus, 'loading...', null);
  try {
    const payload = await apiFetch('/api-keys');
    renderApiKeys(payload.apiKeys || []);
    setStatus(els.keysStatus, 'loaded', true);
  } catch (err) {
    setStatus(els.keysStatus, 'error', false);
    writeJson(els.keyActionOutput, { error: err.message });
    handleAuthError(err);
  }
}

export async function loadAuditLogs(filters = {}) {
  setStatus(els.auditStatus, 'loading...', null);
  try {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) {
        query.set(key, String(value).trim());
      }
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const payload = await apiFetch(`/audit-logs${suffix}`);
    writeJson(els.auditOutput, payload.logs || []);
    setStatus(els.auditStatus, 'loaded', true);
  } catch (err) {
    setStatus(els.auditStatus, 'error', false);
    writeJson(els.auditOutput, { error: err.message });
    handleAuthError(err);
  }
}

export async function loadDashboard() {
  await Promise.all([loadStats(), loadApiKeys(), loadAuditLogs({ limit: 20 })]);
}

export async function createApiKey(event) {
  event.preventDefault();
  setStatus(els.createStatus, 'creating...', null);

  const form = new FormData(els.createForm);
  const payload = {
    partnerId: form.get('partnerId'),
    name: form.get('name'),
    environment: form.get('environment'),
    role: form.get('role'),
    scopes: String(form.get('scopes') || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    notes: form.get('notes') || null,
  };

  try {
    const created = await apiFetch('/api-keys', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    writeJson(els.createOutput, created);
    setStatus(els.createStatus, 'created', true);
    setActiveView('keys');
    await Promise.all([loadApiKeys(), loadStats(), loadAuditLogs({ limit: 20 })]);
  } catch (err) {
    setStatus(els.createStatus, 'error', false);
    writeJson(els.createOutput, { error: err.message });
    handleAuthError(err);
  }
}

export async function handleKeyAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;
  if (!action || !id) return;

  const path =
    action === 'rotate'
      ? `/api-keys/${id}/rotate`
      : action === 'revoke'
        ? `/api-keys/${id}/revoke`
        : `/api-keys/${id}/reactivate`;

  try {
    const payload = await apiFetch(path, { method: 'POST' });
    writeJson(els.keyActionOutput, payload);
    await Promise.all([loadApiKeys(), loadStats(), loadAuditLogs({ limit: 20 })]);
  } catch (err) {
    writeJson(els.keyActionOutput, { error: err.message, action, id });
    handleAuthError(err);
  }
}

export function handleKeySelection(event) {
  const row = event.target.closest('tr[data-key-id]');
  if (!row) return;

  setSelectedApiKeyId(row.dataset.keyId);
  renderApiKeys(getApiKeys());
}

export function handleAuditSubmit(event) {
  event.preventDefault();
  setActiveView('audit');

  const form = new FormData(els.auditForm);
  loadAuditLogs({
    partnerId: form.get('partnerId'),
    action: form.get('action'),
    limit: form.get('limit'),
  });
}
