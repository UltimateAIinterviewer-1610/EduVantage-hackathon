// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getAIConnection, removeAIConnection, saveAIConnection, testAIConnection, generateGeminiText, TEXT_MODEL } from '../services/aiConnection';
import AIProviderDialog from '../components/AIProviderDialog';
const mock=vi.hoisted(()=>({connect:vi.fn(),close:vi.fn(),generateContent:vi.fn()}));
vi.mock('@google/genai',()=>({Modality:{AUDIO:'AUDIO'},GoogleGenAI:class {live={connect:mock.connect};models={generateContent:mock.generateContent}}}));
beforeEach(()=>{localStorage.clear();sessionStorage.clear();vi.clearAllMocks();mock.generateContent.mockResolvedValue({text:'OK'});HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};});
afterEach(cleanup);
test('personal keys are scoped by profile and storage choice',()=>{
 expect(saveAIConnection('one','  ABC-123 \n',false)).toBe(true);
 expect(getAIConnection('one')).toMatchObject({key:'ABC-123',source:'session'});
 expect(getAIConnection('two').key).not.toBe('ABC-123');
 expect(saveAIConnection('one','NEW-456',true)).toBe(true);
 expect(getAIConnection('one')).toMatchObject({key:'NEW-456',source:'device'});
 expect(sessionStorage.length).toBe(0);
 removeAIConnection('one');expect(getAIConnection('one').key).not.toBe('NEW-456');
});
test('connection test sends one small request to the Gemini teaching model',async()=>{
 const result=await testAIConnection('test-key');
 expect(result.ok).toBe(true);
 expect(mock.generateContent).toHaveBeenCalledWith(expect.objectContaining({model:TEXT_MODEL,contents:'Reply with OK.',config:expect.objectContaining({maxOutputTokens:256})}));
 expect(mock.connect).not.toHaveBeenCalled();
 mock.generateContent.mockRejectedValueOnce(Object.assign(new Error('bad credentials with secret key'),{status:401}));
 expect((await testAIConnection('invalid-key')).message).not.toContain('secret key');
});
test('provider panel saves, tests, and removes a key without displaying it',async()=>{
 const changed=vi.fn();render(<AIProviderDialog profileId="student-1" onClose={()=>{}} onChanged={changed}/>);
 fireEvent.change(screen.getByLabelText('API key'),{target:{value:'PRIVATE-KEY-123'}});
 fireEvent.click(screen.getByRole('button',{name:'Save provider'}));
 expect(getAIConnection('student-1')).toMatchObject({key:'PRIVATE-KEY-123',source:'session'});
 expect(screen.queryByText('PRIVATE-KEY-123')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Test connection'}));
 await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('verified'));
 fireEvent.click(screen.getByRole('button',{name:'Remove provider'}));
 expect(getAIConnection('student-1').key).not.toBe('PRIVATE-KEY-123');
 expect(changed).toHaveBeenCalledTimes(2);
});

test('Gemini connection test times out without reporting success',async()=>{
 vi.useFakeTimers();
 try {
  mock.generateContent.mockImplementation((_request:{config:{abortSignal:AbortSignal}})=>new Promise((_resolve,reject)=>_request.config.abortSignal.addEventListener('abort',()=>reject(new Error('aborted')))));
  const result=testAIConnection('test-key');
  await vi.advanceTimersByTimeAsync(20001);
  expect(await result).toMatchObject({ok:false,message:expect.stringContaining('timed out')});
  expect(mock.connect).not.toHaveBeenCalled();
 } finally {vi.useRealTimers();}
});

test('Gemini key-only setup tests the model, persists, reloads, and generates teaching text',async()=>{
 mock.generateContent.mockResolvedValue({text:'A clear explanation'});
 const {unmount}=render(<AIProviderDialog profileId="student-1" onClose={()=>{}} onChanged={()=>{}}/>);
 expect(screen.queryByLabelText('Model ID *')).toBeNull();
 fireEvent.change(screen.getByLabelText('API key'),{target:{value:'GEMINI-KEY'}});
 fireEvent.click(screen.getByRole('button',{name:'Test connection'}));
 await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('verified'));
 fireEvent.click(screen.getByRole('checkbox'));
 fireEvent.click(screen.getByRole('button',{name:'Save provider'}));
 unmount();render(<AIProviderDialog profileId="student-1" onClose={()=>{}} onChanged={()=>{}}/>);
 expect(getAIConnection('student-1')).toMatchObject({provider:'gemini',key:'GEMINI-KEY',source:'device'});
 expect((screen.getByLabelText('API key') as HTMLInputElement).value).toBe('');
 expect(await generateGeminiText(getAIConnection('student-1').key,'Teach algebra')).toBe('A clear explanation');
 expect(mock.generateContent).toHaveBeenCalledWith(expect.objectContaining({model:TEXT_MODEL,contents:'Teach algebra'}));
});

test('Gemini text test distinguishes key, quota, and provider failures without echoing SDK messages',async()=>{
 for(const [status,expected] of [[401,'API key'],[429,'did not reveal which limit'],[500,'HTTP 500']] as const){
  mock.generateContent.mockRejectedValueOnce(Object.assign(new Error('PRIVATE-KEY and private lesson'),{status}));
  const result=await testAIConnection('PRIVATE-KEY');
  expect(result.ok).toBe(false);
  expect(result.message).toContain(expected);
  expect(result.message).not.toMatch(/PRIVATE-KEY|private lesson/);
 }
 expect(mock.generateContent).toHaveBeenCalledTimes(3);
});
