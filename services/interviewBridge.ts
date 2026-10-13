import type { SessionRecord } from '../types';

const storageKey = 'edu_interviewer_url';

export function validInterviewerUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) return null;
    return url.origin;
  } catch { return null; }
}

export function readInterviewerUrl(): string {
  try { return localStorage.getItem(storageKey) || import.meta.env.VITE_INTERVIEWER_URL || 'https://www.ultimateaiinterviewer.in/'; }
  catch { return import.meta.env.VITE_INTERVIEWER_URL || 'https://www.ultimateaiinterviewer.in/'; }
}

export function saveInterviewerUrl(value: string): boolean {
  const url = validInterviewerUrl(value);
  if (!url) return false;
  try { localStorage.setItem(storageKey, url); return true; } catch { return false; }
}

export function practiceBrief(record: SessionRecord | null, focus: string): string {
  const customFocus = focus.trim().slice(0, 160);
  const topic = customFocus || record?.lessonPlan?.topic || record?.courseTitle || '';
  if (!topic) return '';
  const subject = customFocus ? '' : record?.lessonPlan?.subject || record?.courseTitle || '';
  const chapter = customFocus ? '' : record?.lessonPlan?.chapter || '';
  return [
    `Practice focus: ${topic}`,
    subject && subject !== topic ? `Subject: ${subject}` : '',
    chapter && chapter !== topic ? `Chapter: ${chapter}` : '',
    'I have studied this topic in EduVantage. Please ask me questions that test understanding, explanation, and real-world application. Give constructive feedback and one next practice step.',
  ].filter(Boolean).join('\n');
}
