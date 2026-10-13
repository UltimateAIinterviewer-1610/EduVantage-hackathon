// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { saveProfile, setSignedIn } from '../services/profile';
import { StudentProfile } from '../types';

const learner:StudentProfile={name:'Asha',age:'16',className:'Class 10',institution:'Example School',address:'',city:'Delhi',state:'Delhi',country:'India',language:'en'};
beforeEach(()=>{localStorage.clear();sessionStorage.clear();HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};});
afterEach(cleanup);

test('guide is available before sign-in and closes without changing the profile form',()=>{
 render(<App/>);
 fireEvent.click(screen.getByRole('button',{name:'Explore the guide'}));
 expect(screen.getByRole('dialog',{name:'Your guide to EduVantage'})).toBeTruthy();
 expect(screen.getByText('Step 1 of 12')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Next step'}));
 expect(screen.getByText('Step 2 of 12')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Close guide'}));
 expect(screen.queryByRole('dialog',{name:'Your guide to EduVantage'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Try the local demo'}));
 expect(screen.getByLabelText('Full name *')).toBeTruthy();
});

test('guide can take a signed-in student to a section and reopen',()=>{
 saveProfile(learner);setSignedIn(true);
 render(<App/>);
 fireEvent.click(screen.getByRole('button',{name:'How to use EduVantage'}));
 fireEvent.click(screen.getByRole('button',{name:/Explore the dashboard/}));
 expect(screen.getByText('Step 12 of 12')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Open this section'}));
 expect(screen.queryByRole('dialog',{name:'Your guide to EduVantage'})).toBeNull();
 expect(screen.getByRole('button',{name:'Dashboard'}).getAttribute('aria-current')).toBe('page');
 fireEvent.click(screen.getByRole('button',{name:'How to use EduVantage'}));
 expect(screen.getByText('Step 1 of 12')).toBeTruthy();
});
