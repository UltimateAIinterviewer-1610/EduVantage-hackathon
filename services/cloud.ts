type Session = { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email?: string } };
type StoredRow = { key: string; value: string };

const url = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const sessionKey = 'edu_cloud_session';
const ownedKey = (key: string) => key === 'edu_student_profile' || key === 'edu_history' || key.startsWith('edu_notes_') || key.startsWith('edu_study_progress_') || key.startsWith('edu_study_sources_') || key.startsWith('edu_study_session_') || key.startsWith('edu_study_assessments_') || key.startsWith('edu_study_assessment_session_') || key.startsWith('edu_presentation_attempts_');
let session: Session | null = null;
let syncError = '';
const pending = new Map<string, string>();
let activeFlush: Promise<void> | null = null;
const pendingKey = (userId: string) => `edu_cloud_pending_${userId}`;
function savePending(userId: string) {
  try { if (pending.size) localStorage.setItem(pendingKey(userId), JSON.stringify([...pending])); else localStorage.removeItem(pendingKey(userId)); } catch {}
}
function loadPending(userId: string) {
  pending.clear();
  try {
    const rows = JSON.parse(localStorage.getItem(pendingKey(userId)) || '[]');
    if (Array.isArray(rows)) for (const row of rows) if (Array.isArray(row) && typeof row[0] === 'string' && ownedKey(row[0]) && typeof row[1] === 'string') pending.set(row[0], row[1]);
  } catch {}
}
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());

export const cloudConfigured = Boolean(url && anonKey);
export const cloudRequired = import.meta.env.PROD && !cloudConfigured && (typeof location === 'undefined' || location.protocol !== 'file:');
export const cloudSyncError = () => syncError;
export const onCloudStatus = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const cloudUserId = () => session?.user.id || null;
export const hasDeviceProgress = () => {
  try { return Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).some(key => key && ownedKey(key) && key !== 'edu_student_profile'); }
  catch { return false; }
};

function saveSession(next: Session | null) {
  session = next;
  if (next) loadPending(next.user.id);
  else pending.clear();
  try { if (next) sessionStorage.setItem(sessionKey, JSON.stringify(next)); else sessionStorage.removeItem(sessionKey); } catch {}
  notify();
}
function headers(token?: string): HeadersInit { return { apikey: anonKey, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }; }
async function request(path: string, init: RequestInit = {}, token?: string) {
  const response = await fetch(`${url}${path}`, { ...init, headers: { ...headers(token), ...init.headers } });
  if (!response.ok) {
    let message = `Account service returned HTTP ${response.status}.`;
    try { const body = await response.json(); message = body.msg || body.error_description || body.message || message; } catch {}
    throw new Error(message);
  }
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}
function asSession(value: any): Session | null {
  if (!value?.access_token || !value?.refresh_token || !value?.user?.id) return null;
  return { access_token: value.access_token, refresh_token: value.refresh_token, expires_at: value.expires_at || Math.floor(Date.now() / 1000) + Number(value.expires_in || 3600), user: { id: value.user.id, email: value.user.email } };
}
export async function currentCloudSession(): Promise<Session | null> {
  if (!cloudConfigured) return null;
  if (!session) { try { session = asSession(JSON.parse(sessionStorage.getItem(sessionKey) || 'null')); } catch {} }
  if (!session) return null;
  if (session.expires_at > Date.now() / 1000 + 60) return session;
  try {
    const value = await request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) });
    saveSession(asSession(value));
  } catch { saveSession(null); }
  return session;
}
export async function cloudSignUp(email: string, password: string): Promise<boolean> {
  const value = await request('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
  const next = asSession(value);
  if (next) saveSession(next);
  return Boolean(next);
}
export async function cloudSignIn(email: string, password: string): Promise<void> {
  const value = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
  const next = asSession(value);
  if (!next) throw new Error('Sign-in did not return a valid session.');
  saveSession(next);
}
export function googleAuthorizationUrl(redirect: string): string {
  if (!cloudConfigured) throw new Error('Online accounts are not configured.');
  const authorize = new URL(`${url}/auth/v1/authorize`);
  authorize.searchParams.set('provider', 'google');
  authorize.searchParams.set('redirect_to', redirect);
  return authorize.toString();
}
export function cloudSignInWithGoogle(): void {
  location.assign(googleAuthorizationUrl(`${location.origin}${location.pathname}${location.search}`));
}
export async function cloudRecover(email: string): Promise<void> {
  await request(`/auth/v1/recover?redirect_to=${encodeURIComponent(location.origin)}`, { method: 'POST', body: JSON.stringify({ email }) });
}
export async function cloudCompleteRedirect(): Promise<boolean> {
  if (!location.hash.includes('access_token=') && !location.hash.includes('error=')) return false;
  const values = new URLSearchParams(location.hash.slice(1));
  const oauthError = values.get('error_description') || values.get('error');
  if (oauthError) {
    history.replaceState(null, '', location.pathname + location.search);
    throw new Error(`Google sign-in could not finish: ${oauthError}`);
  }
  const token = values.get('access_token');
  const refresh = values.get('refresh_token');
  const expires = Number(values.get('expires_in') || 3600);
  history.replaceState(null, '', location.pathname + location.search);
  if (!token || !refresh) return false;
  const user = await request('/auth/v1/user', {}, token);
  saveSession(asSession({ access_token: token, refresh_token: refresh, expires_in: expires, user }));
  return values.get('type') === 'recovery';
}
export async function cloudUpdatePassword(password: string): Promise<void> {
  const active = await currentCloudSession();
  if (!active) throw new Error('Password reset link expired. Request another one.');
  await request('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password }) }, active.access_token);
}
export async function cloudSignOut(): Promise<void> {
  await flushCloudWrites();
  const active = await currentCloudSession();
  if (active) try { await request('/auth/v1/logout', { method: 'POST' }, active.access_token); } catch {}
  saveSession(null);
  clearLearnerCache();
  await import('./studyOriginals').then(module => module.clearLocalStudyOriginals()).catch(() => {});
  for (const storage of [sessionStorage, localStorage]) for (let index = storage.length - 1; index >= 0; index--) {
    const key = storage.key(index);
    if (key?.startsWith('edu_ai_connection_') || key?.startsWith('edu_gemini_key_')) storage.removeItem(key);
  }
}
export function exportLearnerData(): void {
  const data: Record<string, unknown> = {};
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key || !ownedKey(key)) continue;
    const raw = localStorage.getItem(key);
    try { data[key] = JSON.parse(raw || 'null'); } catch { data[key] = raw; }
  }
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = href; link.download = 'eduvantage-learning-data.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
export async function cloudDeleteAccount(password: string): Promise<void> {
  const active = await currentCloudSession();
  if (!active) throw new Error('Sign in again before deleting your account.');
  const response = await fetch('/api/delete-account', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${active.access_token}` }, body: JSON.stringify({ confirmation: 'DELETE', password }) });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'Could not delete your account. Try again.');
  }
  pending.clear(); localStorage.removeItem(pendingKey(active.user.id)); saveSession(null); clearLearnerCache();
  await import('./studyOriginals').then(module => module.clearLocalStudyOriginals()).catch(() => {});
  for (const storage of [sessionStorage, localStorage]) for (let index = storage.length - 1; index >= 0; index--) {
    const key = storage.key(index);
    if (key?.startsWith('edu_ai_connection_') || key?.startsWith('edu_gemini_key_')) storage.removeItem(key);
  }
}
export function clearLearnerCache(): void {
  for (let index = localStorage.length - 1; index >= 0; index--) {
    const key = localStorage.key(index);
    if (key && ownedKey(key)) localStorage.removeItem(key);
  }
}
export async function hydrateLearnerData(importDevice = false): Promise<void> {
  const active = await currentCloudSession();
  if (!active) throw new Error('Please sign in again.');
  loadPending(active.user.id);
  const rows: StoredRow[] = await request(`/rest/v1/learner_state?select=key,value&user_id=eq.${encodeURIComponent(active.user.id)}`, {}, active.access_token);
  const deviceRows: StoredRow[] = [];
  if (importDevice && rows.length === 0) for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key && ownedKey(key)) deviceRows.push({ key, value: localStorage.getItem(key) || '' });
  }
  clearLearnerCache();
  for (let index = localStorage.length - 1; index >= 0; index--) {
    const key = localStorage.key(index);
    if (key?.startsWith('edu_ai_connection_') || key?.startsWith('edu_gemini_key_')) localStorage.removeItem(key);
  }
  for (const row of rows) if (ownedKey(row.key) && typeof row.value === 'string') localStorage.setItem(row.key, row.value);
  for (const row of deviceRows) persistLearnerData(row.key, row.value);
  for (const [key, value] of pending) localStorage.setItem(key, value);
  if (pending.size) void flushCloudWrites().catch(() => {});
  if (!pending.size) syncError = '';
  notify();
}
export function persistLearnerData(key: string, value: string): void {
  localStorage.setItem(key, value);
  if (!cloudConfigured || !ownedKey(key)) return;
  pending.set(key, value);
  if (session) savePending(session.user.id);
  void flushCloudWrites().catch(() => {});
}
export async function flushCloudWrites(): Promise<void> {
  if (activeFlush) return activeFlush;
  if (!pending.size) return;
  activeFlush = (async () => {
    const active = await currentCloudSession();
    if (!active) throw new Error('Please sign in to sync your work.');
    while (pending.size) {
      const [key, value] = pending.entries().next().value as [string, string];
      try {
        await request('/rest/v1/learner_state?on_conflict=user_id,key', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: active.user.id, key, value }) }, active.access_token);
        if (pending.get(key) === value) pending.delete(key);
        savePending(active.user.id);
        syncError = '';
      } catch (error) {
        syncError = `Cloud save failed. Your latest work remains on this device. ${error instanceof Error ? error.message : ''}`;
        notify();
        throw error;
      }
    }
    notify();
  })();
  try { await activeFlush; } finally { activeFlush = null; }
  if (pending.size && !syncError) await flushCloudWrites();
}
if (typeof window !== 'undefined') window.addEventListener('online', () => { void flushCloudWrites().catch(() => {}); });
