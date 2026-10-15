import { describe, expect, it } from 'vitest';
import { matchingStudyEvidence } from '../services/studyEvidence';

describe('Study Lab source quote matching', () => {
  it('returns the original source span despite PDF line breaks and punctuation changes', () => {
    const source = 'Solar power is intermittent because\ncloud cover changes the available sunlight.';
    expect(matchingStudyEvidence(source, 'because cloud cover changes the available sunlight'))
      .toBe('because\ncloud cover changes the available sunlight');
  });
  it('rejects paraphrased or missing evidence', () => {
    expect(matchingStudyEvidence('Solar power varies with cloud cover.', 'Solar power is cheap and reliable.')).toBeNull();
    expect(matchingStudyEvidence('Solar power varies with cloud cover.', 'Solar')).toBeNull();
  });
});
