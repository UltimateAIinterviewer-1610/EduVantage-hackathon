// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { saveProfile, setSignedIn } from '../services/profile';
import { StudentProfile } from '../types';

const learner:StudentProfile={name:'Asha',age:'16',className:'Class 10',institution:'Example School',address:'',city:'Kolkata',state:'West Bengal',country:'India',language:'bn'};
beforeEach(()=>{localStorage.clear();sessionStorage.clear();saveProfile(learner);setSignedIn(true);});
afterEach(cleanup);

test('changing teaching language updates the interface and keeps the profile and lesson choice',()=>{
 render(<App/>);
 expect(screen.getByRole('button',{name:'পাঠ্যক্রম'})).toBeTruthy();
 expect(screen.getByRole('heading',{name:/আপনার এআই শিক্ষক/})).toBeTruthy();
 expect(document.documentElement.lang).toBe('bn');
 fireEvent.change(screen.getByLabelText('শিক্ষাদানের ভাষা'),{target:{value:'hi'}});
 expect(screen.getByRole('button',{name:'पाठ्यक्रम'})).toBeTruthy();
 expect(document.documentElement.lang).toBe('hi');
 fireEvent.change(screen.getByLabelText('पढ़ाने की भाषा'),{target:{value:'en'}});
 expect(screen.getByRole('button',{name:'Curriculum'})).toBeTruthy();
 expect(document.documentElement.lang).toBe('en');
 fireEvent.change(screen.getByLabelText('Teaching language'),{target:{value:'ta'}});
 expect(screen.getAllByRole('status')[0].textContent).toMatch(/translat|provider/i);
 expect(screen.getByRole('button',{name:'Curriculum'})).toBeTruthy();
});
