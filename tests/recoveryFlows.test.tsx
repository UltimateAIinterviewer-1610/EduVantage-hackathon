// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import TextClassroom from '../components/TextClassroom';
import StudyLab from '../components/StudyLab';
import PresentationCoach from '../components/PresentationCoach';
import { COURSES, TEACHERS } from '../constants';
import { UiProvider } from '../uiText';

const connection={provider:'openai' as const,key:'KEY',source:'session' as const};
const profile={id:'recover',name:'Learner',age:'18',className:'Year 1',institution:'',address:'',city:'',state:'',country:'India',language:'en' as const};
const lessonPlan={subject:'Math',chapter:'Numbers',topic:'Fractions',requirements:'Use examples'};
const renderUi=(element:React.ReactNode)=>render(<UiProvider language="en">{element}</UiProvider>);
beforeEach(()=>{localStorage.clear();sessionStorage.clear();});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});

test('classroom restores board, transcript and typed reply, then retains them after a rate limit',async()=>{
 const board=[{id:'b1',topic:'Fractions',subtopic:'Numbers',type:'text',content:'Half means one of two equal parts.',timestamp:1}];
 localStorage.setItem('edu_text_classroom_recover',JSON.stringify({course:COURSES[0],teacher:TEACHERS[0],lessonPlan,language:'en',active:true,input:'Could you give another example?',transcription:[{user:'',ai:'Half means one of two equal parts.'}],whiteboard:board,page:0,started:1,turns:[]}));
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{message:'requests per minute exceeded'}}),{status:429,headers:{'Retry-After':'30'}})));
 renderUi(<TextClassroom course={COURSES[0]} teacher={TEACHERS[0]} lessonPlan={lessonPlan} student={profile} language="en" connection={connection} onExit={()=>{}} onOpenProvider={()=>{}}/>);
 expect(screen.getByRole('main',{name:'Teaching board'}).textContent).toContain('Half means one of two equal parts.');
 expect((screen.getByRole('textbox',{name:'Ask your teacher'}) as HTMLInputElement).value).toContain('another example');
 fireEvent.click(screen.getByRole('button',{name:'Send question'}));
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('temporary rate limit'));
 expect(screen.getByRole('main',{name:'Teaching board'}).textContent).toContain('Half means one of two equal parts.');
 expect(JSON.parse(localStorage.getItem('edu_text_classroom_recover')!).transcription).toHaveLength(1);
});

test('Study Lab restores an answer and question and keeps them when a new request reaches daily quota',async()=>{
 const answer={text:'A prior answer',citations:[]};
 const question={prompt:'What is a fraction?',options:['A part','A color'],correctIndex:0,explanation:'It is a part.',difficulty:'foundation',citation:{sourceId:'s1',title:'Notes',label:'Page 1',excerpt:'A part'}};
 localStorage.setItem('edu_study_session_recover',JSON.stringify({query:'fraction',answer,question,selected:null,difficulty:'foundation'}));
 localStorage.setItem('edu_study_sources_recover',JSON.stringify([{id:'s1',title:'Notes',kind:'textbook',chunks:[{id:'c1',text:'A fraction is part of a whole.',label:'Page 1'}]}]));
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{message:'daily quota exhausted'}}),{status:429})));
 renderUi(<StudyLab profileId="recover" connection={connection} language="en" onOpenProvider={()=>{}}/>);
 expect(screen.getByText('A prior answer')).toBeTruthy();
 expect(screen.getByText('What is a fraction?')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Ask sources'}));
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('daily quota'));
 expect(screen.getByText('A prior answer')).toBeTruthy();
 expect(screen.getByText('What is a fraction?')).toBeTruthy();
});

test('Presentation Coach restores rehearsal progress and does not restart it after reload',()=>{
 const brief={title:'The water cycle',audience:'Class',durationMinutes:5,goal:'Explain',keyPoints:'Rain'};
 const plan={opening:'Why rain matters',body:['Clouds','Rain'],closing:'Water moves around',questions:['Where does rain go?']};
 localStorage.setItem('edu_coach_session_recover',JSON.stringify({phase:'rehearse',brief,plan,stage:1,questionIndex:0,followUp:'',segments:['Opening words','My main point','',''],elapsed:50,attempt:null,selfCheck:[]}));
 renderUi(<PresentationCoach profileId="recover" connection={connection} language="en" onOpenProvider={()=>{}}/>);
 expect(screen.getByDisplayValue('My main point')).toBeTruthy();
 expect(screen.getByLabelText('Elapsed time 00:50')).toBeTruthy();
});

test('Presentation Coach keeps a saved plan when refresh hits a billing error',async()=>{
 const brief={title:'The water cycle',audience:'Class',durationMinutes:5,goal:'Explain',keyPoints:'Rain'};
 const plan={opening:'Existing opening',body:['Clouds','Rain'],closing:'Existing closing',questions:['Where does rain go?']};
 localStorage.setItem('edu_coach_session_recover',JSON.stringify({phase:'setup',brief,plan,stage:0,segments:['','','',''],elapsed:0}));
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{message:'billing required'}}),{status:402})));
 renderUi(<PresentationCoach profileId="recover" connection={connection} language="en" onOpenProvider={()=>{}}/>);
 const refresh=screen.getByRole('button',{name:/Refresh/});fireEvent.click(refresh);
 await waitFor(()=>expect(screen.getByText(/credits or billing/)).toBeTruthy());
 expect(screen.getByText('Existing opening')).toBeTruthy();
});
