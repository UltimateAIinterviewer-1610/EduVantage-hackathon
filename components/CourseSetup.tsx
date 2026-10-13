import React, { useMemo, useState } from 'react';
import { Course, LanguageCode, StudentProfile } from '../types';
import { chaptersFor, subjectsFor, LessonPlan } from '../learningPaths';
import { orderedLanguages } from '../languages';
import { useDisplayText, useUi } from '../uiText';
import { recommendedTeachingBrief } from '../recommendedCourses';
export default function CourseSetup({course,profile,language,onLanguage,onStart,onBack,onOpenProvider,hasAIKey}:{course:Course;profile:StudentProfile;language:LanguageCode;onLanguage:(value:LanguageCode)=>void;onStart:(plan:LessonPlan)=>void;onBack:()=>void;onOpenProvider?:()=>void;hasAIKey?:boolean}) {
 const t=useUi();
 const display=useDisplayText();
 const isCustomCourse=course.id.startsWith('custom-');
 const subjects=useMemo(()=>subjectsFor(course),[course]);
 const [subject,setSubject]=useState<string>(isCustomCourse?course.title:subjects[0]);
 const [customSubject,setCustomSubject]=useState(false);
 const chapters=useMemo(()=>chaptersFor(course,subject),[course,subject]);
 const [chapter,setChapter]=useState(isCustomCourse?'':chapters[0].title);
 const [topic,setTopic]=useState(isCustomCourse?'':chapters[0].topics[0]);
 const [requirements,setRequirements]=useState(()=>recommendedTeachingBrief(course.id));
 const [customChapter,setCustomChapter]=useState(false);
 const [customTopic,setCustomTopic]=useState(false);
 const topics=chapters.find(c=>c.title===chapter)?.topics || [];
 const chooseSubject=(value:string)=>{setSubject(value);setCustomSubject(value==='custom');setCustomChapter(false);setCustomTopic(false);const next=chaptersFor(course,value);setChapter(next[0].title);setTopic(next[0].topics[0]);};
 const chooseChapter=(value:string)=>{setChapter(value);setCustomChapter(value==='custom');setCustomTopic(false);setTopic(chapters.find(c=>c.title===value)?.topics[0] || '');};
 const submit=(event:React.FormEvent)=>{event.preventDefault();if(!subject.trim()||!chapter.trim()||!topic.trim())return;onStart({subject:subject.trim(),chapter:chapter.trim(),topic:topic.trim(),requirements:requirements.trim()});};
 return <div className="setup min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8"><main className="max-w-4xl mx-auto">
  <button onClick={onBack} className="text-indigo-700 font-semibold mb-6">{t('backSubjects')}</button>
  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
   <header className="p-6 sm:p-10 bg-gradient-to-br from-slate-900 to-indigo-900 text-white"><p className="text-indigo-200 text-xs uppercase tracking-widest font-bold">{t('planYourClass')} · {isCustomCourse?`${display(course.segment)} · ${t('ownCourse')}`:display(course.category)}</p><h1 className="text-3xl sm:text-4xl font-black mt-3">{display(course.title)}</h1><p className="text-slate-200 mt-3">{display(course.description)}</p></header>
   <form onSubmit={submit} className="p-6 sm:p-10 space-y-7"><p className="text-slate-600">{t(isCustomCourse?'planCustomIntro':'planIntro')}</p>
    {isCustomCourse?<label className="profile-field"><span>{t('subjectCourse')}</span><input aria-label={t('subjectCourse')} required maxLength={100} value={subject} onChange={e=>setSubject(e.target.value)} placeholder={t('enterSubject')}/></label>:<label className="profile-field"><span>{t('subject')} *</span><select aria-label={t('subject')} value={customSubject?'custom':subject} onChange={e=>chooseSubject(e.target.value)}>{subjects.map(value=><option key={value} value={value}>{display(value)}</option>)}<option value="custom">{t('ownSubject')}</option></select>{customSubject&&<input aria-label={t('ownSubject')} required maxLength={100} placeholder={t('enterSubject')} value={subject==='custom'?'':subject} onChange={e=>setSubject(e.target.value)}/>}</label>}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
     {isCustomCourse?<><label className="profile-field"><span>{t('chapter')} *</span><input aria-label={`${t('chapter')} *`} required maxLength={100} value={chapter} onChange={e=>setChapter(e.target.value)} placeholder={t('enterChapter')}/></label><label className="profile-field"><span>{t('topic')} *</span><input aria-label={`${t('topic')} *`} required maxLength={100} value={topic} onChange={e=>setTopic(e.target.value)} placeholder={t('enterTopic')}/></label></>:<><label className="profile-field"><span>{t('chapter')} *</span><select aria-label={t('chapter')} value={customChapter?'custom':chapter} onChange={e=>chooseChapter(e.target.value)}>{chapters.map(c=><option key={c.title} value={c.title}>{display(c.title)}</option>)}<option value="custom">{t('ownChapter')}</option></select>{customChapter&&<input aria-label={t('ownChapter')} required maxLength={100} placeholder={t('enterChapter')} value={chapter==='custom'?'':chapter} onChange={e=>setChapter(e.target.value)}/>}</label><label className="profile-field"><span>{t('topic')} *</span><select aria-label={t('topic')} value={customTopic?'custom':topic} onChange={e=>{setCustomTopic(e.target.value==='custom');setTopic(e.target.value)}}>{topics.map(value=><option key={value} value={value}>{display(value)}</option>)}<option value="custom">{t('ownTopic')}</option></select>{customTopic&&<input aria-label={t('ownTopic')} required maxLength={100} placeholder={t('enterTopic')} value={topic==='custom'?'':topic} onChange={e=>setTopic(e.target.value)}/>}</label></>}
    </div>
    <label className="profile-field"><span>{t('customizeLearn')}</span><textarea aria-label={t('customizeLearn')} value={requirements} onChange={e=>setRequirements(e.target.value)} maxLength={1000} rows={5} placeholder={t('requirementsExample')}/></label>
    <p className="text-xs text-slate-500">{t('sharingNotice')}</p>
    <div className={`rounded-2xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between ${hasAIKey?'bg-emerald-50 text-emerald-900':'bg-amber-50 text-amber-900'}`}><p className="text-sm font-semibold">{t(hasAIKey?'keyReady':'connectProviderHelp')}</p><button type="button" onClick={onOpenProvider} disabled={!onOpenProvider} className="font-bold underline text-sm">{t(hasAIKey?'manageProvider':'connectProvider')}</button></div>
    <label className="profile-field"><span>{t('classLanguage')}</span><select aria-label={t('classLanguage')} value={language} onChange={e=>onLanguage(e.target.value as LanguageCode)}>{orderedLanguages(profile.country).map(l=><option key={l.code} value={l.code}>{language==='en'?`${l.label} (${l.nativeLabel})`:l.nativeLabel}</option>)}</select></label>
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-3 border-t border-slate-200"><p className="text-sm text-slate-500">{t('forStudent',{name:profile.name})}{profile.className?` · ${profile.className}`:''} · {profile.country}</p><button type="submit" className="primary-button">{t('continueClass')}</button></div>
   </form>
  </div>
 </main></div>;
}
