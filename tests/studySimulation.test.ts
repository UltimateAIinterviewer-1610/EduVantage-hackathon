// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { readStudyProgress, saveStudyAttempt, topicMastery } from '../services/studyProgress';

const sessions = [
  { profile: 'sim-improving', topic: 'Photosynthesis', answers: [false, true, true, true] },
  { profile: 'sim-needs-review', topic: 'Fractions', answers: [false, false, true, false] },
] as const;

describe('synthetic multi-session learner evaluation', () => {
  beforeEach(() => localStorage.clear());

  it('keeps profiles separate, updates estimates, and measures exact prompt repetition', () => {
    const results = sessions.map(profile => {
      const sessionSizes = [1, 2, 1];
      let offset = 0;
      let firstEstimate = 0;
      for (const [sessionIndex, size] of sessionSizes.entries()) {
        for (let questionIndex = 0; questionIndex < size; questionIndex++) {
          const answerIndex = offset + questionIndex;
          saveStudyAttempt(profile.profile, {
            id: `${profile.profile}-${answerIndex}`,
            sourceId: `${profile.profile}-source`,
            topic: profile.topic,
            difficulty: answerIndex < 2 ? 'foundation' : 'application',
            correct: profile.answers[answerIndex],
            timestamp: sessionIndex * 100 + questionIndex,
            prompt: `Question ${answerIndex + 1} about ${profile.topic}`,
          });
        }
        offset += size;
        // Read the persisted record as a fresh session would.
        const stored = readStudyProgress(profile.profile);
        expect(stored).toHaveLength(offset);
        if (sessionIndex === 0) firstEstimate = topicMastery(stored)[0].estimate;
      }
      const attempts = readStudyProgress(profile.profile);
      const prompts = attempts.map(item => item.prompt?.toLowerCase().trim()).filter(Boolean);
      const repetitionRate = (prompts.length - new Set(prompts).size) / prompts.length;
      return { profile: profile.profile, masteryChange: topicMastery(attempts)[0].estimate - firstEstimate, repetitionRate };
    });
    expect(readStudyProgress('sim-improving')).toHaveLength(4);
    expect(readStudyProgress('sim-needs-review')).toHaveLength(4);
    expect(results[0].masteryChange).toBeGreaterThan(0);
    expect(results[0].repetitionRate).toBe(0);
    expect(results[1].repetitionRate).toBe(0);
    console.info(`Synthetic learner profiles: ${JSON.stringify(results)}`);
  });
});
