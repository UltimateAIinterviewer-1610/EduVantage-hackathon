// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { captionChunks, chunkText, importStudyFile, lessonSourceContext, retrieveChunks, studyTopics, StudySource } from '../services/studySources';
import { askStudySources, createStudyQuestion, nextDifficulty, validStudyCitationNumbers, verifyStudyQuestion } from '../services/studyAI';
import { AIConnection } from '../services/aiConnection';
import { buildStudyConcepts } from '../services/studyConcepts';
import { revisionCards, revisionSchedule } from '../services/studyRevision';
import { createStudyAssessment, gradeAssessmentResponse } from '../services/studyAssessment';
import { readAssessmentReports, saveAssessmentReport } from '../services/studyAssessmentProgress';
import { readFileSync } from 'node:fs';
import { readStudyProgress, saveStudyAttempt, studySummary, topicMastery } from '../services/studyProgress';

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
  it('keeps separate source locations distinct and offers automatically labeled topics', () => {
    const first = chunkText('book', 'Cell division begins with mitosis.', 'Page 1 · section');
    const second = chunkText('book', 'Cell division ends with cytokinesis.', 'Page 2 · section');
    expect(first[0].id).not.toBe(second[0].id);
    expect(studyTopics([{ id: 'book', title: 'Biology', kind: 'textbook', addedAt: 1, chunks: [...first, ...second] }])).toContain('Cell division begins with mitosis');
  });
  it('maps topics to exact source labels without inventing prerequisites', () => {
    const concepts = buildStudyConcepts([source]);
    expect(concepts[0].locations[0].label).toContain('Page');
    expect(concepts.every(concept => concept.prerequisites.length === 0)).toBe(true);
    const explicit = buildStudyConcepts([{ ...source, chunks: [{ ...source.chunks[0], topic: 'Photosynthesis', text: 'Prerequisites: light, plant cells\nPhotosynthesis converts light.' }] }]);
    expect(explicit[0].prerequisites).toEqual(['light', 'plant cells']);
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
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ prompt: 'What does photosynthesis produce?', options: ['Glucose', 'Iron', 'Salt', 'Sand'], correctIndex: 0, explanation: 'The slide names glucose.', sourceNumber: 1, evidenceQuote: 'into glucose and oxygen' }) } }] }) } as Response);
    const question = await createStudyQuestion(connection, [source], 'photosynthesis', 'foundation', 'English');
    expect(question.citation.label).toContain('Page 2');
    expect(nextDifficulty(true, question.difficulty)).toBe('application');
    expect(nextDifficulty(false, 'application')).toBe('foundation');
  });
  it('uses the new difficulty on a second sourced question after the first answer', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ prompt: 'What is produced?', options: ['Glucose', 'Iron', 'Salt', 'Sand'], correctIndex: 0, explanation: 'Glucose is listed in the source.', sourceNumber: 1, evidenceQuote: 'into glucose and oxygen' }) } }] }) } as Response);
    const first = await createStudyQuestion(connection, [source], 'photosynthesis', 'foundation', 'English');
    const second = await createStudyQuestion(connection, [source], 'photosynthesis', nextDifficulty(true, first.difficulty), 'English');
    expect([first.difficulty, second.difficulty]).toEqual(['foundation', 'application']);
    expect(second.options).toHaveLength(4);
    expect(second.citation.excerpt).toContain('glucose');
    expect(nextDifficulty(false, second.difficulty)).toBe('foundation');
  });
  it('runs an explicit second source check and rejects a fabricated verification quote', async () => {
    const question = { prompt: 'What does photosynthesis produce?', options: ['Glucose', 'Iron', 'Salt', 'Sand'], correctIndex: 0, explanation: 'The source names glucose.', citation: { number: 1, sourceId: 'one', title: source.title, label: source.chunks[0].label, excerpt: source.chunks[0].text }, difficulty: 'foundation' as const };
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ supported: true, reason: 'The excerpt says glucose is produced.', evidenceQuote: 'into glucose and oxygen' }) } }] }) } as Response);
    expect((await verifyStudyQuestion(connection, question)).supported).toBe(true);
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ supported: true, reason: 'It is supported.', evidenceQuote: 'A fabricated quote from nowhere' }) } }] }) } as Response);
    expect(await verifyStudyQuestion(connection, question)).toEqual({ supported: false, reason: 'The second check did not provide a matching source quote.' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('rejects a repeated provider question without making another billable request', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ prompt: 'What is produced?', options: ['Glucose', 'Iron', 'Salt', 'Sand'], correctIndex: 0, explanation: 'Glucose is listed in the source.', sourceNumber: 1, evidenceQuote: 'into glucose and oxygen' }) } }] }) } as Response);
    await expect(createStudyQuestion(connection, [source], 'photosynthesis', 'foundation', 'English', ['what IS produced?'])).rejects.toThrow(/repeated/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('updates a topic estimate after each answer and keeps older records compatible', () => {
    const older = { id: 'old', sourceId: 'one', topic: 'Photosynthesis', difficulty: 'foundation' as const, correct: false, timestamp: 1 };
    const newer = { ...older, id: 'new', correct: true, timestamp: 2 };
    const afterFirst = topicMastery([older])[0];
    const afterSecond = topicMastery([newer, older])[0];
    expect(afterFirst.estimate).toBeLessThan(20);
    expect(afterSecond.estimate).toBeGreaterThan(afterFirst.estimate);
    expect(afterSecond.observations).toBe(2);
  });
  it('creates a mixed assessment only when each answer has a real source quote', async () => {
    const items = [
      { format: 'multiple-choice', topic: 'Photosynthesis', difficulty: 'foundation', prompt: 'Which product is made?', answer: 'Glucose', options: ['Glucose', 'Iron', 'Salt', 'Sand'], correctIndex: 0, explanation: 'The source names glucose.', sourceNumber: 1, evidenceQuote: 'into glucose and oxygen' },
      { format: 'short-answer', topic: 'Photosynthesis', difficulty: 'application', prompt: 'Name the reactants.', answer: 'Water and carbon dioxide', explanation: 'Both are named in the source.', sourceNumber: 1, evidenceQuote: 'sunlight, water, and carbon dioxide' },
    ];
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(items) } }] }) } as Response);
    const exam = await createStudyAssessment(connection, [source], 'photosynthesis', 'English');
    expect(exam).toHaveLength(2);
    expect(gradeAssessmentResponse(exam[0], '0')).toBe(true);
    expect(gradeAssessmentResponse(exam[1], 'Water and carbon dioxide')).toBe(null);
    expect(gradeAssessmentResponse(exam[1], 'Water and carbon dioxide', true)).toBe(true);
    items[1].evidenceQuote = 'fabricated evidence';
    await expect(createStudyAssessment(connection, [source], 'photosynthesis', 'English')).rejects.toThrow(/verifiable source evidence/);
  });
  it('saves completed assessment reports only for the correct learner', () => {
    localStorage.clear();
    saveAssessmentReport('student-one', { id: 'report-1', completedAt: 10, topic: 'Photosynthesis', results: [{ prompt: 'What is made?', topic: 'Photosynthesis', correct: true, sourceId: 'one', sourceLabel: 'Page 2', explanation: 'Glucose.' }] });
    expect(readAssessmentReports('student-one')).toHaveLength(1);
    expect(readAssessmentReports('student-two')).toHaveLength(0);
  });
  it('makes source-backed revision cards and a time-limited weak-topic schedule', () => {
    const weak = { id: 'a', sourceId: 'one', topic: 'Photosynthesis', difficulty: 'foundation' as const, correct: false, timestamp: 1 };
    const cards = revisionCards([source], [weak]);
    expect(cards[0].source).toBe('Biology slides.pdf');
    expect(cards[0].excerpt).toContain('Photosynthesis');
    const schedule = revisionSchedule([weak], '2026-10-20', new Date('2026-10-15T08:00:00'));
    expect(schedule.length).toBeGreaterThan(1);
    expect(schedule[0].topics).toContain('Photosynthesis');
    expect(revisionSchedule([weak], '2026-10-14', new Date('2026-10-15T08:00:00'))).toEqual([]);
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
