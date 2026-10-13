// @vitest-environment jsdom
import React from 'react';
import { chatProviders, providerReply } from './providerFixtures';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { getAIConnection, saveAIConnection, sendAIChat, testAIConnection } from '../services/aiConnection';
import AIProviderDialog from '../components/AIProviderDialog';
import TextClassroom from '../components/TextClassroom';
import { COURSES, TEACHERS } from '../constants';
import { StudentProfile } from '../types';
const profile:StudentProfile={id:'student-1',name:'Learner',age:'18',className:'Year 1',institution:'School',address:'',city:'',state:'',country:'India',language:'en'};
const message=[{role:'system' as const,content:'Teach algebra'},{role:'user' as const,content:'Explain equations'}];
beforeEach(()=>{localStorage.clear();sessionStorage.clear();vi.restoreAllMocks();HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};});
afterEach(cleanup);
test('OpenAI sends chat completions to its API and reads the reply',async()=>{
 const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({choices:[{message:{content:'An equation balances both sides.'}}]})});vi.stubGlobal('fetch',fetch);
 const connection={provider:'openai' as const,key:'secret',source:'session' as const};
 expect(await sendAIChat(connection,message)).toContain('balances');
 const [url,options]=fetch.mock.calls[0];expect(url).toBe('https://api.openai.com/v1/chat/completions');expect(options.headers.Authorization).toBe('Bearer secret');expect(JSON.parse(options.body)).toMatchObject({model:'gpt-4o-mini',messages:message});
});
test('Anthropic maps the system message and parses content blocks',async()=>{
 const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({content:[{type:'text',text:'Balance the two sides.'}]})});vi.stubGlobal('fetch',fetch);
 const connection={provider:'anthropic' as const,key:'claude-secret',source:'session' as const};
 expect(await sendAIChat(connection,message)).toContain('Balance');
 const [url,options]=fetch.mock.calls[0];expect(url).toBe('https://api.anthropic.com/v1/messages');expect(options.headers['x-api-key']).toBe('claude-secret');expect(options.headers['anthropic-dangerous-direct-browser-access']).toBe('true');expect(JSON.parse(options.body)).toMatchObject({system:'Teach algebra',messages:[message[1]]});
});
test('custom connection requires a safe endpoint and calls an OpenAI-compatible model',async()=>{
 expect(saveAIConnection('student-1','secret',false,{provider:'custom',baseUrl:'http://example.com/v1',model:'model-x'})).toBe(false);
 expect(saveAIConnection('student-1','secret',false,{provider:'custom',baseUrl:'https://api.example.com/v1',model:'model-x'})).toBe(true);
 const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({choices:[{message:{content:'Hello student'}}]})});vi.stubGlobal('fetch',fetch);
 expect(await sendAIChat(getAIConnection('student-1'),message)).toBe('Hello student');
 expect(fetch.mock.calls[0][0]).toBe('https://api.example.com/v1/chat/completions');
});
test('provider errors do not reveal credentials and test calls the selected provider',async()=>{
 const fetch=vi.fn().mockResolvedValue({ok:false,status:401});vi.stubGlobal('fetch',fetch);
 const connection={provider:'openai' as const,key:'TOP-SECRET',source:'session' as const};
 const result=await testAIConnection(connection);expect(result.ok).toBe(false);expect(result.message).not.toContain('TOP-SECRET');
});
test('provider panel allows selecting and saving a custom platform',()=>{
 render(<AIProviderDialog profileId="student-1" onClose={()=>{}} onChanged={()=>{}}/>);
 fireEvent.change(screen.getByLabelText('API platform'),{target:{value:'custom'}});
 fireEvent.change(screen.getByLabelText('Model ID *'),{target:{value:'model-x'}});
 fireEvent.change(screen.getByLabelText('OpenAI-compatible API base URL *'),{target:{value:'https://api.example.com/v1'}});
 fireEvent.change(screen.getByLabelText('API key'),{target:{value:'my-key'}});
 fireEvent.click(screen.getByRole('button',{name:'Save provider'}));
 expect(getAIConnection('student-1')).toMatchObject({provider:'custom',model:'model-x',baseUrl:'https://api.example.com/v1',key:'my-key'});
});
test.each(chatProviders)('$provider classroom teaches, accepts a question, and saves a completed session',async({provider})=>{
 const fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>providerReply(provider,'First explanation')}).mockResolvedValueOnce({ok:true,json:async()=>providerReply(provider,'Second explanation')});vi.stubGlobal('fetch',fetch);
 const connection={provider,key:'secret',source:'session' as const};
 render(<TextClassroom course={COURSES[0]} teacher={TEACHERS[0]} lessonPlan={{subject:'Science',chapter:'Energy',topic:'Solar energy',requirements:'Use examples'}} student={profile} language="en" connection={connection} onExit={()=>{}} onOpenProvider={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Begin Class'}));
 await waitFor(()=>expect(within(screen.getByRole('main',{name:'Teaching board'})).getByText('First explanation',{selector:'li'})).toBeTruthy());
 fireEvent.change(screen.getByLabelText('Ask your teacher'),{target:{value:'How does it work?'}});fireEvent.click(screen.getByRole('button',{name:'Send question'}));
 await waitFor(()=>expect(within(screen.getByRole('main',{name:'Teaching board'})).getByText('Second explanation',{selector:'li'})).toBeTruthy());
 fireEvent.click(screen.getByRole('button',{name:'Notebook & Conversation'}));
 fireEvent.change(screen.getByLabelText('Personal course notes'),{target:{value:'My notes'}});
 fireEvent.click(screen.getByRole('button',{name:'Stop'}));
 expect(JSON.parse(localStorage.getItem('edu_history')||'[]')[0]).toMatchObject({courseTitle:COURSES[0].title,lessonPlan:{topic:'Solar energy'}});
 expect(localStorage.getItem(`edu_notes_${COURSES[0].id}`)).toBe('My notes');
});
