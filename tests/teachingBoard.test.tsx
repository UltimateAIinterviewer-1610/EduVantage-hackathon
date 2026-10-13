// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { parseTeachingStep } from '../services/teachingBoard';
import TeachingBoard from '../components/TeachingBoard';
import TextClassroom from '../components/TextClassroom';
import { COURSES, TEACHERS } from '../constants';
import { readHistory } from '../services/storage';

const lesson={title:'How learning happens',narration:'Imagine learning to ride a bicycle. Practice and feedback help you improve.',question:'What would feedback look like here?',blocks:[{kind:'definition',title:'Learning',items:['A lasting change through experience.']},{kind:'diagram',title:'A learning cycle',nodes:['Try','Receive feedback','Improve']},{kind:'table',title:'Compare approaches',columns:['Approach','Example'],rows:[['Practice','Ride a bicycle'],['Observation','Watch a demonstration']]}]};
const profile={id:'test-board',name:'Tester',age:'18',className:'Year 1',institution:'',address:'',city:'',state:'',country:'India',language:'en' as const};
const props={course:COURSES[0],teacher:TEACHERS[0],lessonPlan:{subject:'Education',chapter:'Learning',topic:'Learning theories',requirements:'Use diagrams'},student:profile,language:'en' as const,connection:{provider:'openai' as const,key:'mock-key',source:'session' as const},onExit:()=>{},onOpenProvider:()=>{}};
beforeEach(()=>{localStorage.clear();sessionStorage.clear();vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(lesson)}}]})}));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
test('structured board renders definitions, a process diagram and a comparison table without exposing JSON',()=>{
 render(<TeachingBoard step={parseTeachingStep(JSON.stringify(lesson),'Learning')}/>);
 fireEvent.click(screen.getByRole('button',{name:'Show next point →'}));
 fireEvent.click(screen.getByRole('button',{name:'Show next point →'}));
 expect(screen.getByRole('table',{name:'Compare approaches'})).toBeTruthy();
 expect(screen.getByRole('list',{name:'A learning cycle'})).toBeTruthy();
 expect(screen.queryByText(/"blocks"/)).toBeNull();
 expect(screen.getByText(lesson.question)).toBeTruthy();
});
test('invalid chart values are rejected; drawing coordinates are bounded and model markup stays inert',()=>{
 const step=parseTeachingStep(JSON.stringify({...lesson,blocks:[{kind:'chart',title:'Invalid',labels:['A'],values:[-99]},{kind:'drawing',title:'Sketch',shapes:[{type:'circle',x:-100,y:10000,width:99999,height:99999,label:'<script>alert(1)</script>'},{type:'script'}]}]}),'Topic');
 expect(step.blocks).toHaveLength(1);expect(step.blocks[0]).toMatchObject({kind:'drawing',shapes:[{x:0,y:240,width:480,height:30}]});
 const view=render(<TeachingBoard step={step}/>);expect(view.container.querySelector('script')).toBeNull();
});
test('plain-text providers keep a readable fallback without raw markdown headings',()=>{expect(parseTeachingStep('## Topic\n**Definition**\n- An example','Topic').blocks[0]).toMatchObject({items:['Topic','Definition','An example']});});
test('learner requirements stay in the teaching prompt and are never shown on the board',async()=>{
 render(<TextClassroom {...props}/>);
 const board=screen.getByRole('main',{name:'Teaching board'});
 expect(board.textContent).not.toContain(props.lessonPlan.requirements);
 fireEvent.click(screen.getByRole('button',{name:'Begin Class'}));
 await screen.findByRole('button',{name:'Show next point →'});
 expect(board.textContent).not.toContain(props.lessonPlan.requirements);
 const firstRequest=JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
 expect(firstRequest.messages[0].content).toContain(props.lessonPlan.requirements);
 expect(firstRequest.messages[1].content).not.toContain(props.lessonPlan.requirements);
 expect(fetch).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'Continue lesson →'}));
 await screen.findByText(/· 2 \/ 2/);
 expect(fetch).toHaveBeenCalledTimes(2);
});
test('teacher speaks narration only, stops speech on interruption, pages boards, and saves visuals with notes',async()=>{
 const speak=vi.fn(),cancel=vi.fn();vi.stubGlobal('speechSynthesis',{speak,cancel});vi.stubGlobal('SpeechSynthesisUtterance',class {text:string;constructor(text:string){this.text=text;}});
 render(<TextClassroom {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Begin Class'}));
 await screen.findByRole('button',{name:'Show next point →'});
 fireEvent.click(screen.getByRole('button',{name:'Show next point →'}));fireEvent.click(screen.getByRole('button',{name:'Show next point →'}));
 expect(screen.getByRole('table',{name:'Compare approaches'})).toBeTruthy();
 expect(speak.mock.calls[0][0].text).toBe(`${lesson.narration} ${lesson.question}`);
 expect(speak.mock.calls[0][0].text).not.toContain('"blocks"');
 act(()=>speak.mock.calls[0][0].onstart());expect(screen.getByText('Explaining')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Pause voice'}));expect(cancel).toHaveBeenCalled();expect(screen.getByText('Ready for your question')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Continue lesson →'}));await screen.findByText(/· 2 \/ 2/);
 fireEvent.click(screen.getByRole('button',{name:'← Previous board'}));expect(screen.getByText(/· 1 \/ 2/)).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Notebook & Conversation'}));fireEvent.change(screen.getByLabelText('Personal course notes'),{target:{value:'Practice needs feedback'}});
 fireEvent.click(screen.getByRole('button',{name:'Stop'}));expect(readHistory()[0].whiteboard?.[0].teachingStep?.blocks).toHaveLength(3);
 fireEvent.click(screen.getByRole('button',{name:'Begin Class'}));await screen.findByText(/· 1 \/ 1/);
 expect(localStorage.getItem(`edu_notes_${COURSES[0].id}`)).toBe('Practice needs feedback');
});
test('late provider replies are ignored after Stop and a new session can start',async()=>{
 let resolve:(value:any)=>void=()=>{};vi.mocked(fetch).mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 render(<TextClassroom {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Begin Class'}));fireEvent.click(screen.getByRole('button',{name:'Stop'}));
 await act(async()=>resolve({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(lesson)}}]})}));
 expect(within(screen.getByRole('main',{name:'Teaching board'})).queryByRole('table')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Begin Class'}));await screen.findByRole('button',{name:'Show next point →'});
 fireEvent.click(screen.getByRole('button',{name:'Show next point →'}));fireEvent.click(screen.getByRole('button',{name:'Show next point →'}));expect(screen.getByRole('table',{name:'Compare approaches'})).toBeTruthy();
});
test('turning voice off during a request prevents the pending explanation from playing',async()=>{
 const speak=vi.fn();vi.stubGlobal('speechSynthesis',{speak,cancel:vi.fn()});vi.stubGlobal('SpeechSynthesisUtterance',class {constructor(public text:string){}});
 let resolve:(value:any)=>void=()=>{};vi.mocked(fetch).mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 render(<TextClassroom {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Begin Class'}));fireEvent.click(screen.getByRole('button',{name:'Browser voice on'}));
 await act(async()=>resolve({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(lesson)}}]})}));
 expect(screen.getByRole('button',{name:'Show next point →'})).toBeTruthy();expect(speak).not.toHaveBeenCalled();
});
