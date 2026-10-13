// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import Classroom from '../components/Classroom';
import { COURSES, TEACHERS } from '../constants';
import { readHistory } from '../services/storage';
import { createPcmBlob, decode } from '../services/audioProcessing';
import { saveAIConnection } from '../services/aiConnection';
const mock = vi.hoisted(() => ({ callbacks: null as any, config: null as any, send: vi.fn(), close: vi.fn(), trackStop: vi.fn() }));
vi.mock('@google/genai', () => ({ Type: {OBJECT:'OBJECT',STRING:'STRING'}, Modality:{AUDIO:'AUDIO'}, Behavior:{BLOCKING:'BLOCKING'}, GoogleGenAI: class {live = {connect: vi.fn(async (options:any) => {mock.callbacks=options.callbacks;mock.config=options.config; queueMicrotask(()=>options.callbacks.onopen()); return {sendRealtimeInput:mock.send,sendToolResponse:vi.fn(),close:mock.close};})}} }));
class Context {
 currentTime=0; destination={}; state='running';
 resume=vi.fn(async()=>{}); close=vi.fn(async()=>{});
 createMediaStreamSource=()=>({connect:vi.fn()});
 createScriptProcessor=()=>({connect:vi.fn(),disconnect:vi.fn(),onaudioprocess:null});
}
beforeEach(()=>{localStorage.clear();sessionStorage.clear();saveAIConnection('test-student','test-key',false);vi.clearAllMocks();vi.stubGlobal('AudioContext',Context);Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn(async()=>({getTracks:()=>[{stop:mock.trackStop}]}))}});});
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
const mount=()=>render(<Classroom course={COURSES[0]} teacher={TEACHERS[0]} onExit={()=>{}} student={{id:'test-student',name:'Learner',age:'',className:'',institution:'',address:'',city:'',state:'',country:'India',language:'en'}}/>);
const start=async()=>{fireEvent.click(screen.getByText('Begin Class'));await screen.findByText('Raise Hand');await act(async()=>{});};
test('notes persist and corrupt history is tolerated',()=>{localStorage.setItem('edu_history','broken');expect(readHistory()).toEqual([]);const r=mount();fireEvent.click(screen.getByText('Notebook'));fireEvent.change(screen.getByLabelText('Personal course notes'),{target:{value:'Study note'}});r.unmount();mount();fireEvent.click(screen.getByText('Notebook'));expect((screen.getByLabelText('Personal course notes') as HTMLTextAreaElement).value).toBe('Study note');});
test('live feed, hand state, explicit continuation, history, microphone cleanup and restart',async()=>{
 mount();await start();await act(async()=>{await mock.callbacks.onmessage({serverContent:{outputTranscription:{text:'Hello class'}}});});expect(screen.getAllByText('Hello class').length).toBeGreaterThan(0);
 fireEvent.click(screen.getByText('Raise Hand'));mock.send.mockClear();await act(async()=>{await mock.callbacks.onmessage({serverContent:{turnComplete:true}})});expect(mock.send).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Resume Lecture'));mock.send.mockClear();await act(async()=>{await mock.callbacks.onmessage({serverContent:{turnComplete:true}})});expect(mock.send).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Continue lesson →'}));expect(mock.send).toHaveBeenCalled();
 fireEvent.click(screen.getByText('Stop'));expect(mock.trackStop).toHaveBeenCalledTimes(1);expect(mock.close).toHaveBeenCalledTimes(1);expect(readHistory()).toHaveLength(1);expect(readHistory()[0].transcript?.[0].ai).toBe('Hello class');await start();fireEvent.click(screen.getByText('Stop'));expect(readHistory()).toHaveLength(2);
});
test('unexpected disconnect saves once and releases microphone',async()=>{const r=mount();await start();act(()=>mock.callbacks.onclose());expect(mock.trackStop).toHaveBeenCalledTimes(1);expect(readHistory()).toHaveLength(1);r.unmount();expect(readHistory()).toHaveLength(1);});
test('exit during microphone request stops late stream without connecting',async()=>{let resolve:any;(navigator.mediaDevices.getUserMedia as any).mockImplementation(()=>new Promise(r=>resolve=r));const r=mount();fireEvent.click(screen.getByText('Begin Class'));await waitFor(()=>expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled());r.unmount();await act(async()=>resolve({getTracks:()=>[{stop:mock.trackStop}]}));expect(mock.trackStop).toHaveBeenCalledTimes(1);expect(readHistory()).toHaveLength(0);});
test('permission failure is visible and retryable',async()=>{(navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(new DOMException('Denied','NotAllowedError'));mount();fireEvent.click(screen.getByText('Begin Class'));await screen.findByRole('alert');expect(screen.getByRole('alert').textContent).toContain('permission was denied');await start();});
test('PCM audio clamps peaks without sign wrapping',()=>{const bytes=decode(createPcmBlob(new Float32Array([-2,-1,0,1,2])).data);expect(Array.from(new Int16Array(bytes.buffer))).toEqual([-32768,-32768,0,32767,32767]);});
test('storage failure gives feedback without crashing notebook',()=>{const spy=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('Full')});try {mount();fireEvent.click(screen.getByRole('button',{name:'Notebook & Conversation'}));fireEvent.click(screen.getByText('Notebook'));expect(screen.getAllByRole('status').some(node=>node.textContent?.includes('Unable to save'))).toBe(true);} finally {spy.mockRestore();}});

test('archive review displays actual saved content and honest legacy fallback',async()=>{
 const {default:SessionReview}=await import('../components/SessionReview');
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
 HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
 const onClose=vi.fn();const record={id:'r',courseId:'c',courseTitle:'Review lesson',teacherName:'Teacher',timestamp:Date.now(),duration:42,videoUrl:'#',transcript:[{user:'Question',ai:''}],whiteboard:[{id:'b',type:'code' as const,content:'print(42)',timestamp:Date.now()}]};
 render(<SessionReview record={record} onClose={onClose}/>);
 expect(screen.getByText('print(42)')).toBeTruthy();expect(screen.getByText(/Question/)).toBeTruthy();expect(screen.getByText(/Audio and video were not recorded/)).toBeTruthy();fireEvent.click(screen.getByLabelText('Close session review'));expect(onClose).toHaveBeenCalledTimes(1);
});

test('planned topic and additional country language guide the live lesson',async()=>{
 const student={id:'test-student',name:'Learner',age:'16',className:'Year 10',institution:'',address:'',city:'',state:'',country:'Indonesia',language:'id' as const};
 render(<Classroom course={COURSES[0]} teacher={TEACHERS[0]} onExit={()=>{}} language="id" student={student} lessonPlan={{subject:'Science',chapter:'Forces',topic:'Motion',requirements:'Use simple diagrams'}}/>);
 await start();
 expect(mock.config.systemInstruction).toContain('TEACHING LANGUAGE: Indonesian');
 expect(mock.config.systemInstruction).toContain('SELECTED TOPIC: Motion');
 expect(mock.config.systemInstruction).toContain('Use simple diagrams');
 expect(mock.config.systemInstruction).not.toContain('Learner');
 expect(mock.config.systemInstruction).not.toContain('Age: 16');
});

test('live board tools render structured visuals and preserve them in session history',async()=>{
 mount();await start();
 const step={title:'Compare materials',narration:'Look at these two examples.',question:'Which one would you choose?',blocks:[{kind:'table',title:'Material comparison',columns:['Material','Property'],rows:[['Wood','Light'],['Steel','Strong']]}]};
 await act(async()=>{await mock.callbacks.onmessage({toolCall:{functionCalls:[{id:'visual-1',name:'updateWhiteboard',args:{topic:'Materials',content:'Look at these two examples.',type:'diagram',boardJson:JSON.stringify(step)}}]}});});
 expect(screen.getByRole('table',{name:'Material comparison'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Stop'}));expect(readHistory()[0].whiteboard?.[0].teachingStep).toEqual(step);
});
