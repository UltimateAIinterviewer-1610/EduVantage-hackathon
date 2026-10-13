// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PresentationCoach from '../components/PresentationCoach';
import { UiProvider } from '../uiText';
import { AIConnection } from '../services/aiConnection';
import { makePresentationPlan, practiceMetrics, presentationFollowUp, readPresentationAttempts, savePresentationAttempt, starterPlan } from '../services/presentationCoach';

const noConnection: AIConnection = { provider: 'gemini', key: '', source: 'none' };
const brief = { title: 'Solar energy', audience: 'Classmates', durationMinutes: 3, goal: 'Explain how panels work', keyPoints: 'Sunlight\nElectricity\nCost' };
beforeEach(() => localStorage.clear());
afterEach(cleanup);

it('creates a usable no-key plan and gives transcript-based measurements', () => {
  const plan = starterPlan(brief);
  expect(plan.body).toEqual(['Sunlight', 'Electricity', 'Cost']);
  expect(plan.questions).toHaveLength(3);
  expect(starterPlan(brief, 'Hindi').opening).toContain('महत्वपूर्ण');
  expect(practiceMetrics(['Hello classmates.', 'Um solar panels turn sunlight into electricity.', 'Thank you.', 'It costs money.'], 120, 3)).toMatchObject({ hasOpening: true, hasBody: true, hasClosing: true, hasQuestions: true, fillerCount: 1 });
});

it('keeps saved rehearsal attempts separate for each student profile', () => {
  savePresentationAttempt('one', { id: 'attempt-1', timestamp: 1, brief, segments: ['Hello', 'Sunlight', 'Thank you', 'Yes'], elapsedSeconds: 90 });
  expect(readPresentationAttempts('one')).toHaveLength(1);
  expect(readPresentationAttempts('two')).toHaveLength(0);
});

it('reopens a past rehearsal and can start another round', () => {
  savePresentationAttempt('one', { id: 'past', timestamp: 1, brief, segments: ['Hello', 'Sunlight', 'Thank you', 'Yes'], elapsedSeconds: 90 });
  render(<UiProvider language="en"><PresentationCoach profileId="one" connection={noConnection} language="en" onOpenProvider={() => {}} /></UiProvider>);
  fireEvent.click(screen.getByRole('button', { name: /Solar energy/ }));
  expect(screen.getByText('One rehearsal closer to ready.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Rehearse again' }));
  expect(screen.getByLabelText('Your rehearsal words')).toBeTruthy();
});

it('accepts a personalized plan from a non-Gemini AI provider', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ opening: 'Start with a question.', body: ['Explain sunlight', 'Show a panel'], closing: 'Invite questions.', questions: ['How much does it cost?', 'Does it work at night?', 'What is next?'] }) } }] }) }));
  const connection: AIConnection = { provider: 'custom', key: 'test-key', baseUrl: 'https://example.test/v1', model: 'test-model', source: 'session' };
  const plan = await makePresentationPlan(connection, brief, 'English');
  expect(plan.questions[0]).toContain('cost');
  expect(vi.mocked(fetch).mock.calls[0][1]?.body).toContain('Solar energy');
  vi.unstubAllGlobals();
});

it('can ask a contextual follow-up after a student answers', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: 'How would your example change on a cloudy day?' } }] }) }));
  const connection: AIConnection = { provider: 'custom', key: 'test-key', baseUrl: 'https://example.test/v1', model: 'test-model', source: 'session' };
  const question = await presentationFollowUp(connection, brief, 'How do panels work?', 'Panels turn sunlight into electricity.', 'English');
  expect(question).toContain('cloudy day');
  expect(vi.mocked(fetch).mock.calls[0][1]?.body).toContain('Panels turn sunlight into electricity');
  vi.unstubAllGlobals();
});

it('lets a student complete a typed rehearsal and view feedback without an API key', () => {
  render(<UiProvider language="en"><PresentationCoach profileId="one" connection={noConnection} language="en" onOpenProvider={() => {}} /></UiProvider>);
  fireEvent.change(screen.getByLabelText('Presentation topic or title *'), { target: { value: 'Solar energy' } });
  fireEvent.click(screen.getByRole('button', { name: /Build my practice plan/ }));
  expect(screen.getByText(/A route you can speak in your own words/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Start rehearsal/ }));
  fireEvent.change(screen.getByLabelText('Your rehearsal words'), { target: { value: 'Solar energy matters to our school because it makes clean electricity.' } });
  fireEvent.click(screen.getByRole('button', { name: /Next part/ }));
  fireEvent.change(screen.getByLabelText('Your rehearsal words'), { target: { value: 'Panels turn sunlight into electricity. Here is an example.' } });
  fireEvent.click(screen.getByRole('button', { name: /Next part/ }));
  fireEvent.click(screen.getByRole('button', { name: /Next part/ }));
  fireEvent.click(screen.getByRole('button', { name: /Finish & get feedback/ }));
  expect(screen.getByText('One rehearsal closer to ready.')).toBeTruthy();
  expect(readPresentationAttempts('one')).toHaveLength(1);
});
