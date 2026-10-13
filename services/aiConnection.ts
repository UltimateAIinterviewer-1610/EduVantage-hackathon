import { GoogleGenAI } from '@google/genai';
import { cloudConfigured, currentCloudSession } from './cloud';

import { AIProvider, LIVE_MODEL, TEXT_MODEL, PROVIDERS, isSupportedProvider, defaultModel, providerLabel, isGroqTeachingModel } from './providerCatalog';
import { ChatMessage, chatPayload, chatHeaders, chatText, providerError } from './providerProtocol';
import { assertProviderReady, providerLimit } from './providerLimits';
import { providerDiagnostics, diagnosticSuffix } from './providerDiagnostics';
export { LIVE_MODEL, TEXT_MODEL, defaultModel, providerLabel } from './providerCatalog';
export type { AIProvider } from './providerCatalog';
export type { ChatMessage } from './providerProtocol';

export type KeySource = 'session' | 'device' | 'deployment' | 'none';
export interface AIConnection { provider: AIProvider; key: string; model?: string; baseUrl?: string; label?: string; source: KeySource }
const keyName=(profileId:string)=>`edu_ai_connection_${profileId}`;
const savedName=(profileId:string)=>`edu_ai_saved_connections_${profileId}`;
const legacyKeyName=(profileId:string)=>`edu_gemini_key_${profileId}`;
const clean=(value:string)=>value.normalize('NFKC').replace(/[\s\u200B-\u200D\uFEFF]/g,'');
const fallback: AIConnection={provider:'gemini',key:'',source:'none'};
function parse(raw:string|null,source:KeySource):AIConnection|null {
 if(!raw)return null;
 try {const value=JSON.parse(raw);if(value&&(isSupportedProvider(value.provider)||value.provider==='custom')&&typeof value.key==='string'&&value.key)return {provider:value.provider,key:value.key,model:typeof value.model==='string'?value.model:undefined,baseUrl:typeof value.baseUrl==='string'?value.baseUrl:undefined,label:typeof value.label==='string'?value.label:undefined,source};}catch{}
 return raw.startsWith('{')?null:{provider:'gemini',key:raw,source};
}
const sameConnection=(a:AIConnection,b:AIConnection)=>a.provider===b.provider&&(a.model||'')===(b.model||'')&&(a.baseUrl||'')===(b.baseUrl||'');
function storedConnections(profileId:string,storage:Storage,source:KeySource):AIConnection[] {
 try {
  const values=JSON.parse(storage.getItem(savedName(profileId))||'[]');
  return Array.isArray(values)?values.map(value=>parse(JSON.stringify(value),source)).filter((item):item is AIConnection=>Boolean(item)):[];
 } catch{return [];}
}
function keepPrevious(profileId:string,connection:AIConnection):void {
 if(!connection.key||connection.source==='deployment'||connection.source==='none')return;
 const storage=connection.source==='device'?localStorage:sessionStorage;
 try {
  const saved=storedConnections(profileId,storage,connection.source).filter(item=>!sameConnection(item,connection));
  storage.setItem(savedName(profileId),JSON.stringify([...saved,connection].slice(-12)));
 } catch {}
}
export function connectedAIConnections(profileId:string):AIConnection[] {
 const active=getAIConnection(profileId);
 const values=[active,...storedConnections(profileId,sessionStorage,'session'),...(!cloudConfigured?storedConnections(profileId,localStorage,'device'):[])];
 return values.filter((item,index)=>item.key&&values.findIndex(other=>sameConnection(other,item))===index);
}
export function selectConnectedAIConnection(profileId:string,provider:AIProvider,model?:string,baseUrl?:string):boolean {
 const item=connectedAIConnections(profileId).find(value=>value.provider===provider&&(model===undefined||(value.model||'')===model)&&(baseUrl===undefined||(value.baseUrl||'')===baseUrl));
 if(!item)return false;
 if(sameConnection(item,getAIConnection(profileId)))return true;
 return saveAIConnection(profileId,item.key,item.source==='device',{provider:item.provider,model:item.model,baseUrl:item.baseUrl,label:item.label});
}
export function getAIConnection(profileId?:string):AIConnection {
 if(profileId){
  try {const saved=parse(sessionStorage.getItem(keyName(profileId)), 'session') || parse(sessionStorage.getItem(legacyKeyName(profileId)),'session');if(saved)return saved;}catch{}
  if (!cloudConfigured) try {const saved=parse(localStorage.getItem(keyName(profileId)), 'device') || parse(localStorage.getItem(legacyKeyName(profileId)),'device');if(saved)return saved;}catch{}
 }
 return fallback;
}
export function saveAIConnection(profileId:string,key:string,remember:boolean,options:Partial<Pick<AIConnection,'provider'|'model'|'baseUrl'|'label'>>={}):boolean {
 const cleaned=clean(key);
 if(!profileId||!cleaned)return false;
 const provider=options.provider || 'gemini';
 if(!isSupportedProvider(provider)&&provider!=='custom')return false;
 if(provider==='custom'&&!validCustomBaseUrl(options.baseUrl || ''))return false;
 if(provider!=='gemini'&&!(options.model || defaultModel(provider)).trim())return false;
 if(provider==='groq'&&!isGroqTeachingModel(options.model?.trim() || defaultModel(provider)))return false;
 const value=JSON.stringify({provider,key:cleaned,model:options.model?.trim() || defaultModel(provider),baseUrl:options.baseUrl?.trim(),label:options.label?.trim()});
 try {
  const previous=getAIConnection(profileId);
  const incoming=parse(value,remember&&!cloudConfigured?'device':'session');
  if(incoming&&previous.key&&!sameConnection(previous,incoming))keepPrevious(profileId,previous);
  if(remember&&!cloudConfigured){localStorage.setItem(keyName(profileId),value);sessionStorage.removeItem(keyName(profileId));}
  else {sessionStorage.setItem(keyName(profileId),value);localStorage.removeItem(keyName(profileId));}
  sessionStorage.removeItem(legacyKeyName(profileId));localStorage.removeItem(legacyKeyName(profileId));
  return true;
 } catch {return false;}
}
export function removeAIConnection(profileId:string):void {
 if(!profileId)return;
 for(const storage of [sessionStorage,localStorage])for(const key of [keyName(profileId),legacyKeyName(profileId),savedName(profileId)])try{storage.removeItem(key);}catch{}
}
export function keyHint(key:string):string{return key?`••••${key.slice(-4)}`:'';}
export function validCustomBaseUrl(value:string):boolean {
 try {const url=new URL(value);return !url.username&&!url.password&&!url.search&&!url.hash && (url.protocol==='https:' || (url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)));}catch{return false;}
}
function chatUrl(connection:AIConnection):string {
 if(isSupportedProvider(connection.provider))return PROVIDERS[connection.provider].endpoint;
 if(!validCustomBaseUrl(connection.baseUrl || ''))throw new Error('Enter a valid HTTPS API base URL (or a localhost URL).');
 const base=(connection.baseUrl || '').replace(/\/$/,'');
 return base.endsWith('/chat/completions')?base:`${base}/chat/completions`;
}
async function privateRequest(path:string,payload:unknown,connection:AIConnection,signal?:AbortSignal):Promise<string> {
 assertProviderReady(connection);
 const session=await currentCloudSession();
 if(!session)throw new Error('Sign in again to use your AI provider.');
 const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(payload),signal});
 if(!response.ok){
  if(response.status===401)throw new Error('Sign in again to use your AI provider.');
  const upstreamHeader=response.headers?.get?.('X-Edu-Upstream-Status');
  if(!upstreamHeader) {
   let serverMessage=''; try { const body=await response.json(); if(typeof body?.error==='string')serverMessage=body.error; } catch {}
   throw new Error(response.status===503?'EduVantage could not reach the provider from its server. No request was resent.':serverMessage || `EduVantage server returned HTTP ${response.status}. No request was resent.`);
  }
  const upstreamStatus=Number(upstreamHeader);
  if(upstreamStatus===200){
   let serverMessage='';try{const body=await response.json();if(typeof body?.error==='string')serverMessage=body.error;}catch{}
   throw new Error(serverMessage || 'The provider returned an unreadable or empty teaching response. No request was resent.');
  }
  const diagnostic={type:response.headers?.get?.('X-Edu-Upstream-Type') || null,requestId:response.headers?.get?.('X-Edu-Upstream-Request-Id') || null};
  const suffix=diagnosticSuffix(providerDiagnostics({error:{type:diagnostic.type,request_id:diagnostic.requestId}}));
  const limit=providerLimit(connection,upstreamStatus,response.headers?.get?.('X-Edu-Limit-Kind') || '',response.headers?.get?.('Retry-After') || null);
  if(limit){limit.message+=suffix;throw limit;}
  throw new Error(providerError(upstreamStatus,connection.provider,connection.model)+suffix);
 }
 const data=await response.json();
 if(typeof data?.text!=='string'||!data.text.trim())throw new Error('The provider returned no text.');
 return data.text.trim();
}
export async function generateGeminiText(key:string,prompt:string,options:{json?:boolean;maxTokens?:number;signal?:AbortSignal}={}):Promise<string> {
 const connection:AIConnection={provider:'gemini',key,model:TEXT_MODEL,source:'session'};
 if(cloudConfigured)return privateRequest('/api/ai',{provider:'gemini',key,model:TEXT_MODEL,prompt,json:options.json,maxTokens:options.maxTokens},connection,options.signal);
 assertProviderReady(connection);
 const ai=new GoogleGenAI({apiKey:key,httpOptions:{retryOptions:{attempts:1}}});
 let response;
 try { response=await ai.models.generateContent({model:TEXT_MODEL,contents:prompt,config:{responseMimeType:options.json?'application/json':undefined,maxOutputTokens:options.maxTokens,abortSignal:options.signal}}); }
 catch(error) {
  const status=Number((error as {status?:number})?.status);
  const metadata=error as {message?:string;headers?:Headers};
  const limit=providerLimit(connection,status,metadata.message || '',metadata.headers?.get?.('retry-after') || null);
  if(limit)throw limit;
  if(Number.isFinite(status)&&status>0)throw new Error(providerError(status,'gemini',TEXT_MODEL)+diagnosticSuffix(providerDiagnostics({error:{type:(error as {code?:unknown})?.code,request_id:(error as {requestId?:unknown})?.requestId}},metadata.headers)));
  if(options.signal?.aborted)throw new Error('Request cancelled.');
  throw new Error('Could not reach Gemini from this browser. Check the network or browser restrictions; no request was resent.');
 }
 if(!response.text?.trim())throw new Error('The AI provider returned no text.');
 return response.text.trim();
}
export async function getLiveAccessKey(key:string):Promise<string> {
 const connection:AIConnection={provider:'gemini',key,model:LIVE_MODEL,source:'session'};
 assertProviderReady(connection);
 if(!cloudConfigured)return key;
 const session=await currentCloudSession();
 if(!session)throw new Error('Sign in again to start a live class.');
 const response=await fetch('/api/live-token',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({key})});
 if(!response.ok)throw providerLimit(connection,response.status,response.headers?.get?.('X-Edu-Limit-Kind') || '',response.headers?.get?.('Retry-After') || null) || new Error('Could not prepare a secure live class. Check your Gemini key and try again.');
 const data=await response.json();
 if(typeof data?.token!=='string')throw new Error('The live class token was invalid.');
 return data.token;
}
export async function sendAIChat(connection:AIConnection,messages:ChatMessage[],signal?:AbortSignal,maxTokens=900):Promise<string> {
 if(!connection.key)throw new Error('Add an AI provider key before starting the class.');
 if(connection.provider==='gemini')return generateGeminiText(connection.key,messages.map(message=>`${message.role.toUpperCase()}: ${message.content}`).join('\n\n'),{maxTokens,signal});
 const model=connection.model || defaultModel(connection.provider);
 if(!model)throw new Error('Enter a model ID for this provider.');
 if(connection.provider==='groq'&&!isGroqTeachingModel(model))throw new Error(`Groq model ${model} is not in the supported teaching list. Choose and save another model in AI Provider; no request was sent.`);
 if(cloudConfigured&&connection.provider!=='custom')return privateRequest('/api/ai',{provider:connection.provider,key:clean(connection.key),model,messages,maxTokens},connection,signal);
 assertProviderReady(connection);
 const headers=chatHeaders(connection.provider,clean(connection.key),true);
 const body=chatPayload(connection.provider,model,messages,maxTokens);
 let response:Response;
 try {response=await fetch(chatUrl(connection),{method:'POST',headers,body:JSON.stringify(body),signal,redirect:'error'});}
 catch(error){if(signal?.aborted)throw new Error('Request cancelled.');throw new Error(connection.provider==='groq'?`Could not reach Groq model ${model} from this browser. Check the network and browser/CORS support, or test it from a signed-in hosted account. No model was changed and no request was resent.`:'Could not reach this provider from the browser. Check your network and the provider’s browser/CORS support. Supported providers can use a signed-in hosted account through the server; custom endpoints must allow browser access.');}
 if(!response.ok){
  let details='';let errorBody:unknown=null;try{errorBody=await response.json();details=JSON.stringify(errorBody).slice(0,4000);}catch{}
  const suffix=diagnosticSuffix(providerDiagnostics(errorBody,response.headers));
  const limit=providerLimit(connection,response.status,details,response.headers?.get?.('Retry-After') || null);
  if(limit){limit.message+=suffix;throw limit;}
  throw new Error(providerError(response.status,connection.provider,model)+suffix);
 }
 let data:any;try{data=await response.json();}catch{throw new Error('The provider returned an unreadable response.');}
 if(data?.error || data?.status==='failed')throw new Error(`The provider reported a failed request despite HTTP 200. No request was resent.${diagnosticSuffix(providerDiagnostics(data,response.headers))}`);
 const text=chatText(connection.provider,data);
 if(typeof text!=='string'||!text.trim())throw new Error('The provider returned no teaching text. Check its response format and model.');
 return text.trim();
}
export async function testAIConnection(input:string|AIConnection):Promise<{ok:boolean;message:string}> {
 const connection:AIConnection=typeof input==='string'?{provider:'gemini',key:input,source:'session'}:input;
 if(!connection.key)return {ok:false,message:'Enter an API key first.'};
 try {
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
  try {
   if(connection.provider==='gemini')await generateGeminiText(clean(connection.key),'Reply with OK.',{maxTokens:256,signal:controller.signal});
   else await sendAIChat(connection,[{role:'user',content:'Reply with OK.'}],controller.signal,256);
  } catch(error){if(controller.signal.aborted)throw new Error('timeout');throw error;}finally{clearTimeout(timeout);}
  return {ok:true,message:connection.provider==='gemini'?`Gemini text model ${TEXT_MODEL} connection verified. Live audio was not tested.`:`${providerLabel(connection.provider)}${connection.provider==='groq'?` model ${connection.model || defaultModel('groq')}`:''} connection verified.`};
 } catch(error){
  const message=error instanceof Error?error.message:'Connection failed.';
  return {ok:false,message:message==='timeout'?'Connection timed out. Check your network and try again.':message==='connection'?'Could not connect to Gemini Live. Check the key, model access and network.':message};
 }
}
