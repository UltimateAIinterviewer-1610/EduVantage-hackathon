// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { captionChunks, importStudyFile, lessonSourceContext, retrieveChunks, StudySource } from '../services/studySources';
import { askStudySources, createStudyQuestion, nextDifficulty, validStudyCitationNumbers } from '../services/studyAI';
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
    const file = new File(['WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nPhotosynthesis begins with sunlight.'], 'lecture.vtt', { type: 'text/vtt' });
    const imported = await importStudyFile(file, 'lecture');
    expect(imported.kind).toBe('lecture');
    expect(imported.chunks[0].text).toContain('sunlight');
    expect(imported.chunks[0].label).toContain('00:00:01.000');
    await expect(importStudyFile(new File(['x'], 'lecture.mp4'), 'lecture')).rejects.toThrow(/enable Gemini video transcription/);
  });
  it('keeps SRT timestamps with their cited caption excerpts', () => {
    expect(captionChunks('lecture', '1\n00:01:02,500 --> 00:01:05,000\nThe first idea.\n\n2\n00:01:06,000 --> 00:01:08,000\nThe next idea.').map(chunk => chunk.label)).toEqual(['Timestamp 00:01:02.500 · section 1', 'Timestamp 00:01:06.000 · section 1']);
  });
  it('rejects empty, oversized, unsupported, and unreadable sources before saving them', async () => {
    await expect(importStudyFile(new File([], 'empty.txt'), 'textbook')).rejects.toThrow(/empty/);
    await expect(importStudyFile(new File(['x'], 'notes.exe'), 'textbook')).rejects.toThrow(/PDF, PPTX/);
    await expect(importStudyFile(new File([new Uint8Array(12 * 1024 * 1024 + 1)], 'large.txt'), 'textbook')).rejects.toThrow(/over 12 MB/);
    await expect(importStudyFile(new File(['   '], 'blank.md'), 'textbook')).rejects.toThrow(/No readable text/);
    await expect(importStudyFile(new File(['\u0000\u0001binary'], 'broken.txt'), 'textbook')).rejects.toThrow(/not readable/);
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
  it('never exposes a citation number outside the supplied excerpts', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: 'Glucose is produced [1]. Extra claim [99].' } }] }) } as Response);
    const answer = await askStudySources(connection, [source], 'What does photosynthesis make?', 'English');
    expect(answer.text).toContain('[1]');
    expect(answer.text).not.toContain('[99]');
    expect(validStudyCitationNumbers(answer.text, answer.citations)).toEqual([1]);
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
  it('uses the new difficulty on a second sourced question after the first answer', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ prompt: 'What is produced?', options: ['Glucose', 'Iron', 'Salt', 'Sand'], correctIndex: 0, explanation: 'Glucose is listed in the source.', sourceNumber: 1 }) } }] }) } as Response);
    const first = await createStudyQuestion(connection, [source], 'photosynthesis', 'foundation', 'English');
    const second = await createStudyQuestion(connection, [source], 'photosynthesis', nextDifficulty(true, first.difficulty), 'English');
    expect([first.difficulty, second.difficulty]).toEqual(['foundation', 'application']);
    expect(second.options).toHaveLength(4);
    expect(second.citation.excerpt).toContain('glucose');
    expect(nextDifficulty(false, second.difficulty)).toBe('foundation');
  });
  it('rejects a repeated provider question without making another billable request', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ prompt: 'What is produced?', options: ['Glucose', 'Iron', 'Salt', 'Sand'], correctIndex: 0, explanation: 'Glucose is listed in the source.', sourceNumber: 1 }) } }] }) } as Response);
    await expect(createStudyQuestion(connection, [source], 'photosynthesis', 'foundation', 'English', ['what IS produced?'])).rejects.toThrow(/repeated/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('saves per-profile practice progress for the dashboard', () => {
    localStorage.clear();
    const attempt = { id: 'a', sourceId: 'one', topic: 'Photosynthesis', difficulty: 'foundation' as const, correct: true, timestamp: 1 };
    saveStudyAttempt('student-one', attempt);
    expect(studySummary(readStudyProgress('student-one'))).toMatchObject({ total: 1, correct: 1, recentAccuracy: 100 });
    expect(studySummary(readStudyProgress('student-one')).topics[0].accuracy).toBe(100);
    expect(readStudyProgress('student-two')).toHaveLength(0);
  });
});
