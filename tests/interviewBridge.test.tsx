// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { practiceBrief, validInterviewerUrl } from '../services/interviewBridge';
import { saveProfile, setSignedIn } from '../services/profile';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('only a safe site origin is accepted for the interview handoff', () => {
  expect(validInterviewerUrl('https://www.ultimateaiinterviewer.in/')).toBe('https://www.ultimateaiinterviewer.in');
  expect(validInterviewerUrl('http://localhost:3000/')).toBe('http://localhost:3000');
  expect(validInterviewerUrl('http://example.com/')).toBeNull();
  expect(validInterviewerUrl('https://example.com/path')).toBeNull();
  expect(validInterviewerUrl('https://example.com/?key=secret')).toBeNull();
});

test('the practice brief contains only selected lesson context', () => {
  const result = practiceBrief({ id:'one', courseId:'course', courseTitle:'Science', teacherName:'Teacher', timestamp:1, duration:10, videoUrl:'', lessonPlan:{subject:'Biology',chapter:'Plants',topic:'Photosynthesis',requirements:'Private note'}, transcript:[{user:'Private answer',ai:'Reply'}] }, '');
  expect(result).toContain('Photosynthesis');
  expect(result).toContain('Biology');
  expect(result).not.toContain('Private note');
  expect(result).not.toContain('Private answer');
  expect(practiceBrief({ id:'one', courseId:'course', courseTitle:'Biology', teacherName:'Teacher', timestamp:1, duration:10, videoUrl:'' }, 'Data science')).not.toContain('Biology');
});

test('a learner can open interview and pitch practice from a saved lesson', () => {
  saveProfile({id:'learner',name:'Asha',age:'20',className:'University',institution:'College',address:'',city:'',state:'',country:'India',language:'en'});
  setSignedIn(true);
  localStorage.setItem('edu_history', JSON.stringify([{id:'lesson',courseId:'biology',courseTitle:'Biology',teacherName:'Teacher',timestamp:Date.now(),duration:60,videoUrl:'',lessonPlan:{subject:'Biology',chapter:'Plants',topic:'Photosynthesis',requirements:''}}]));
  render(<App/>);
  fireEvent.click(screen.getByRole('button',{name:'Archive'}));
  fireEvent.click(screen.getByRole('button',{name:'Practice this in interviews'}));
  expect((screen.getByRole('textbox',{name:'Your practice brief'}) as HTMLTextAreaElement).value).toContain('Photosynthesis');
  const interview = screen.getByRole('link',{name:'Open Ultimate AI Interviewer'});
  expect(interview.getAttribute('href')).toBe('https://www.ultimateaiinterviewer.in/');
  expect(interview.getAttribute('rel')).toBe('noopener noreferrer');
  expect(screen.getByRole('link',{name:/Open business pitch practice/}).getAttribute('href')).toBe('https://www.ultimateaiinterviewer.in/pitch-practice');
  fireEvent.change(screen.getByRole('textbox',{name:'Ultimate AI Interviewer website URL'}),{target:{value:'http://example.com/'}});
  expect(screen.queryByRole('link',{name:'Open Ultimate AI Interviewer'})).toBeNull();
  expect(screen.getByRole('alert').textContent).toContain('official HTTPS');
});
