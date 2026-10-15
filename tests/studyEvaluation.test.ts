import { describe, expect, it } from 'vitest';
import { retrieveChunks, type StudySource } from '../services/studySources';

const corpus: StudySource[] = [{
  id: 'course', title: 'Synthetic course notes', kind: 'textbook', addedAt: 1,
  chunks: [
    { id: 'photo', sourceId: 'course', label: 'Page 1', topic: 'Photosynthesis', text: 'Photosynthesis uses sunlight and chlorophyll to produce glucose and oxygen.' },
    { id: 'resp', sourceId: 'course', label: 'Page 2', topic: 'Respiration', text: 'Cellular respiration releases energy from glucose in mitochondria.' },
    { id: 'mitosis', sourceId: 'course', label: 'Page 3', topic: 'Mitosis', text: 'Mitosis separates duplicated chromosomes into two nuclei.' },
    { id: 'osmosis', sourceId: 'course', label: 'Page 4', topic: 'Osmosis', text: 'Osmosis moves water across a semipermeable membrane.' },
    { id: 'newton', sourceId: 'course', label: 'Page 5', topic: 'Newton', text: 'Newton second law relates force, mass, and acceleration.' },
    { id: 'fractions', sourceId: 'course', label: 'Page 6', topic: 'Fractions', text: 'Fractions with different denominators need a common denominator before addition.' },
    { id: 'solar', sourceId: 'course', label: 'Page 7', topic: 'Solar', text: 'Solar power is intermittent because sunlight varies by time and weather.' },
    { id: 'battery', sourceId: 'course', label: 'Page 8', topic: 'Storage', text: 'Batteries store energy for use when solar generation falls.' },
  ],
}];
const cases = [
  { query: 'What does photosynthesis make from sunlight?', relevant: ['photo'] },
  { query: 'Where does cellular respiration release energy?', relevant: ['resp'] },
  { query: 'What happens to chromosomes during mitosis?', relevant: ['mitosis'] },
  { query: 'How does osmosis move water?', relevant: ['osmosis'] },
  { query: 'How are force and acceleration related?', relevant: ['newton'] },
  { query: 'Why use a common denominator when adding fractions?', relevant: ['fractions'] },
  { query: 'Why is solar power intermittent?', relevant: ['solar'] },
  { query: 'What stores energy after solar generation falls?', relevant: ['battery'] },
  { query: 'What causes volcanic eruptions?', relevant: [] },
  { query: 'How is a sonnet written?', relevant: [] },
];

describe('Study Lab labeled retrieval fixture', () => {
  it('reports location precision and recall on known and off-material questions', () => {
    let precision = 0; let recall = 0;
    for (const item of cases) {
      const found = retrieveChunks(corpus, item.query, 4).map(match => match.chunk.id);
      const hits = found.filter(id => item.relevant.includes(id)).length;
      precision += found.length ? hits / found.length : Number(item.relevant.length === 0);
      recall += item.relevant.length ? hits / item.relevant.length : Number(found.length === 0);
      if (!item.relevant.length) expect(found).toEqual([]);
    }
    const precisionAt4 = precision / cases.length;
    const recallAt4 = recall / cases.length;
    expect(precisionAt4).toBeGreaterThanOrEqual(0.8);
    expect(recallAt4).toBeGreaterThanOrEqual(0.8);
    // These are exact fixture location metrics, not DeepEval contextual-judge scores.
    console.info(`Study retrieval fixture: precision@4=${precisionAt4.toFixed(2)}, recall@4=${recallAt4.toFixed(2)}, cases=${cases.length}`);
  });
});
