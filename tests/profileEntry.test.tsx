// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import StudentProfileForm from '../components/StudentProfileForm';
import { readProfile } from '../services/profile';

beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('legacy profiles get a stable ID on an HTTP LAN origin', () => {
  vi.spyOn(crypto, 'randomUUID').mockImplementation(undefined!);
  Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined });
  localStorage.setItem('edu_student_profile', JSON.stringify({name:'Demo',country:'Canada'}));
  const profile = readProfile();
  expect(profile?.id).toBeTruthy();
  expect(readProfile()?.id).toBe(profile?.id);
});

test('failed storage reports an error without entering and can be retried', () => {
  const enter = vi.fn();
  render(<StudentProfileForm initial={null} onSave={enter}/>);
  fireEvent.change(screen.getByLabelText('Full name *'), {target:{value:'Demo'}});
  fireEvent.change(screen.getByLabelText('Country *'), {target:{value:'Canada'}});
  const save = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(()=>{throw new Error('Full');});
  fireEvent.click(screen.getByRole('button', {name:'Save profile'}));
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(enter).not.toHaveBeenCalled();
  save.mockRestore();
  fireEvent.click(screen.getByRole('button', {name:'Save profile'}));
  expect(enter).toHaveBeenCalledOnce();
});

test('blank names and invalid ages cannot save or enter', () => {
  const enter = vi.fn();
  const {container} = render(<StudentProfileForm initial={null} onSave={enter}/>);
  fireEvent.change(screen.getByLabelText('Full name *'), {target:{value:'   '}});
  fireEvent.change(screen.getByLabelText('Country *'), {target:{value:'Canada'}});
  fireEvent.submit(container.querySelector('form')!);
  expect(screen.getByRole('alert')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Full name *'), {target:{value:'Demo'}});
  fireEvent.change(screen.getByLabelText('Age'), {target:{value:'2'}});
  fireEvent.submit(container.querySelector('form')!);
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(enter).not.toHaveBeenCalled();
  expect(localStorage.getItem('edu_student_profile')).toBeNull();
});
