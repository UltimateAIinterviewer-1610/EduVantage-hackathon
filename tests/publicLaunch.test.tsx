// @vitest-environment jsdom
import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const account = { id: 'user-one', email: 'student@example.com' };
const auth = { access_token: 'access-one', refresh_token: 'refresh-one', expires_in: 3600, user: account };
beforeEach(() => {
  vi.resetModules(); vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon-key');
  localStorage.clear(); sessionStorage.clear();
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

test('account sign-in hydrates only this learner’s saved data', async () => {
  localStorage.setItem('edu_history', '[{"id":"old-device"}]');
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    if (input.includes('/auth/v1/token')) return new Response(JSON.stringify(auth), { status: 200 });
    if (input.includes('/rest/v1/learner_state')) {
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer access-one' });
      expect(input).toContain('user_id=eq.user-one');
      return new Response(JSON.stringify([{ key: 'edu_history', value: '[{"id":"from-cloud"}]' }, { key: 'untrusted_key', value: 'ignore' }]), { status: 200 });
    }
    throw new Error(`Unexpected request: ${input}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  const cloud = await import('../services/cloud');
  await cloud.cloudSignIn('student@example.com', 'password123');
  await cloud.hydrateLearnerData();
  expect(localStorage.getItem('edu_history')).toContain('from-cloud');
  expect(localStorage.getItem('untrusted_key')).toBeNull();
  expect(cloud.cloudUserId()).toBe('user-one');
});

test('Google sign-in uses this Supabase project and returns to EduVantage', async () => {
  const cloud = await import('../services/cloud');
  const target = new URL(cloud.googleAuthorizationUrl('https://edu-vantage-beta.vercel.app/'));
  expect(target.origin).toBe('https://project.supabase.co');
  expect(target.pathname).toBe('/auth/v1/authorize');
  expect(target.searchParams.get('provider')).toBe('google');
  expect(target.searchParams.get('redirect_to')).toBe('https://edu-vantage-beta.vercel.app/');
  const { default: CloudGate } = await import('../components/CloudGate');
  render(<CloudGate onReady={async () => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
  expect((await screen.findByRole('status')).textContent).toContain('parent or guardian');
});

test('Google callback validates the Supabase user and stores its session', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    expect(input).toBe('https://project.supabase.co/auth/v1/user');
    return new Response(JSON.stringify(account), { status: 200 });
  }));
  window.location.hash = '#access_token=access-one&refresh_token=refresh-one&expires_in=3600&token_type=bearer';
  const cloud = await import('../services/cloud');
  expect(await cloud.cloudCompleteRedirect()).toBe(false);
  expect(cloud.cloudUserId()).toBe('user-one');
  expect(sessionStorage.getItem('edu_cloud_session')).toContain('refresh-one');
  window.location.hash = '';
});

test('saving work uses the account row and retains a local copy when cloud saving fails', async () => {
  let fail = true;
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    if (input.includes('/auth/v1/token')) return new Response(JSON.stringify(auth), { status: 200 });
    if (input.includes('/rest/v1/learner_state')) return new Response(fail ? JSON.stringify({ message: 'Unavailable' }) : '', { status: fail ? 503 : 201 });
    throw new Error('Unexpected request');
  }));
  const cloud = await import('../services/cloud');
  await cloud.cloudSignIn('student@example.com', 'password123');
  cloud.persistLearnerData('edu_notes_course', 'My notes');
  await vi.waitFor(() => expect(cloud.cloudSyncError()).toContain('Cloud save failed'));
  expect(localStorage.getItem('edu_notes_course')).toBe('My notes');
  fail = false;
  await cloud.flushCloudWrites();
  expect(cloud.cloudSyncError()).toBe('');
});

test('Study Lab drafts sync through the existing learner-scoped account path', async () => {
  const writes: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    if (input.includes('/auth/v1/token')) return new Response(JSON.stringify(auth), { status: 200 });
    if (input.includes('/rest/v1/learner_state') && init?.method === 'POST') { writes.push(String(init.body)); expect(input).toContain('on_conflict=user_id,key'); return new Response(null, { status: 201 }); }
    if (input.includes('/rest/v1/learner_state')) return new Response('[]', { status: 200 });
    throw new Error('Unexpected request');
  }));
  const cloud = await import('../services/cloud');
  await cloud.cloudSignIn('student@example.com', 'password123');
  cloud.persistLearnerData('edu_study_session_user-one', JSON.stringify({ query: 'What is a fraction?' }));
  await cloud.flushCloudWrites();
  expect(writes.join(' ')).toContain('edu_study_session_user-one');
  expect(writes.join(' ')).toContain('user-one');
  expect(localStorage.getItem('edu_study_session_user-one')).toContain('fraction');
});

test('an unsynced note survives reload and is retried after cloud hydration', async () => {
  let allowSave = false;
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    if (input.includes('/auth/v1/token')) return new Response(JSON.stringify(auth), { status: 200 });
    if (input.includes('/rest/v1/learner_state') && init?.method === 'POST') return allowSave ? new Response(null, { status: 201 }) : new Response('{"message":"Offline"}', { status: 503 });
    if (input.includes('/rest/v1/learner_state')) return new Response(JSON.stringify([{ key: 'edu_notes_course', value: 'Old cloud note' }]), { status: 200 });
    throw new Error('Unexpected request');
  }));
  const first = await import('../services/cloud');
  await first.cloudSignIn('student@example.com', 'password123');
  first.persistLearnerData('edu_notes_course', 'New offline note');
  await vi.waitFor(() => expect(first.cloudSyncError()).toContain('Cloud save failed'));
  vi.resetModules(); allowSave = true;
  const afterReload = await import('../services/cloud');
  await afterReload.hydrateLearnerData();
  expect(localStorage.getItem('edu_notes_course')).toBe('New offline note');
  await vi.waitFor(() => expect(localStorage.getItem('edu_cloud_pending_user-one')).toBeNull());
});

test('public self-registration asks the adult or guardian to own the account', async () => {
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
  const { default: CloudGate } = await import('../components/CloudGate');
  render(<CloudGate onReady={async () => {}} />);
  fireEvent.click(screen.getByText('Create account'));
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'learner@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  expect((await screen.findByRole('status')).textContent).toContain('parent or guardian');
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox', { name: /parent or guardian who owns/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
});

test('account mode shows a public home and privacy link before sign-in', async () => {
  const { default: App } = await import('../App');
  render(<App />);
  expect(await screen.findByRole('heading', { name: /Learn your way/ })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Sign in or create account' }));
  expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Privacy Policy' })).toBeTruthy();
});

test('a parent-owned account can load a school-age learner profile', async () => {
  const { readProfile } = await import('../services/profile');
  localStorage.setItem('edu_student_profile', JSON.stringify({ id: 'local-learner', name: 'Asha', age: '16', country: 'India', language: 'en' }));
  expect(readProfile()?.name).toBe('Asha');
  localStorage.setItem('edu_student_profile', JSON.stringify({ id: 'adult-learner', name: 'Asha', age: '20', country: 'India', language: 'en' }));
  expect(readProfile()?.name).toBe('Asha');
});

test('an older eligible profile receives a stable ID that is queued for account sync', async () => {
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    if (input.includes('/auth/v1/token')) return new Response(JSON.stringify(auth), { status: 200 });
    if (input.includes('/rest/v1/learner_state')) return new Response(null, { status: 201 });
    throw new Error('Unexpected request');
  });
  vi.stubGlobal('fetch', fetchMock);
  const cloud = await import('../services/cloud');
  const { readProfile } = await import('../services/profile');
  await cloud.cloudSignIn('student@example.com', 'password123');
  localStorage.setItem('edu_student_profile', JSON.stringify({ name: 'Asha', age: '20', country: 'India', language: 'en' }));
  const id = readProfile()?.id;
  expect(id).toBeTruthy();
  expect(JSON.parse(localStorage.getItem('edu_student_profile') || '{}').id).toBe(id);
  await cloud.flushCloudWrites();
  expect(readProfile()?.id).toBe(id);
  expect(fetchMock.mock.calls.some(([input, init]) => input.includes('/rest/v1/learner_state') && init?.method === 'POST')).toBe(true);
});

test('public account mode never remembers a provider key on the device', async () => {
  const ai = await import('../services/aiConnection');
  expect(ai.saveAIConnection('learner-one', 'gemini-test-key', true)).toBe(true);
  expect(ai.getAIConnection('learner-one').source).toBe('session');
  expect(localStorage.getItem('edu_ai_connection_learner-one')).toBeNull();
  expect(sessionStorage.getItem('edu_ai_connection_learner-one')).toContain('gemini-test-key');
});

test('public identity rejects a malformed support address and keeps the EduVantage name', async () => {
  vi.stubEnv('VITE_SUPPORT_EMAIL', '');
  const defaultIdentity = await import('../services/publicIdentity');
  expect(defaultIdentity.publicName).toBe('EduVantage');
  expect(defaultIdentity.supportEmail).toBe('Pragyashukla504@gmail.com');
  vi.resetModules();
  vi.stubEnv('VITE_SUPPORT_EMAIL', 'pragyashukla504@@gmail.com');
  const invalid = await import('../services/publicIdentity');
  expect(invalid.publicName).toBe('EduVantage');
  expect(invalid.supportEmail).toBeNull();
  vi.resetModules();
  vi.stubEnv('VITE_SUPPORT_EMAIL', 'support@example.com');
  const valid = await import('../services/publicIdentity');
  expect(valid.supportEmail).toBe('support@example.com');
});

test.each([['Log in', 'Welcome back'], ['Sign up', 'Create your account']])('landing %s opens the existing account form', async (label, heading) => {
  const { default: App } = await import('../App');
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: label }));
  expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
  expect(screen.getByLabelText('Email address')).toBeTruthy();
  expect(screen.queryByLabelText('Full name *')).toBeNull();
});
