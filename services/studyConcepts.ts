import { inferStudyTopic, type StudySource } from './studySources';

export interface StudyConcept {
  topic: string;
  locations: { sourceId: string; title: string; label: string }[];
  prerequisites: string[];
}
const canonical = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const explicitPrerequisites = (text: string) => {
  const line = text.split('\n').find(item => /^\s*(?:prerequisites?|before you begin|prior knowledge)\s*:/i.test(item));
  if (!line) return [];
  return line.split(':').slice(1).join(':').split(/[,;]/).map(value => value.trim()).filter(value => value.length > 2 && value.length <= 70).slice(0, 6);
};
/** Organizes known source locations without inventing prerequisite relationships. */
export function buildStudyConcepts(sources: StudySource[]): StudyConcept[] {
  const concepts = new Map<string, StudyConcept>();
  for (const source of sources) for (const chunk of source.chunks) {
    const topic = chunk.topic || inferStudyTopic(chunk.text);
    const key = canonical(topic);
    if (!key) continue;
    const concept = concepts.get(key) || { topic, locations: [], prerequisites: [] };
    concept.locations.push({ sourceId: source.id, title: source.title, label: chunk.label });
    for (const item of explicitPrerequisites(chunk.text)) if (canonical(item) !== key && !concept.prerequisites.some(existing => canonical(existing) === canonical(item))) concept.prerequisites.push(item);
    concepts.set(key, concept);
  }
  return [...concepts.values()].sort((a, b) => a.topic.localeCompare(b.topic));
}
