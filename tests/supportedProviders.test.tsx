// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AIProviderDialog from '../components/AIProviderDialog';
import { getAIConnection, sendAIChat, testAIConnection } from '../services/aiConnection';
import { chatProviders, providerReply } from './providerFixtures';
import { GROQ_TEACHING_MODELS } from '../services/providerCatalog';

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const panel = () => render(<AIProviderDialog profileId="learner" onClose={()=>{}} onChanged={()=>{}}/>);
const lesson = [{ role: 'system' as const, content: 'Teach algebra' }, { role: 'user' as const, content: 'Explain equations' }];

test('Groq model choice is explicit, tested, saved, reloaded, and used for teaching',async()=>{
 const request=vi.fn().mockImplementation(async()=>new Response(JSON.stringify(providerReply('groq','A teaching explanation'))));
 vi.stubGlobal('fetch',request);
 panel();fireEvent.change(screen.getByLabelText('API platform'),{target:{value:'groq'}});
 const selector=screen.getByLabelText('Groq teaching model') as HTMLSelectElement;
 expect(selector.value).toBe('openai/gpt-oss-20b');
 expect([...selector.options].map(option=>option.value)).toEqual(GROQ_TEACHING_MODELS.map(item=>item.id));
 expect([...selector.options].map(option=>option.value).join(' ')).not.toMatch(/whisper|orpheus|guard|safeguard/);
 fireEvent.change(selector,{target:{value:'openai/gpt-oss-120b'}});
 expect(request).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('API key'),{target:{value:'TEST-SECRET-KEY'}});
 fireEvent.click(screen.getByRole('button',{name:'Test connection'}));
 await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('openai/gpt-oss-120b connection verified'));
 expect(JSON.parse(request.mock.calls[0][1].body).model).toBe('openai/gpt-oss-120b');
 fireEvent.click(screen.getByRole('checkbox'));
 fireEvent.click(screen.getByRole('button',{name:'Save provider'}));
 expect(request).toHaveBeenCalledTimes(1);
 expect(getAIConnection('learner')).toMatchObject({provider:'groq',model:'openai/gpt-oss-120b',source:'device'});
 cleanup();panel();
 expect((screen.getByLabelText('Groq teaching model') as HTMLSelectElement).value).toBe('openai/gpt-oss-120b');
 expect(await sendAIChat(getAIConnection('learner'),lesson)).toBe('A teaching explanation');
 expect(JSON.parse(request.mock.calls[1][1].body).model).toBe('openai/gpt-oss-120b');
});

test('old saved Groq settings remain selected without migration or automatic requests',async()=>{
 localStorage.setItem('edu_ai_connection_learner',JSON.stringify({provider:'groq',key:'OLD-GROQ-KEY',model:'openai/gpt-oss-20b'}));
 const request=vi.fn().mockResolvedValue(new Response(JSON.stringify(providerReply('groq','OK'))));vi.stubGlobal('fetch',request);
 panel();
 expect((screen.getByLabelText('Groq teaching model') as HTMLSelectElement).value).toBe('openai/gpt-oss-20b');
 expect(request).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Save provider'}));
 expect(getAIConnection('learner')).toMatchObject({provider:'groq',model:'openai/gpt-oss-20b',key:'OLD-GROQ-KEY',source:'device'});
 expect(request).not.toHaveBeenCalled();
 expect(await sendAIChat(getAIConnection('learner'),lesson)).toBe('OK');
 expect(JSON.parse(request.mock.calls[0][1].body).model).toBe('openai/gpt-oss-20b');
});

test('unsupported saved Groq model is preserved but cannot be tested or resent',async()=>{
 localStorage.setItem('edu_ai_connection_learner',JSON.stringify({provider:'groq',key:'OLD-GROQ-KEY',model:'retired-model'}));
 const request=vi.fn();vi.stubGlobal('fetch',request);
 panel();
 expect((screen.getByLabelText('Groq teaching model') as HTMLSelectElement).value).toBe('retired-model');
 fireEvent.click(screen.getByRole('button',{name:'Test connection'}));
 expect(screen.getByRole('status').textContent).toContain('no longer in the supported teaching list');
 expect(getAIConnection('learner').model).toBe('retired-model');
 expect(request).not.toHaveBeenCalled();
 await expect(sendAIChat(getAIConnection('learner'),lesson)).rejects.toThrow(/not in the supported teaching list/);
});

test('saved Groq models are clearly distinguished and learner selection never sends a request',()=>{
 sessionStorage.setItem('edu_ai_connection_learner',JSON.stringify({provider:'groq',key:'GROQ-KEY',model:'openai/gpt-oss-120b'}));
 sessionStorage.setItem('edu_ai_saved_connections_learner',JSON.stringify([{provider:'groq',key:'GROQ-KEY',model:'openai/gpt-oss-20b'}]));
 const request=vi.fn();vi.stubGlobal('fetch',request);
 panel();
 fireEvent.click(screen.getByRole('button',{name:'Use Groq (openai/gpt-oss-20b) for future requests'}));
 expect(getAIConnection('learner').model).toBe('openai/gpt-oss-20b');
 expect(screen.getByRole('status').textContent).toContain('failed request was not resent');
 expect(request).not.toHaveBeenCalled();
});

test.each(chatProviders)('$provider key-only selection, generation test, saved reload, and teaching', async ({provider, model, endpoint}) => {
  const request = vi.fn().mockImplementation(async () => new Response(JSON.stringify(providerReply(provider, 'A teaching explanation'))));
  vi.stubGlobal('fetch', request);
  panel();
  expect(screen.getByRole('group', { name: 'More AI providers' })).toBeTruthy();
  fireEvent.change(screen.getByLabelText('API platform'), { target: { value: provider } });
  expect(screen.queryByLabelText('Model ID *')).toBeNull();
  expect(screen.queryByLabelText('OpenAI-compatible API base URL *')).toBeNull();
  expect(screen.queryByLabelText('Platform name')).toBeNull();
  fireEvent.change(screen.getByLabelText('API key'), { target: { value: ' TEST-SECRET-KEY ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('connection verified'));
  expect(request.mock.calls[0][0]).toBe(endpoint);
  const settings = request.mock.calls[0][1];
  expect(JSON.parse(settings.body).model).toBe(model);
  expect(JSON.parse(settings.body)[provider==='groq'||provider==='openai'?'max_completion_tokens':provider==='perplexity'?'max_output_tokens':'max_tokens']).toBe(256);
  expect(settings.headers[provider === 'anthropic' ? 'x-api-key' : 'Authorization']).toBe(provider === 'anthropic' ? 'TEST-SECRET-KEY' : 'Bearer TEST-SECRET-KEY');
  expect(localStorage.getItem('edu_ai_connection_learner')).toBeNull();
  expect(sessionStorage.getItem('edu_ai_connection_learner')).toBeNull(); // Test never saves.
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Save provider' }));
  expect(getAIConnection('learner')).toMatchObject({provider, model, key:'TEST-SECRET-KEY', source:'device'});
  cleanup(); panel();
  expect((screen.getByLabelText('API platform') as HTMLSelectElement).value).toBe(provider);
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
  expect((screen.getByLabelText('API key') as HTMLInputElement).value).toBe('');
  expect(await sendAIChat(getAIConnection('learner'), lesson)).toBe('A teaching explanation');
  expect(request.mock.calls[1][0]).toBe(endpoint);
  const teaching = JSON.parse(request.mock.calls[1][1].body);
  if (provider === 'perplexity') expect(teaching).toMatchObject({instructions:'Teach algebra',input:[lesson[1]],store:false,max_output_tokens:900});
  else if (provider === 'anthropic') expect(teaching).toMatchObject({system:'Teach algebra',messages:[lesson[1]]});
  else expect(teaching.messages).toEqual(lesson);
  expect(JSON.stringify(teaching)).not.toContain('TEST-SECRET-KEY');
});

test.each(chatProviders)('$provider does not report success on auth, model, quota, network, or empty failures', async ({provider}) => {
  const request=vi.fn(); vi.stubGlobal('fetch',request);
  for (const [status, expected] of [[401,'API key'],[402,'credits'],[404,'model'],[429,'quota'],[503,'temporarily']] as const) {
    request.mockResolvedValueOnce(new Response(JSON.stringify({error:{message:'TEST-SECRET-KEY'}}),{status}));
    const result=await testAIConnection({provider,key:'TEST-SECRET-KEY',source:'session'});
    expect(result.ok).toBe(false);expect(result.message).toContain(expected);expect(result.message).not.toContain('TEST-SECRET-KEY');
  }
  request.mockRejectedValueOnce(new Error('TEST-SECRET-KEY'));
  expect(await testAIConnection({provider,key:'TEST-SECRET-KEY',source:'session'})).toMatchObject({ok:false,message:expect.stringContaining('browser/CORS')});
  request.mockResolvedValueOnce(new Response(JSON.stringify(providerReply(provider,''))));
  expect((await testAIConnection({provider,key:'TEST-SECRET-KEY',source:'session'})).ok).toBe(false);
  request.mockResolvedValueOnce(new Response(JSON.stringify({error:{message:'TEST-SECRET-KEY'},...providerReply(provider,'fake success')})));
  expect((await testAIConnection({provider,key:'TEST-SECRET-KEY',source:'session'})).ok).toBe(false);
});

test.each(chatProviders)('$provider browser error retains only safe type and request ID',async({provider,model})=>{
 const request=vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{type:'model_not_found',message:'TEST-SECRET-KEY; private lesson'}}),{status:404,headers:{'x-request-id':'req_abcdef123456'}}));
 vi.stubGlobal('fetch',request);
 const result=await testAIConnection({provider,key:'TEST-SECRET-KEY',model,source:'session'});
 expect(result.ok).toBe(false);
 expect(result.message).toContain('model_not_found');
 expect(result.message).toContain('req_abcdef123456');
 expect(result.message).not.toMatch(/TEST-SECRET-KEY|private lesson/);
 expect(request).toHaveBeenCalledTimes(1);
});

test('saved Together AI model is retained even when the new default changes',async()=>{
 localStorage.setItem('edu_ai_connection_learner',JSON.stringify({provider:'together',key:'OLD-KEY',model:'meta-llama/Llama-3.3-70B-Instruct-Turbo'}));
 const request=vi.fn().mockResolvedValue(new Response(JSON.stringify(providerReply('together','Saved model answer'))));vi.stubGlobal('fetch',request);
 expect(await sendAIChat(getAIConnection('learner'),lesson)).toBe('Saved model answer');
 expect(JSON.parse(request.mock.calls[0][1].body).model).toBe('meta-llama/Llama-3.3-70B-Instruct-Turbo');
});

test.each(['session','device'] as const)('saved custom %s connection survives selection changes, testing, saving and reload', async source => {
  const storage=source==='device'?localStorage:sessionStorage;
  const saved={provider:'custom',key:'CUSTOM-KEY',model:'my-legacy-model',baseUrl:'https://custom.example/v2/chat/completions',label:'My private platform'};
  storage.setItem('edu_ai_connection_learner',JSON.stringify(saved));
  const request=vi.fn().mockResolvedValue(new Response(JSON.stringify(providerReply('custom','Legacy model reply')))); vi.stubGlobal('fetch',request);
  panel();
  fireEvent.change(screen.getByLabelText('API platform'),{target:{value:'groq'}});
  fireEvent.change(screen.getByLabelText('API platform'),{target:{value:'custom'}});
  expect((screen.getByLabelText('Model ID *') as HTMLInputElement).value).toBe(saved.model);
  expect((screen.getByLabelText('OpenAI-compatible API base URL *') as HTMLInputElement).value).toBe(saved.baseUrl);
  expect(screen.getByDisplayValue(saved.label)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Test connection'}));
  await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('verified'));
  expect(request.mock.calls[0][0]).toBe(saved.baseUrl);
  fireEvent.click(screen.getByRole('button',{name:'Save provider'}));
  cleanup();panel();
  expect(getAIConnection('learner')).toEqual({...saved,source});
  expect(JSON.parse(storage.getItem('edu_ai_connection_learner')!)).toEqual(saved);
});

test('previously saved OpenAI model and storage choice are retained with key-only editing', () => {
  localStorage.setItem('edu_ai_connection_learner',JSON.stringify({provider:'openai',key:'OLD-KEY',model:'gpt-4.1-mini'}));
  panel();
  fireEvent.change(screen.getByLabelText('API platform'),{target:{value:'mistral'}});
  fireEvent.change(screen.getByLabelText('API platform'),{target:{value:'openai'}});
  fireEvent.change(screen.getByLabelText('API key'),{target:{value:'NEW-KEY'}});
  fireEvent.click(screen.getByRole('button',{name:'Save provider'}));
  expect(getAIConnection('learner')).toMatchObject({provider:'openai',model:'gpt-4.1-mini',key:'NEW-KEY',source:'device'});
});

test('changing provider while a test is pending cannot show stale success', async () => {
  let finish!:(value:Response)=>void;
  vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;})));
  panel();fireEvent.change(screen.getByLabelText('API platform'),{target:{value:'groq'}});
  fireEvent.change(screen.getByLabelText('API key'),{target:{value:'FIRST-KEY'}});
  fireEvent.click(screen.getByRole('button',{name:'Test connection'}));
  fireEvent.change(screen.getByLabelText('API platform'),{target:{value:'mistral'}});
  finish(new Response(JSON.stringify(providerReply('groq','OK'))));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Test connection'})).toBeTruthy());
  expect(screen.queryByRole('status')).toBeNull();
});
