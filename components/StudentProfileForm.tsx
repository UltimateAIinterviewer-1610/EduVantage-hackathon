import { createId } from '../services/id';
import React, { useEffect, useState } from 'react';
import { StudentProfile, LanguageCode } from '../types';
import { COUNTRY_SUGGESTIONS, orderedLanguages, suggestedLanguages } from '../languages';
import { saveProfile } from '../services/profile';
import { useUi, UiKey } from '../uiText';
import { cloudConfigured } from '../services/cloud';
const blank: StudentProfile = {name:'',age:'',className:'',institution:'',address:'',city:'',state:'',country:'',language:'en'};
export default function StudentProfileForm({initial,onSave,buttonText='Save profile'}:{initial:StudentProfile|null;onSave:(profile:StudentProfile)=>void;buttonText?:string}) {
 const t=useUi();
 const [form,setForm]=useState<StudentProfile>(initial || blank);
 const [message,setMessage]=useState('');
 const [languageTouched,setLanguageTouched]=useState(Boolean(initial));
 useEffect(()=>{setForm(initial || blank);setLanguageTouched(Boolean(initial));},[initial]);
 const update=(key:keyof StudentProfile,value:string)=>{
  setMessage('');
  setForm(prev=>{
   const next={...prev,[key]:value};
   if(key==='country' && !languageTouched) next.language=suggestedLanguages(value)[1] || 'en';
   return next;
  });
 };
 const submit=(event:React.FormEvent)=>{
  event.preventDefault();
  const age=Number(form.age);
  if(form.age && (!Number.isInteger(age)||age<3||age>120)){setMessage(t('ageError'));return;}
  if(cloudConfigured && (!Number.isInteger(age) || age < 3 || form.country.trim().toLowerCase() !== 'india')){setMessage('Enter a learner age of at least 3 and select India for this account. A parent or guardian must own and manage a child’s account.');return;}
  try {
  const next={...form,id:form.id || createId(),name:form.name.trim(),country:form.country.trim()};
  if(!next.name||!next.country){setMessage(t('profileRequired'));return;}
  if(!saveProfile(next)){setMessage(t('profileSaveError'));return;}
  onSave(next);
  } catch { setMessage(t('profileSaveError')); }
 };
 const field=(key:keyof StudentProfile,label:UiKey,required=false,autocomplete?:string)=> <label className="profile-field" key={key}><span>{t(label)}{required&&' *'}</span><input value={form[key]} onChange={e=>update(key,e.target.value)} required={required} autoComplete={autocomplete} maxLength={key==='address'?180:80} type={key==='age'?'number':'text'} min={key==='age'?3:undefined} max={key==='age'?120:undefined}/></label>;
 return <form onSubmit={submit} className="profile-form space-y-5">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{field('name','fullName',true,'name')}{field('age','age',cloudConfigured)}{field('className','classYear')}{field('institution','institution')}</div>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{field('address','address')}{field('city','city')}{field('state','state')}
   <label className="profile-field"><span>{t('country')} *</span><input list="country-list" value={form.country} onChange={e=>update('country',e.target.value)} required autoComplete="country-name" maxLength={80}/><datalist id="country-list">{COUNTRY_SUGGESTIONS.map(c=><option value={c} key={c}/>)}</datalist></label>
  </div>
  <label className="profile-field"><span>{t('preferredLanguage')}</span><select value={form.language} onChange={e=>{setLanguageTouched(true);update('language',e.target.value as LanguageCode)}}>{orderedLanguages(form.country).map(l=><option key={l.code} value={l.code}>{form.language==='en'?`${l.label} (${l.nativeLabel})`:l.nativeLabel}</option>)}</select></label>
  <p className="text-sm text-slate-500">{t('englishAvailable')}</p>
  {message&&<p role="alert" className="text-sm text-rose-700">{message}</p>}
  <button className="primary-button w-full sm:w-auto" type="submit">{buttonText==='Save profile'?t('saveProfile'):buttonText}</button>
 </form>;
}
