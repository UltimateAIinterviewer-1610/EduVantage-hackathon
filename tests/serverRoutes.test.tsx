import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import ai from '../api/ai';
import liveToken from '../api/live-token';
import deleteAccount from '../api/delete-account';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { GROQ_TEACHING_MODELS } from '../services/providerCatalog';

function response() {
  const state = { code: 200, body: null as any, headers: {} as Record<string, string> };
  const res = {
    status(code: number) { state.code = code; return res; },
    setHeader(name: string, value: string) { state.headers[name] = value; return res; },
    json(body: unknown) { state.body = body; },
  };
  return { state, res };
}
beforeEach(() => { vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co'); vi.stubEnv('SUPABASE_ANON_KEY', 'public-key'); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

test('AI route rejects unauthenticated callers before contacting a provider', async () => {
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
  const { state, res } = response();
  await ai({ method: 'POST', headers: {}, body: { provider: 'openai', key: 'secret-value', model: 'gpt-4o-mini', messages: [] } }, res);
  expect(state.code).toBe(401);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('AI route forwards an authenticated OpenAI request without returning the key', async () => {
  const fetchMock = vi.fn(async (input: string) => input.includes('/auth/v1/user') ? new Response('{"id":"user-one"}', { status: 200 }) : new Response(JSON.stringify({ choices: [{ message: { content: 'Hello student' } }] }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  const { state, res } = response();
  await ai({ method: 'POST', headers: { authorization: 'Bearer learner-token' }, body: { provider: 'openai', key: 'secret-value', model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hello' }] } }, res);
  expect(state.code).toBe(200);
  expect(state.body).toEqual({ text: 'Hello student' });
  expect(JSON.stringify(state.body)).not.toContain('secret-value');
  expect(fetchMock.mock.calls[1][0]).toBe('https://api.openai.com/v1/chat/completions');
  expect(state.headers['Cache-Control']).toBe('no-store');
});

test('Live route issues a short-lived Gemini token for an authenticated learner', async () => {
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    if (input.includes('/auth/v1/user')) return new Response('{"id":"user-one"}', { status: 200 });
    const sent = JSON.parse(String(init?.body));
    expect(sent.uses).toBe(1);
    expect(new Date(sent.newSessionExpireTime).getTime()).toBeGreaterThan(Date.now());
    return new Response(JSON.stringify({ name: 'short-lived-token' }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  const { state, res } = response();
  await liveToken({ method: 'POST', headers: { authorization: 'Bearer learner-token' }, body: { key: 'gemini-secret' } }, res);
  expect(state.code).toBe(200);
  expect(state.body).toEqual({ token: 'short-lived-token' });
  expect(JSON.stringify(state.body)).not.toContain('gemini-secret');
});

test('account deletion targets only the authenticated learner after password confirmation', async () => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-only-secret');
  const fetchMock = vi.fn(async (input: string) => {
    if (input.includes('/auth/v1/user')) return new Response('{"id":"user-one","email":"student@example.com"}', { status: 200 });
    if (input.includes('/auth/v1/token')) return new Response('{"user":{"id":"user-one"}}', { status: 200 });
    return new Response(null, { status: 204 });
  });
  vi.stubGlobal('fetch', fetchMock);
  const first = response();
  await deleteAccount({ method: 'POST', headers: { authorization: 'Bearer learner-token' }, body: { confirmation: 'NO' } }, first.res);
  expect(first.state.code).toBe(400);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const second = response();
  await deleteAccount({ method: 'POST', headers: { authorization: 'Bearer learner-token' }, body: { confirmation: 'DELETE', password: 'password123' } }, second.res);
  expect(second.state.body).toEqual({ deleted: true });
  expect(fetchMock.mock.calls[3][0]).toContain('/auth/v1/admin/users/user-one');
});

test('deployment CSP permits the exact bundled file redirect script', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const html = readFileSync('index.html', 'utf8');
  const script = html.match(/<script id="file-launcher">([^<]+)<\/script>/)?.[1];
  expect(script).toBeTruthy();
  const hash = createHash('sha256').update(script).digest('base64');
  const policy = config.headers[0].headers.find((item: any) => item.key === 'Content-Security-Policy').value;
  expect(policy).toContain(`'sha256-${hash}'`);
});

const supportedRoutes = [
  {provider:'gemini',model:'gemini-3.8-flash',endpoint:'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'},
  {provider:'openai',model:'gpt-4o-mini',endpoint:'https://api.openai.com/v1/chat/completions'},
  {provider:'anthropic',model:'claude-haiku-4-5',endpoint:'https://api.anthropic.com/v1/messages'},
  {provider:'groq',model:'openai/gpt-oss-20b',endpoint:'https://api.groq.com/openai/v1/chat/completions'},
  {provider:'openrouter',model:'openai/gpt-4o-mini',endpoint:'https://openrouter.ai/api/v1/chat/completions'},
  {provider:'deepseek',model:'deepseek-flash',endpoint:'https://api.deepseek.com/chat/completions'},
  {provider:'mistral',model:'mistral-small-latest',endpoint:'https://api.mistral.ai/v1/chat/completions'},
  {provider:'together',model:'Qwen/Qwen3.5-9B',endpoint:'https://api.together.ai/v1/chat/completions'},
  {provider:'perplexity',model:'perplexity/sonar',endpoint:'https://api.perplexity.ai/v1/agent'},
] as const;
const providerResult=(provider:string)=>provider==='gemini'
  ? {candidates:[{content:{parts:[{text:'Teaching answer'}]}}]}
  : provider==='anthropic' ? {content:[{type:'text',text:'Teaching answer'}]}
  : provider==='perplexity' ? {status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'Teaching answer'}]}]}
  : {choices:[{message:{content:'Teaching answer'}}]};

test.each(supportedRoutes)('$provider authenticated route teaches through its fixed endpoint', async ({provider,model,endpoint})=>{
  const fetchMock=vi.fn(async (input:string, _init?:RequestInit)=>input.includes('/auth/v1/user')
    ? new Response('{"id":"learner"}',{status:200})
    : new Response(JSON.stringify(providerResult(provider)),{status:200}));
  vi.stubGlobal('fetch',fetchMock);
  const {state,res}=response();
  await ai({method:'POST',headers:{authorization:'Bearer learner-token'},body:{provider,key:'TEST-SECRET-KEY',model,
    prompt:'Teach algebra',messages:[{role:'system',content:'Teach clearly'},{role:'user',content:'Begin'}],maxTokens:900}},res);
  expect(state.code).toBe(200);expect(state.body).toEqual({text:'Teaching answer'});
  expect(fetchMock.mock.calls[1][0]).toBe(endpoint);
  const upstream=fetchMock.mock.calls[1][1] as RequestInit;
  expect(upstream.redirect).toBe('error');
  expect(JSON.stringify(state.body)).not.toContain('TEST-SECRET-KEY');
  if(provider==='perplexity')expect(JSON.parse(String(upstream.body))).toMatchObject({instructions:'Teach clearly',input:[{role:'user',content:'Begin'}],model,max_output_tokens:900,store:false});
  if(provider==='groq'||provider==='openai')expect(JSON.parse(String(upstream.body))).toMatchObject({max_completion_tokens:900});
});

test.each(supportedRoutes)('$provider server route preserves safe upstream failure details', async ({provider,model})=>{
 const fetchMock=vi.fn(async(input:string)=>input.includes('/auth/v1/user')
  ? new Response('{"id":"learner"}',{status:200})
  : new Response(JSON.stringify({error:{type:'model_not_found',message:'secret-value and private lesson'}}),{status:404,headers:{'x-request-id':'req_abcdef123456'}}));
 vi.stubGlobal('fetch',fetchMock);
 const {state,res}=response();
 await ai({method:'POST',headers:{authorization:'Bearer learner-token'},body:{provider,key:'secret-value',model,prompt:'private lesson',messages:[{role:'user',content:'private lesson'}]}},res);
 expect(state.code).toBe(404);
 expect(state.headers['X-Edu-Upstream-Status']).toBe('404');
 expect(state.headers['X-Edu-Upstream-Type']).toBe('model_not_found');
 expect(state.headers['X-Edu-Upstream-Request-Id']).toBe('req_abcdef123456');
 expect(JSON.stringify(state.body)).not.toMatch(/secret-value|private lesson/);
});

test('server connectivity failure is distinct from a provider HTTP 500 and never resends',async()=>{
 const fetchMock=vi.fn(async(input:string)=>input.includes('/auth/v1/user')
  ? new Response('{"id":"learner"}',{status:200}) : Promise.reject(new Error('secret-value')));
 vi.stubGlobal('fetch',fetchMock);
 const {state,res}=response();
 await ai({method:'POST',headers:{authorization:'Bearer learner-token'},body:{provider:'groq',key:'secret-value',model:'openai/gpt-oss-120b',messages:[{role:'user',content:'private lesson'}]}},res);
 expect(state.code).toBe(503);
 expect(state.headers['X-Edu-Upstream-Status']).toBeUndefined();
 expect(state.body.error).toContain('EduVantage could not reach');
 expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('a provider error inside HTTP 200 is not reported as successful teaching',async()=>{
 const fetchMock=vi.fn(async(input:string)=>input.includes('/auth/v1/user')
  ? new Response('{"id":"learner"}',{status:200})
  : new Response('{"error":{"type":"upstream_failed","message":"secret-value private lesson"}}',{status:200}));
 vi.stubGlobal('fetch',fetchMock);
 const {state,res}=response();
 await ai({method:'POST',headers:{authorization:'Bearer learner-token'},body:{provider:'openai',key:'secret-value',model:'gpt-4o-mini',messages:[{role:'user',content:'private lesson'}]}},res);
 expect(state.code).toBe(502);
 expect(state.body.error).toContain('upstream_failed');
 expect(JSON.stringify(state.body)).not.toMatch(/secret-value|private lesson/);
 expect(fetchMock).toHaveBeenCalledTimes(2);
});

test.each(GROQ_TEACHING_MODELS)('authenticated route accepts Groq teaching model $id only at its fixed endpoint',async({id})=>{
 const fetchMock=vi.fn(async(input:string,_init?:RequestInit)=>input.includes('/auth/v1/user')
  ? new Response('{"id":"learner"}',{status:200})
  : new Response(JSON.stringify(providerResult('groq')),{status:200}));
 vi.stubGlobal('fetch',fetchMock);
 const {state,res}=response();
 await ai({method:'POST',headers:{authorization:'Bearer learner-token'},body:{provider:'groq',key:'TEST-SECRET-KEY',model:id,messages:[{role:'user',content:'Teach fractions'}]}},res);
 expect(state.code).toBe(200);
 expect(fetchMock.mock.calls[1][0]).toBe('https://api.groq.com/openai/v1/chat/completions');
 expect(JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body)).model).toBe(id);
});

test.each(['whisper-large-v3','canopylabs/orpheus-v1-english','meta-llama/llama-prompt-guard-2-22m','openai/gpt-oss-safeguard-20b','retired-model'])('authenticated route rejects non-teaching Groq model %s before upstream request',async model=>{
 const fetchMock=vi.fn(async()=>new Response('{"id":"learner"}',{status:200}));vi.stubGlobal('fetch',fetchMock);
 const {state,res}=response();
 await ai({method:'POST',headers:{authorization:'Bearer learner-token'},body:{provider:'groq',key:'TEST-SECRET-KEY',model,messages:[{role:'user',content:'Teach fractions'}]}},res);
 expect(state.code).toBe(400);expect(state.body.error).toContain('Unsupported Groq teaching model');
 expect(fetchMock).toHaveBeenCalledTimes(1);
});

test.each([[403,'model access'],[404,'unavailable'],[498,'capacity'],[503,'temporarily unavailable']] as const)('authenticated Groq route preserves upstream HTTP %i meaning for the selected model',async(status,word)=>{
 const fetchMock=vi.fn(async(input:string)=>input.includes('/auth/v1/user')
  ? new Response('{"id":"learner"}',{status:200})
  : new Response('{"error":{"message":"TEST-SECRET-KEY"}}',{status}));vi.stubGlobal('fetch',fetchMock);
 const {state,res}=response();
 await ai({method:'POST',headers:{authorization:'Bearer learner-token'},body:{provider:'groq',key:'TEST-SECRET-KEY',model:'openai/gpt-oss-120b',messages:[{role:'user',content:'Teach fractions'}]}},res);
 expect(state.headers['X-Edu-Upstream-Status']).toBe(String(status));
 expect(state.body.error).toContain('openai/gpt-oss-120b');
 expect(state.body.error).toContain(word);
 expect(JSON.stringify(state.body)).not.toContain('TEST-SECRET-KEY');
});

test.each(['custom','evil','__proto__','constructor','toString'])('AI route rejects non-allowlisted %s', async provider=>{
  const fetchMock=vi.fn(async()=>new Response('{"id":"learner"}',{status:200}));vi.stubGlobal('fetch',fetchMock);
  const {state,res}=response();
  await ai({method:'POST',headers:{authorization:'Bearer learner-token'},body:{provider,key:'TEST-SECRET-KEY',model:'model',baseUrl:'https://attacker.example/v1',messages:[{role:'user',content:'Hello'}]}},res);
  expect(state.code).toBe(400);expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('allowlisted provider cannot redirect through a client URL, including with a valid provider name',async()=>{
  const fetchMock=vi.fn(async()=>new Response('{"id":"learner"}',{status:200}));vi.stubGlobal('fetch',fetchMock);
  const {state,res}=response();
  await ai({method:'POST',headers:{authorization:'Bearer learner-token'},body:{provider:'groq',key:'TEST-SECRET-KEY',model:'openai/gpt-oss-20b',url:'http://127.0.0.1/secrets',messages:[{role:'user',content:'Hello'}]}},res);
  expect(state.code).toBe(400);expect(fetchMock).toHaveBeenCalledTimes(1);
});

test.each([[402,'credits'],[404,'model'],[429,'quota']] as const)('authenticated route explains upstream HTTP %i without leaking keys',async(status,word)=>{
  const fetchMock=vi.fn(async(input:string)=>input.includes('/auth/v1/user')
    ? new Response('{"id":"learner"}',{status:200})
    : new Response('{"error":"TEST-SECRET-KEY"}',{status}));vi.stubGlobal('fetch',fetchMock);
  const {state,res}=response();
  await ai({method:'POST',headers:{authorization:'Bearer learner-token'},body:{provider:'groq',key:'TEST-SECRET-KEY',model:'openai/gpt-oss-20b',messages:[{role:'user',content:'Hello'}]}},res);
  expect(state.code).toBe(status);expect(state.body.error).toContain(word);expect(JSON.stringify(state.body)).not.toContain('TEST-SECRET-KEY');
});
