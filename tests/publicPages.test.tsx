// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.location.hash = ''; });
afterEach(() => { cleanup(); window.location.hash = ''; });

test('a first-time visitor sees the public home before the local profile form', () => {
  render(<App/>);
  expect(screen.getByRole('heading', { name: /Learn your way/ })).toBeTruthy();
  expect(screen.queryByLabelText('Full name *')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Try the local demo' }));
  expect(screen.getByLabelText('Full name *')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Public home/ }));
  expect(screen.getByRole('heading', { name: /Learn your way/ })).toBeTruthy();
});

test('the privacy policy is available before profile creation and can return home', async () => {
  render(<App/>);
  fireEvent.click(screen.getAllByRole('link', { name: 'Privacy Policy' })[0]);
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeTruthy());
  expect(screen.getByText(/In the local demo, your profile and learning work/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Back to EduVantage/ }));
  expect(screen.getByRole('heading', { name: /Learn your way/ })).toBeTruthy();
});

test('LAN demo saves and enters without secure-context randomUUID, and survives remount', async () => {
  const original = Object.getOwnPropertyDescriptor(crypto, 'randomUUID');
  Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined });
  try {
    render(<App/>);
    fireEvent.click(screen.getByRole('button', { name: 'Try the local demo' }));
    fireEvent.change(screen.getByLabelText('Full name *'), { target: { value: ' Demo learner ' } });
    fireEvent.change(screen.getByLabelText('Country *'), { target: { value: 'Canada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and enter' }));
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    const profile = JSON.parse(localStorage.getItem('edu_student_profile')!);
    expect(profile.name).toBe('Demo learner');
    expect(profile.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(sessionStorage.getItem('edu_cloud_session')).toBeNull();
    cleanup(); render(<App/>);
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
  } finally {
    if (original) Object.defineProperty(crypto, 'randomUUID', original);
    else delete (crypto as Partial<Crypto>).randomUUID;
  }
});

test.each(['Log in', 'Sign up'])('%s explains missing Supabase without creating a demo profile', label => {
  render(<App/>);
  fireEvent.click(screen.getByRole('button', { name: label }));
  expect(screen.getByRole('heading', { name: `${label} is not configured` })).toBeTruthy();
  expect(screen.getByText(/VITE_SUPABASE_URL/)).toBeTruthy();
  expect(screen.queryByLabelText('Full name *')).toBeNull();
  expect(localStorage.getItem('edu_student_profile')).toBeNull();
  expect(sessionStorage.getItem('edu_signed_in')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Public home/ }));
  expect(screen.getByRole('heading', { name: /Learn your way/ })).toBeTruthy();
});
