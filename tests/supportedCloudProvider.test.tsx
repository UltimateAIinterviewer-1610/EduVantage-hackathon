// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { chatProviders } from './providerFixtures';

beforeEach(() => {
  vi.resetModules();vi.stubEnv('VITE_SUPABASE_URL','https://project.supabase.co');vi.stubEnv('VITE_SUPABASE_ANON_KEY','public-key');
  localStorage.clear();sessionStorage.clear();
});
afterEach(() => {vi.unstubAllEnvs();vi.unstubAllGlobals();});

test('Study Lab and Presentation Coach use the authenticated AI route with the selected provider',async()=>{
  const requests: RequestInit[] = [];
  const fetchMock=vi.fn(async(input:string,init?:RequestInit)=>{
    if(input.includes('/auth/v1/token'))return new Response(JSON.stringify({access_token:'access-one',refresh_token:'refresh-one',expires_in:3600,user:{id:'learner'}}),{status:200});
    if(input==='/api/ai'){
      requests.push(init||{});
      return new Response(JSON.stringify({text:requests.length===1?'The source explains photosynthesis [1].':JSON.stringify({opening:'Begin with a question',body:['Explain sunlight'],closing:'Summarize the idea',questions:['Why does it matter?']})}),{status:200});
    }
    throw new Error('Unexpected request');
  });vi.stubGlobal('fetch',fetchMock);
  const cloud=await import('../services/cloud');
  const study=await import('../services/studyAI');
  const coach=await import('../services/presentationCoach');
  await cloud.cloudSignIn('learner@example.com','password123');
  const connection={provider:'openai' as const,key:'TEST-SECRET-KEY',source:'session' as const};
  const source={id:'source-1',title:'Biology notes',kind:'textbook' as const,addedAt:1,chunks:[{id:'chunk-1',sourceId:'source-1',label:'Page 1 · section 1',text:'Photosynthesis converts sunlight into energy.'}]};
  expect((await study.askStudySources(connection,[source],'Explain photosynthesis','English')).citations).toHaveLength(1);
  const brief={title:'Photosynthesis',audience:'Class',durationMinutes:3,goal:'Explain the idea',keyPoints:'Sunlight'};
  expect((await coach.makePresentationPlan(connection,brief,'English')).opening).toContain('question');
  expect(requests).toHaveLength(2);
  for(const init of requests){
    expect(init.headers).toMatchObject({Authorization:'Bearer access-one'});
    expect(JSON.parse(String(init.body))).toMatchObject({provider:'openai',key:'TEST-SECRET-KEY'});
  }
});

test.each(chatProviders)('$provider uses the authenticated application API for tests and teaching',async({provider,model})=>{
  const fetchMock=vi.fn(async(input:string,init?:RequestInit)=>{
    if(input.includes('/auth/v1/token'))return new Response(JSON.stringify({access_token:'access-one',refresh_token:'refresh-one',expires_in:3600,user:{id:'learner'}}),{status:200});
    if(input==='/api/ai')return new Response(JSON.stringify({text:'Teaching answer'}),{status:200});
    throw new Error('Unexpected request');
  });vi.stubGlobal('fetch',fetchMock);
  const cloud=await import('../services/cloud');
  const ai=await import('../services/aiConnection');
  await cloud.cloudSignIn('learner@example.com','password123');
  const connection={provider,key:'TEST-SECRET-KEY',source:'session' as const};
  expect(await ai.testAIConnection(connection)).toMatchObject({ok:true});
  expect(await ai.sendAIChat(connection,[{role:'user',content:'Teach algebra'}])).toBe('Teaching answer');
  const requests=fetchMock.mock.calls.filter(([input])=>input==='/api/ai');
  expect(requests).toHaveLength(2);
  for(const [,init] of requests){
    const body=JSON.parse(String(init?.body));
    expect(body).toMatchObject({provider,model,key:'TEST-SECRET-KEY'});
    expect(body.baseUrl).toBeUndefined();
    expect(init?.headers).toMatchObject({Authorization:'Bearer access-one'});
  }
  expect(localStorage.getItem('edu_ai_connection_learner')).toBeNull();
});

test.each(chatProviders)('$provider authenticated test reports upstream failure without leaking provider text',async({provider,model})=>{
 const fetchMock=vi.fn(async(input:string)=>{
  if(input.includes('/auth/v1/token'))return new Response(JSON.stringify({access_token:'access-one',refresh_token:'refresh-one',expires_in:3600,user:{id:'learner'}}),{status:200});
  if(input==='/api/ai')return new Response('{"error":"redacted"}',{status:502,headers:{'X-Edu-Upstream-Status':'500','X-Edu-Upstream-Type':'internal_error','X-Edu-Upstream-Request-Id':'req_abcdef123456'}});
  throw new Error('Unexpected request');
 });vi.stubGlobal('fetch',fetchMock);
 const cloud=await import('../services/cloud');const ai=await import('../services/aiConnection');
 await cloud.cloudSignIn('learner@example.com','password123');
 const result=await ai.testAIConnection({provider,key:'TEST-SECRET-KEY',model,source:'session'});
 expect(result.ok).toBe(false);
 expect(result.message).toContain('HTTP 500');
 expect(result.message).toContain('internal_error');
 expect(result.message).toContain('req_abcdef123456');
 expect(result.message).not.toContain('TEST-SECRET-KEY');
 expect(fetchMock.mock.calls.filter(([input])=>input==='/api/ai')).toHaveLength(1);
});

test('authenticated custom settings remain browser-local and never use the server proxy',async()=>{
  const fetchMock=vi.fn(async(input:string)=>{
    if(input.includes('/auth/v1/token'))return new Response(JSON.stringify({access_token:'access-one',refresh_token:'refresh-one',expires_in:3600,user:{id:'learner'}}),{status:200});
    if(input==='https://custom.example/v1/chat/completions')return new Response(JSON.stringify({choices:[{message:{content:'Custom answer'}}]}));
    throw new Error('Unexpected request');
  });vi.stubGlobal('fetch',fetchMock);
  const cloud=await import('../services/cloud');const ai=await import('../services/aiConnection');
  await cloud.cloudSignIn('learner@example.com','password123');
  expect(ai.saveAIConnection('learner','CUSTOM-KEY',true,{provider:'custom',model:'old-model',baseUrl:'https://custom.example/v1',label:'My service'})).toBe(true);
  const saved=ai.getAIConnection('learner');
  expect(saved).toMatchObject({provider:'custom',model:'old-model',baseUrl:'https://custom.example/v1',source:'session'});
  expect(localStorage.getItem('edu_ai_connection_learner')).toBeNull();
  expect(await ai.sendAIChat(saved,[{role:'user',content:'Teach'}])).toBe('Custom answer');
  expect(fetchMock.mock.calls.some(([input])=>input==='/api/ai')).toBe(false);
});

test('authenticated Groq uses the selected model and reports upstream service, access, quota, and billing failures',async()=>{
 let next=new Response(JSON.stringify({text:'Teaching answer'}));
 const fetchMock=vi.fn(async(input:string,_init?:RequestInit)=>{
  if(input.includes('/auth/v1/token'))return new Response(JSON.stringify({access_token:'access-one',refresh_token:'refresh-one',expires_in:3600,user:{id:'learner'}}),{status:200});
  if(input==='/api/ai')return next;
  throw new Error('Unexpected request');
 });vi.stubGlobal('fetch',fetchMock);
 const cloud=await import('../services/cloud');const ai=await import('../services/aiConnection');
 await cloud.cloudSignIn('learner@example.com','password123');
 const connection={provider:'groq' as const,key:'TEST-SECRET-KEY',model:'openai/gpt-oss-120b',source:'session' as const};
 expect(await ai.testAIConnection(connection)).toMatchObject({ok:true,message:expect.stringContaining('openai/gpt-oss-120b')});
 const request=fetchMock.mock.calls.find(([input])=>input==='/api/ai');
 expect(JSON.parse(String(request?.[1]?.body)).model).toBe('openai/gpt-oss-120b');
 for(const [status,upstream,expected] of [[403,'403','model access'],[404,'404','unavailable'],[502,'503','temporarily unavailable'],[402,'402','credits']] as const){
  next=new Response('{"error":"redacted"}',{status,headers:{'X-Edu-Upstream-Status':upstream}});
  await expect(ai.sendAIChat(connection,[{role:'user',content:'Teach algebra'}])).rejects.toThrow(expected);
 }
 next=new Response('{"error":"redacted"}',{status:503});
 await expect(ai.sendAIChat(connection,[{role:'user',content:'Teach algebra'}])).rejects.toThrow(/EduVantage could not reach the provider from its server/);
 next=new Response('{"error":"redacted"}',{status:429,headers:{'X-Edu-Upstream-Status':'429','X-Edu-Limit-Kind':'unknown'}});
 await expect(ai.sendAIChat(connection,[{role:'user',content:'Teach algebra'}])).rejects.toThrow(/did not reveal which limit/);
 next=new Response('{"error":"redacted"}',{status:429,headers:{'X-Edu-Upstream-Status':'429','X-Edu-Limit-Kind':'daily','Retry-After':'60'}});
 await expect(ai.sendAIChat(connection,[{role:'user',content:'Teach algebra'}])).rejects.toThrow(/daily quota.*Retry after/);
 const count=fetchMock.mock.calls.filter(([input])=>input==='/api/ai').length;
 await expect(ai.sendAIChat(connection,[{role:'user',content:'Teach algebra'}])).rejects.toThrow(/daily quota/);
 expect(fetchMock.mock.calls.filter(([input])=>input==='/api/ai')).toHaveLength(count);
});
