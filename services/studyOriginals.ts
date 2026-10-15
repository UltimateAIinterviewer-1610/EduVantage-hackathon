import { currentCloudSession } from './cloud';

const BUCKET = 'edu-study-originals';
const base = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const localKey = (profileId: string, sourceId: string) => `${profileId}:${sourceId}`;
const pendingKey = (profileId: string) => `edu_study_original_deletes_${profileId}`;
const pendingPaths = (profileId: string): string[] => {
  try { const value = JSON.parse(localStorage.getItem(pendingKey(profileId)) || '[]'); return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
  catch { return []; }
};
const savePending = (profileId: string, paths: string[]) => localStorage.setItem(pendingKey(profileId), JSON.stringify([...new Set(paths)]));

function database(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('edu-study-originals', 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('files')) request.result.createObjectStore('files'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function localTransaction<T>(profileId: string, sourceId: string, mode: IDBTransactionMode, action: (store: IDBObjectStore, key: string) => IDBRequest<T>): Promise<T | null> {
  const db = await database();
  if (!db) return null;
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction('files', mode);
      const request = action(transaction.objectStore('files'), localKey(profileId, sourceId));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

export async function cacheStudyOriginal(profileId: string, sourceId: string, file: File): Promise<boolean> {
  return (await localTransaction(profileId, sourceId, 'readwrite', (store, key) => store.put(file, key))) !== null;
}
export async function localStudyOriginal(profileId: string, sourceId: string): Promise<Blob | null> {
  return await localTransaction(profileId, sourceId, 'readonly', (store, key) => store.get(key)) || null;
}
export async function removeLocalStudyOriginal(profileId: string, sourceId: string): Promise<void> {
  await localTransaction(profileId, sourceId, 'readwrite', (store, key) => store.delete(key));
}
export async function clearLocalStudyOriginals(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('edu-study-originals');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

const objectUrl = (path: string, authenticated = false) => `${base}/storage/v1/object/${authenticated ? 'authenticated/' : ''}${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
const headers = (token: string) => ({ apikey: anon, Authorization: `Bearer ${token}` });
export async function uploadStudyOriginal(sourceId: string, file: File): Promise<string | null> {
  const session = await currentCloudSession();
  if (!session || !base || !anon) return null;
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const path = `${session.user.id}/${sourceId}.${extension}`;
  const response = await fetch(objectUrl(path), { method: 'POST', headers: { ...headers(session.access_token), 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }, body: file });
  if (!response.ok) throw new Error('The original file could not be synced. Its extracted excerpts remain saved.');
  return path;
}
export async function getStudyOriginal(profileId: string, sourceId: string, originalPath?: string): Promise<Blob | null> {
  const local = await localStudyOriginal(profileId, sourceId).catch(() => null);
  if (local) return local;
  if (!originalPath) return null;
  const session = await currentCloudSession();
  if (!session || !originalPath.startsWith(`${session.user.id}/`)) return null;
  const response = await fetch(objectUrl(originalPath, true), { headers: headers(session.access_token) });
  return response.ok ? await response.blob() : null;
}
export async function removeStudyOriginal(profileId: string, sourceId: string, originalPath?: string): Promise<boolean> {
  let removedFromCloud = true;
  if (originalPath) {
    const session = await currentCloudSession().catch(() => null);
    if (!session || !originalPath.startsWith(`${session.user.id}/`)) removedFromCloud = false;
    else {
      try {
        const response = await fetch(objectUrl(originalPath), { method: 'DELETE', headers: headers(session.access_token) });
        removedFromCloud = response.ok || response.status === 404;
      } catch { removedFromCloud = false; }
    }
    if (!removedFromCloud) savePending(profileId, [...pendingPaths(profileId), originalPath]);
  }
  await removeLocalStudyOriginal(profileId, sourceId);
  return removedFromCloud;
}
export async function retryPendingStudyOriginalRemovals(profileId: string): Promise<void> {
  const paths = pendingPaths(profileId);
  if (!paths.length) return;
  const session = await currentCloudSession().catch(() => null);
  if (!session) return;
  const remaining: string[] = [];
  for (const path of paths) {
    if (!path.startsWith(`${session.user.id}/`)) { remaining.push(path); continue; }
    try {
      const response = await fetch(objectUrl(path), { method: 'DELETE', headers: headers(session.access_token) });
      if (!response.ok && response.status !== 404) remaining.push(path);
    } catch { remaining.push(path); }
  }
  savePending(profileId, remaining);
}

export function studyOriginalFragment(label: string): string {
  const page = /^Page (\d+)/i.exec(label);
  if (page) return `#page=${Number(page[1])}`;
  const time = /^(?:AI-estimated timestamp|Timestamp)\s+(?:(\d+):)?(\d{2}):(\d{2})(?:[.,](\d{3}))?/i.exec(label);
  if (!time) return '';
  const seconds = Number(time[1] || 0) * 3600 + Number(time[2]) * 60 + Number(time[3]) + Number(time[4] || 0) / 1000;
  return `#t=${seconds}`;
}
