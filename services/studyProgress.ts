import type { StudyQuestion } from './studyAI';
import { persistLearnerData } from './cloud';

export interface StudyAttempt { id: string; sourceId: string; topic: string; difficulty: StudyQuestion['difficulty']; correct: boolean; timestamp: number; prompt?: string }
const key = (profileId: string) => `edu_study_progress_${profileId}`;
export function readStudyProgress(profileId: string): StudyAttempt[] {
  try {
    const value = JSON.parse(localStorage.getItem(key(profileId)) || '[]');
    return Array.isArray(value) ? value.filter((item): item is StudyAttempt => Boolean(item && typeof item.id === 'string' && typeof item.topic === 'string' && typeof item.correct === 'boolean' && Number.isFinite(item.timestamp))) : [];
  } catch { return []; }
}
export function saveStudyAttempt(profileId: string, attempt: StudyAttempt): StudyAttempt[] {
  const next = [attempt, ...readStudyProgress(profileId)].slice(0, 500);
  persistLearnerData(key(profileId), JSON.stringify(next));
  return next;
}
export function studySummary(attempts: StudyAttempt[]) {
  const total = attempts.length;
  const correct = attempts.filter(item => item.correct).length;
  const recent = attempts.slice(0, 10);
  const recentAccuracy = recent.length ? Math.round((recent.filter(item => item.correct).length / recent.length) * 100) : 0;
  const topics = new Map<string, { correct: number; total: number }>();
  for (const attempt of attempts) {
    const key = attempt.topic.trim() || 'General practice';
    const old = topics.get(key) || { correct: 0, total: 0 };
    topics.set(key, { correct: old.correct + Number(attempt.correct), total: old.total + 1 });
  }
  return { total, correct, recentAccuracy, topics: [...topics].map(([topic, value]) => ({ topic, ...value, accuracy: Math.round(value.correct / value.total * 100) })).sort((a, b) => a.accuracy - b.accuracy || b.total - a.total) };
}
