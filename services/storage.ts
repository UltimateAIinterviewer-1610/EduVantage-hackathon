import { SessionRecord } from '../types';
export function readHistory(): SessionRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem('edu_history') || '[]');
    return Array.isArray(value) ? value.filter(r => r && typeof r.id === 'string' && typeof r.courseTitle === 'string' && Number.isFinite(r.timestamp) && Number.isFinite(r.duration)) : [];
  } catch { return []; }
}
export function readNotes(id: string): string {
  try { return localStorage.getItem(`edu_notes_${id}`) || ''; } catch { return ''; }
}
