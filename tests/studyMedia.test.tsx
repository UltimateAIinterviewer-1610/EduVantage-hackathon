// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { importStudyFile } from '../services/studySources';

const generateContent = vi.fn();
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { generateContent }; } }));
const connection = { provider: 'gemini' as const, key: 'test-only', source: 'session' as const };
const archive = readFileSync('tests/fixtures/study-slide-image.pptx');
const file = () => new File([archive], 'biology.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });

describe('Study Lab opt-in slide figure extraction', () => {
  beforeEach(() => { generateContent.mockReset(); generateContent.mockResolvedValue({ text: 'A diagram labels a plant cell membrane and nucleus.' }); });
  it('keeps slide text local when media processing is disabled', async () => {
    const source = await importStudyFile(file(), 'slides');
    expect(source.chunks.map(chunk => chunk.label)).toEqual(['Slide 1 · section 1']);
    expect(generateContent).not.toHaveBeenCalled();
  });
  it('adds a source-labeled image description only after explicit opt-in', async () => {
    const source = await importStudyFile(file(), 'slides', { useGeminiMedia: true, connection });
    expect(source.chunks.some(chunk => chunk.label === 'Slide 1 · figure 1' && chunk.text.includes('plant cell membrane'))).toBe(true);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });
  it('labels Gemini-supplied video timings as estimated and keeps an untimed fallback', async () => {
    generateContent.mockResolvedValueOnce({ text: 'WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nCells contain membranes.\n\n00:00:04.000 --> 00:00:06.000\nNuclei hold DNA.' });
    const timed = await importStudyFile(new File(['short video bytes'], 'cells.webm'), 'lecture', { useGeminiMedia: true, connection });
    expect(timed.chunks.map(chunk => chunk.label)).toEqual(['AI-estimated timestamp 00:00:01.000 · section 1', 'AI-estimated timestamp 00:00:04.000 · section 1']);
    generateContent.mockResolvedValueOnce({ text: 'Cells contain membranes and nuclei hold DNA.' });
    const untimed = await importStudyFile(new File(['short video bytes'], 'cells.webm'), 'lecture', { useGeminiMedia: true, connection });
    expect(untimed.chunks[0].label).toBe('Video section 1');
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
});
