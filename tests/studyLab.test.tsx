// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { importStudyFile, lessonSourceContext, retrieveChunks, StudySource } from '../services/studySources';
import { askStudySources, createStudyQuestion, nextDifficulty } from '../services/studyAI';
import { AIConnection } from '../services/aiConnection';
import { readFileSync } from 'node:fs';
import { readStudyProgress, saveStudyAttempt, studySummary } from '../services/studyProgress';

const connection: AIConnection = { provider: 'custom', key: 'test-key', model: 'test-model', baseUrl: 'https://example.test/v1', source: 'session' };
const source: StudySource = { id: 'one', title: 'Biology slides.pdf', kind: 'slides', addedAt: 1, chunks: [
  { id: 'one-1', sourceId: 'one', label: 'Page 2 · section 1', text: 'Photosynthesis converts sunlight, water, and carbon dioxide into glucose and oxygen.' },
  { id: 'one-2', sourceId: 'one', label: 'Page 3 · section 1', text: 'The mitochondrion releases energy from glucose during cellular respiration.' }
] };

describe('Study Lab source grounding and adaptation', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());
  it('imports a lecture transcript and explains the video-transcription requirement', async () => {
    const file = new File(['Photosynthesis begins with sunlight.'], 'lecture.vtt', { type: 'text/vtt' });
    const imported = await importStudyFile(file, 'lecture');
    expect(imported.kind).toBe('lecture');
    expect(imported.chunks[0].text).toContain('sunlight');
    await expect(importStudyFile(new File(['x'], 'lecture.mp4'), 'lecture')).rejects.toThrow(/enable Gemini video transcription/);
  });
  it('extracts and cites native PowerPoint slide text', async () => {
    const bytes = readFileSync('tests/fixtures/study-slides.pptx');
    const file = new File([new Uint8Array(bytes)], 'lesson.pptx');
    const imported = await importStudyFile(file, 'slides');
    expect(imported.chunks.map(item => item.label)).toEqual(['Slide 1 · section 1', 'Slide 2 · section 1']);
    expect(imported.chunks[0].text).toBe('First slide');
  });
  it('retrieves matching passages and exposes only citations actually used by the answer', async () => {
    expect(retrieveChunks([source], 'How does photosynthesis use sunlight?')[0].chunk.label).toContain('Page 2');
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: 'It makes glucose [1].' } }] }) } as Response);
    const answer = await askStudySources(connection, [source], 'What does photosynthesis make?', 'English');
    expect(answer.citations).toHaveLength(1);
    expect(answer.citations[0].title).toBe('Biology slides.pdf');
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.messages[1].content).toContain('Photosynthesis converts sunlight');
  });
  it('does not use unrelated excerpts for an unsupported question, but supports a broad overview', async () => {
    expect(retrieveChunks([source], 'Explain volcanic eruptions')).toHaveLength(0);
    expect(retrieveChunks([source], 'Summarize the key concepts')).toHaveLength(2);
    await expect(askStudySources(connection, [source], 'Explain volcanic eruptions', 'English')).rejects.toThrow(/No relevant passage/);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('passes matching, labeled passages into a classroom lesson without unrelated material', () => {
    const context = lessonSourceContext([source], 'photosynthesis');
    expect(context.matches).toHaveLength(1);
    expect(context.instruction).toContain('Biology slides.pdf');
    expect(context.instruction).toContain('Page 2');
    expect(context.instruction).not.toContain('mitochondrion');
    expect(lessonSourceContext([source], 'volcanic eruptions').matches).toHaveLength(0);
  });
  it('validates a source-linked question and changes the next difficulty based on the answer', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ prompt: 'What does photosynthesis produce?', options: ['Glucose', 'Iron', 'Salt', 'Sand'], correctIndex: 0, explanation: 'The slide names glucose.', sourceNumber: 1 }) } }] }) } as Response);
    const question = await createStudyQuestion(connection, [source], 'photosynthesis', 'foundation', 'English');
    expect(question.citation.label).toContain('Page 2');
    expect(nextDifficulty(true, question.difficulty)).toBe('application');
    expect(nextDifficulty(false, 'application')).toBe('foundation');
  });
  it('saves per-profile practice progress for the dashboard', () => {
    localStorage.clear();
    const attempt = { id: 'a', sourceId: 'one', topic: 'Photosynthesis', difficulty: 'foundation' as const, correct: true, timestamp: 1 };
    saveStudyAttempt('student-one', attempt);
    expect(studySummary(readStudyProgress('student-one'))).toMatchObject({ total: 1, correct: 1, recentAccuracy: 100 });
    expect(readStudyProgress('student-two')).toHaveLength(0);
  });
});
