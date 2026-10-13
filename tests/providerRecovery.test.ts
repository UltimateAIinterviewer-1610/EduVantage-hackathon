// @vitest-environment jsdom
import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { connectedAIConnections, getAIConnection, saveAIConnection, selectConnectedAIConnection, sendAIChat } from '../services/aiConnection';
import { parseRetryAfter, providerLimit, readProviderWait } from '../services/providerLimits';
import { chatProviders } from './providerFixtures';

const messages=[{role:'user' as const,content:'Explain fractions'}];
beforeEach(()=>{localStorage.clear();sessionStorage.clear();});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

test.each([...chatProviders.map(item=>item.provider),'custom'])('%s blocks repeated requests during provider retry time, including after reload',async provider=>{
 const connection:any={provider,key:'SECRET',source:'session',model:provider==='groq'?'openai/gpt-oss-20b':'test-model',baseUrl:provider==='custom'?'https://example.org/v1':undefined};
 const request=vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{message:'Rate limit reached'}}),{status:429,headers:{'Retry-After':'60'}}));
 vi.stubGlobal('fetch',request);
 await expect(sendAIChat(connection,messages)).rejects.toThrow(/Retry after/);
 expect(readProviderWait(connection)?.retryAt).toBeGreaterThan(Date.now());
 await expect(sendAIChat(connection,messages)).rejects.toThrow(/Retry after/);
 expect(request).toHaveBeenCalledTimes(1);
 // A new module consumer after a page reload reads the same saved wait.
 expect(readProviderWait({...connection})).toBeTruthy();
});

test('daily quota, billing, and an unspecified 429 are reported without guessing',()=>{
 const connection:any={provider:'custom',model:'a',baseUrl:'https://example.org/v1'};
 expect(providerLimit(connection,429,'daily quota exhausted')?.message).toMatch(/daily quota/);
 expect(providerLimit(connection,402,'billing required')?.message).toMatch(/credits or billing/);
 const unknown=providerLimit(connection,429,'Too many calls');
 expect(unknown?.kind).toBe('unknown');
 expect(unknown?.message).toMatch(/did not reveal which limit/);
 expect(readProviderWait(connection)).toBeNull();
});

test('retry header accepts seconds and dates, rejects invalid or unreasonably long waits',()=>{
 const now=Date.now();
 expect(parseRetryAfter('30',now)).toBe(now+30000);
 expect(parseRetryAfter(new Date(now+60000).toUTCString(),now)).toBeGreaterThan(now);
 expect(parseRetryAfter('tomorrow',now)).toBeNull();
 expect(parseRetryAfter('999999999',now)).toBeNull();
 const connection:any={provider:'gemini'};
 expect(providerLimit(connection,429,JSON.stringify({error:{details:[{retryDelay:'12s'}]}}))?.retryAt).toBeGreaterThan(now);
});

test('a Groq model rate limit waits only on the selected model and never switches it',async()=>{
 const first:any={provider:'groq',key:'SECRET',source:'session',model:'openai/gpt-oss-20b'};
 const other:any={...first,model:'openai/gpt-oss-120b'};
 const request=vi.fn().mockResolvedValueOnce(new Response('{"error":{"message":"rate limit"}}',{status:429,headers:{'Retry-After':'60'}}))
  .mockResolvedValueOnce(new Response('{"choices":[{"message":{"content":"An explanation"}}]}'));
 vi.stubGlobal('fetch',request);
 await expect(sendAIChat(first,messages)).rejects.toThrow(/Groq model openai\/gpt-oss-20b.*Retry after/);
 expect(readProviderWait(first)).toBeTruthy();
 expect(readProviderWait(other)).toBeNull();
 await expect(sendAIChat(first,messages)).rejects.toThrow(/Retry after/);
 expect(request).toHaveBeenCalledTimes(1);
 expect(await sendAIChat(other,messages)).toBe('An explanation');
 expect(JSON.parse(request.mock.calls[1][1].body).model).toBe(other.model);
});

test('learner explicitly selects a previously connected provider without sending a request or changing key storage',()=>{
 expect(saveAIConnection('learner','KEY-A',false,{provider:'openai'})).toBe(true);
 expect(saveAIConnection('learner','KEY-B',true,{provider:'groq'})).toBe(true);
 expect(connectedAIConnections('learner').map(item=>item.provider)).toEqual(['groq','openai']);
 const request=vi.fn();vi.stubGlobal('fetch',request);
 expect(selectConnectedAIConnection('learner','openai')).toBe(true);
 expect(getAIConnection('learner')).toMatchObject({provider:'openai',key:'KEY-A',source:'session'});
 expect(request).not.toHaveBeenCalled();
 expect(connectedAIConnections('learner').map(item=>item.provider)).toEqual(['openai','groq']);
});
