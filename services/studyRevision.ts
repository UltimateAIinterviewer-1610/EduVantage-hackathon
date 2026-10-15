import { inferStudyTopic, type StudySource } from './studySources';
import type { StudyAttempt } from './studyProgress';
import { topicMastery } from './studyProgress';

export interface RevisionCard { topic: string; prompt: string; source: string; label: string; excerpt: string }
const normalized = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const cardTopic = (source: StudySource, chunk: StudySource['chunks'][number]) => {
  const stated = chunk.topic?.trim() || '';
  if (stated && normalized(stated) !== normalized(source.title) && !/\.(?:pdf|pptx|txt|md|srt|vtt)$/i.test(stated)) return stated;
  const fromText = inferStudyTopic(chunk.text.split(source.title).join('').trim());
  return fromText && normalized(fromText) !== normalized(source.title) ? fromText : chunk.label;
};
export function revisionCards(sources: StudySource[], attempts: StudyAttempt[], limit = 8): RevisionCard[] {
  const weakest = topicMastery(attempts).map(item => item.topic);
  const all = sources.flatMap(source => source.chunks.map(chunk => ({ source, chunk })));
  const ordered = weakest.length ? [...all].sort((a, b) => {
    const rank = (topic: string) => { const index = weakest.indexOf(topic); return index < 0 ? weakest.length : index; };
    return rank(a.chunk.topic || '') - rank(b.chunk.topic || '');
  }) : all;
  const seen = new Set<string>();
  const cards: RevisionCard[] = [];
  for (const { source, chunk } of ordered) {
    const topic = cardTopic(source, chunk);
    const key = normalized(topic);
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push({ topic, prompt: `Explain ${topic} in your own words.`, source: source.title, label: chunk.label, excerpt: chunk.text.slice(0, 500) });
    if (cards.length === limit) break;
  }
  return cards;
}
export function revisionSchedule(attempts: StudyAttempt[], examDate: string, now = new Date()): { day: string; topics: string[] }[] {
  const target = new Date(`${examDate}T12:00:00`);
  if (!Number.isFinite(target.getTime()) || target.getTime() < now.getTime()) return [];
  const topics = topicMastery(attempts).slice(0, 4).map(item => item.topic);
  if (!topics.length) return [];
  const days = Math.ceil((target.getTime() - now.getTime()) / 86400000);
  const offsets = [...new Set([0, 1, 3, 7, Math.max(0, days - 1)].filter(offset => offset <= days))].sort((a, b) => a - b);
  return offsets.map(offset => ({ day: new Date(now.getTime() + offset * 86400000).toLocaleDateString(), topics: topics.slice(0, offset === 0 ? 2 : 4) }));
}
