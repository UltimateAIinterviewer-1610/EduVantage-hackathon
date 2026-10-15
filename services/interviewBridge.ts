import type { SessionRecord } from '../types';

export const OFFICIAL_INTERVIEWER_URL = 'https://www.ultimateaiinterviewer.in';

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
