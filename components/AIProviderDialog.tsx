import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { AIConnection, AIProvider, connectedAIConnections, defaultModel, getAIConnection, keyHint, providerLabel, removeAIConnection, saveAIConnection, selectConnectedAIConnection, testAIConnection, validCustomBaseUrl } from '../services/aiConnection';
import { useUi } from '../uiText';
import { GROQ_TEACHING_MODELS, MORE_PROVIDERS, isGroqTeachingModel } from '../services/providerCatalog';
import { cloudConfigured } from '../services/cloud';
export default function AIProviderDialog({profileId,onClose,onChanged}:{profileId:string;onClose:()=>void;onChanged:()=>void}) {
 const t=useUi();
 const dialog=useRef<HTMLDialogElement>(null);
 const [current,setCurrent]=useState(()=>getAIConnection(profileId));
 const [connected,setConnected]=useState(()=>connectedAIConnections(profileId));
 const [provider,setProvider]=useState<AIProvider>(()=>getAIConnection(profileId).provider);
 const [draft,setDraft]=useState('');
 const [visible,setVisible]=useState(false);
 const [remember,setRemember]=useState(()=>getAIConnection(profileId).source==='device');
 const [model,setModel]=useState(()=>getAIConnection(profileId).model || defaultModel(getAIConnection(profileId).provider));
 const [baseUrl,setBaseUrl]=useState(()=>getAIConnection(profileId).baseUrl || '');
 const [label,setLabel]=useState(()=>getAIConnection(profileId).label || '');
 const [status,setStatus]=useState('');
 const [busy,setBusy]=useState(false);
 const testVersion=useRef(0);
 const edited=()=>{testVersion.current++;setBusy(false);setStatus('');};
 useEffect(()=>{const previous=document.activeElement as HTMLElement;dialog.current?.showModal();return()=>{testVersion.current++;dialog.current?.close();previous?.focus();};},[]);
 const choose=(value:AIProvider)=>{
  edited();setProvider(value);setDraft('');
  // Switching away and back must not reset a saved model/custom endpoint.
  const saved=connected.find(item=>item.provider===value) || null;
  setModel(saved?.model || defaultModel(value));setBaseUrl(saved?.baseUrl || '');setLabel(saved?.label || '');
 };

 const savedGroqKey=provider==='groq'?(connected.find(item=>item.provider==='groq'&&item.model===model) || connected.find(item=>item.provider==='groq'))?.key || '':'';
 const candidate=():AIConnection=>({provider,key:draft || (current.provider===provider?current.key:savedGroqKey),model,baseUrl,label,source:'session'});
 const validate=():string|null=>{
  if(!candidate().key)return t('providerKeyError');
  if(provider!=='gemini'&&!model.trim())return t('providerModelError');
  if(provider==='groq'&&!isGroqTeachingModel(model))return 'This saved Groq model is no longer in the supported teaching list. Choose a listed model before testing or saving; your current connection is unchanged.';
  if(provider==='custom'&&!validCustomBaseUrl(baseUrl))return t('providerUrlError');
  return null;
 };
 const save=()=>{
  edited();
  const issue=validate();if(issue){setStatus(issue);return;}
  if(!saveAIConnection(profileId,candidate().key,remember,{provider,model,baseUrl,label})){setStatus(t('providerSaveError'));return;}
  setCurrent(getAIConnection(profileId));setConnected(connectedAIConnections(profileId));setDraft('');setStatus(t('providerSaved'));onChanged();
 };
 const test=async()=>{
  const issue=validate();if(issue){setStatus(issue);return;}
  const version=++testVersion.current;
  setBusy(true);setStatus(t('providerTesting',{provider:providerLabel(provider)}));
  const result=await testAIConnection(candidate());
  if(version===testVersion.current){setStatus(result.message);setBusy(false);}
 };

 const remove=()=>{edited();removeAIConnection(profileId);setCurrent(getAIConnection(profileId));setConnected([]);setDraft('');setStatus(t('providerRemoved'));onChanged();};
 const activate=(item:AIConnection)=>{
  edited();
  if(!selectConnectedAIConnection(profileId,item.provider,item.model,item.baseUrl)){setStatus('Could not select that saved provider.');return;}
  const next=getAIConnection(profileId);setCurrent(next);setConnected(connectedAIConnections(profileId));setProvider(next.provider);setModel(next.model||defaultModel(next.provider));setBaseUrl(next.baseUrl||'');setLabel(next.label||'');setDraft('');
  setStatus(`${providerLabel(next.provider)} selected for future AI requests. The failed request was not resent.`);onChanged();
 };
 return <dialog ref={dialog} onCancel={onClose} aria-labelledby="provider-title" className="provider-dialog rounded-3xl p-0 shadow-2xl">
  <header className="flex items-start justify-between gap-4 p-6 border-b"><div><p className="provider-accent text-xs font-bold uppercase tracking-widest">{t('classroomIntelligence')}</p><h2 id="provider-title" className="text-2xl font-black mt-1">{t('aiProvider')}</h2></div><button aria-label={t('closeProvider')} onClick={onClose} className="provider-icon-button p-2 rounded-xl"><X size={20}/></button></header>
  <div className="p-6 space-y-5"><p className="provider-muted text-sm">{t('providerIntro')}</p><p className="provider-muted text-sm">{t('simpleProviderSetup')}</p>
   <label className="profile-field"><span>{t('apiPlatform')}</span><select aria-label={t('apiPlatform')} value={provider} onChange={e=>choose(e.target.value as AIProvider)}><option value="gemini">Google Gemini Live</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic Claude</option><optgroup label={t('moreProviders')}>{MORE_PROVIDERS.map(value=><option key={value} value={value}>{providerLabel(value)}</option>)}</optgroup><optgroup label={t('advancedProvider')}><option value="custom">{t('otherCustomProvider')}</option></optgroup></select></label>
   <div className="provider-connection rounded-xl border p-4 text-sm"><strong>{t('currentConnection')}:</strong> {current.source==='none'?t('notConnected'):current.source==='deployment'?t('projectGemini'):`${providerLabel(current.provider)}${current.provider==='groq'?` · ${current.model||defaultModel('groq')}`:''} · ${current.source==='session'?t('thisSession'):t('remembered')} · ${keyHint(current.key)}`}</div>
   {connected.length>1&&<section aria-label="Connected providers" className="rounded-xl border p-4 text-sm space-y-3"><strong>Choose a connected provider or model</strong><p>Selecting another provider or saved model changes only future AI requests. Your next lesson, Study Lab, or Coach request will send its relevant work to that choice. Nothing is resent automatically.</p><div className="flex flex-wrap gap-2">{connected.filter(item=>item.provider!==current.provider||item.model!==current.model||item.baseUrl!==current.baseUrl).map(item=><button key={`${item.provider}:${item.model}:${item.baseUrl}`} type="button" className="rounded-lg border px-3 py-2 font-bold" onClick={()=>activate(item)}>Use {item.label||providerLabel(item.provider)}{item.provider==='groq'?` (${item.model||defaultModel('groq')})`:''} for future requests</button>)}</div></section>}
   {provider==='custom'&&<label className="profile-field"><span>{t('modelId')}</span><input aria-label={t('modelId')} value={model} onChange={e=>{setModel(e.target.value);edited();}} placeholder={provider==='custom'?t('modelId'):undefined}/></label>}
   {provider==='groq'&&<><label className="profile-field"><span>Groq teaching model</span><select aria-label="Groq teaching model" value={model} onChange={e=>{setModel(e.target.value);edited();}}>{!isGroqTeachingModel(model)&&<option value={model}>Previously saved model · {model} (unsupported)</option>}{GROQ_TEACHING_MODELS.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label><p className="provider-muted text-xs">Changing the model affects future requests only after you save. Test connection sends a short prompt to the selected Groq model and may use API quota or incur charges. Access and limits depend on your Groq account; no model is selected or tested automatically.</p></>}
   {provider==='gemini'&&<p className="provider-muted text-xs">Test connection sends one short request to Gemini's text teaching model. It does not test the separate live-audio classroom model.</p>}
   {provider==='custom'&&<><label className="profile-field"><span>{t('baseUrl')}</span><input aria-label={t('baseUrl')} type="url" value={baseUrl} onChange={e=>{setBaseUrl(e.target.value);edited();}} placeholder="https://api.example.com/v1"/></label><label className="profile-field"><span>{t('platformName')}</span><input aria-label={t('platformName')} value={label} onChange={e=>{setLabel(e.target.value);edited();}} placeholder="My AI service"/></label><p className="provider-muted text-xs">{t('customEndpointNotice')}</p></>}
   <label className="profile-field"><span>{t('apiKey')}</span><span className="flex items-stretch gap-2"><input type={visible?'text':'password'} aria-label={t('apiKey')} autoComplete="off" autoCapitalize="off" spellCheck={false} value={draft} onChange={e=>{setDraft(e.target.value);edited();}} placeholder={(current.provider===provider&&current.key)||savedGroqKey?t('keepKey'):t('pasteKey')}/><button aria-label={visible?t('hideKey'):t('showKey')} type="button" onClick={()=>setVisible(!visible)} className="provider-icon-button px-3 rounded-xl border">{visible?<EyeOff size={20}/>:<Eye size={20}/>}</button></span></label>
   {cloudConfigured?<p className="provider-muted text-sm">For account security, your provider key is kept only for this browser session and is not synced to your account.</p>:<label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="mt-1"/><span>{t('rememberKey')}</span></label>}
   <p className="provider-muted text-xs">{t('keyPrivacy')}</p>
   {status&&<p role="status" className={`text-sm ${status.includes('verified')?'provider-success':''}`}>{status}</p>}
   <div className="flex flex-wrap gap-3"><button type="button" className="primary-button" disabled={busy} onClick={save}>{t('saveProvider')}</button><button type="button" disabled={busy} onClick={test} className="provider-test px-4 py-3 rounded-xl border font-bold">{t(busy?'testing':'testConnection')}</button>{(current.source==='device'||current.source==='session')&&<button type="button" onClick={remove} className="provider-remove px-4 py-3 rounded-xl border font-bold">{t('removeProvider')}</button>}</div>
  </div>
 </dialog>;
}
