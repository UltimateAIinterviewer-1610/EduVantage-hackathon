import type { StudyQuestion } from './studyAI';
import { persistLearnerData } from './cloud';

export interface StudyAttempt { id: string; sourceId: string; topic: string; difficulty: StudyQuestion['difficulty']; correct: boolean; timestamp: number; prompt?: string; kind?: 'practice' | 'conversation' }
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
  const practice = attempts.filter(item => item.kind !== 'conversation');
  const total = practice.length;
  const correct = practice.filter(item => item.correct).length;
  const recent = practice.slice(0, 10);
  const recentAccuracy = recent.length ? Math.round((recent.filter(item => item.correct).length / recent.length) * 100) : 0;
  const topics = new Map<string, { correct: number; total: number }>();
  for (const attempt of practice) {
    const key = attempt.topic.trim() || 'General practice';
    const old = topics.get(key) || { correct: 0, total: 0 };
    topics.set(key, { correct: old.correct + Number(attempt.correct), total: old.total + 1 });
  }
  return { total, correct, recentAccuracy, topics: [...topics].map(([topic, value]) => ({ topic, ...value, accuracy: Math.round(value.correct / value.total * 100) })).sort((a, b) => a.accuracy - b.accuracy || b.total - a.total) };
}

// A small, transparent knowledge-tracing estimate. Older saved attempts remain valid.
// Values are estimates for choosing what to practise next, not exam grades.
export function topicMastery(attempts: StudyAttempt[]) {
  const states = new Map<string, { probability: number; observations: number; lastSeen: number }>();
  for (const attempt of [...attempts].sort((a, b) => a.timestamp - b.timestamp)) {
    const topic = attempt.topic.trim() || 'General practice';
    const previous = states.get(topic) || { probability: 0.2, observations: 0, lastSeen: 0 };
    const slip = attempt.kind === 'conversation' ? 0.25 : 0.1;
    const guess = attempt.kind === 'conversation' ? 0.35 : 0.25;
    const p = previous.probability;
    const observed = attempt.correct
      ? p * (1 - slip) / (p * (1 - slip) + (1 - p) * guess)
      : p * slip / (p * slip + (1 - p) * (1 - guess));
    const probability = Math.min(0.98, observed + (1 - observed) * 0.08);
    states.set(topic, { probability, observations: previous.observations + 1, lastSeen: attempt.timestamp });
  }
  return [...states].map(([topic, state]) => ({ topic, estimate: Math.round(state.probability * 100), observations: state.observations, lastSeen: state.lastSeen }))
    .sort((a, b) => a.estimate - b.estimate || a.lastSeen - b.lastSeen);
}
