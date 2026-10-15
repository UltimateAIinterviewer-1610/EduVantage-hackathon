import { describe, expect, it } from 'vitest';
import { similarStudyQuestion } from '../services/studyQuestionSimilarity';

describe('study question repetition guard', () => {
  it('rejects punctuation changes and close word-order paraphrases', () => {
    expect(similarStudyQuestion('What are the main causes of solar power intermittency?', 'What are the main causes of solar power intermittency')).toBe(true);
    expect(similarStudyQuestion('Which process converts sunlight into stored chemical energy in plants?', 'In plants, which process converts sunlight into stored chemical energy?')).toBe(true);
  });
  it('allows distinct questions on the same topic', () => {
    expect(similarStudyQuestion('What are the main causes of solar power intermittency?', 'How does a battery store surplus solar energy for nighttime use?')).toBe(false);
    expect(similarStudyQuestion('What is photosynthesis?', 'Why is photosynthesis useful?')).toBe(false);
  });
});
