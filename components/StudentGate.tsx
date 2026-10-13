import React, { useState } from 'react';
import { StudentProfile } from '../types';
import StudentProfileForm from './StudentProfileForm';
import { useUi } from '../uiText';
import { cloudConfigured } from '../services/cloud';
export default function StudentGate({profile,onEnter,onBack}:{profile:StudentProfile|null;onEnter:(profile:StudentProfile)=>void;onBack?:()=>void}) {
 const t=useUi();
 const [editing,setEditing]=useState(!profile);
 return <div className="gate min-h-screen bg-slate-50 flex items-center justify-center p-5">
  <main className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
   <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-3 text-sm font-semibold"><button type="button" onClick={onBack} className="text-indigo-700 hover:underline">← Public home</button><a href="#/privacy" className="text-indigo-700 hover:underline">Privacy Policy</a></div>
   <div className="bg-gradient-to-br from-indigo-700 to-violet-700 text-white p-8 sm:p-10"><p className="text-xs font-bold uppercase tracking-widest text-indigo-200">EduVantage · {t('studio')}</p><h1 className="text-3xl sm:text-4xl font-black mt-4">{profile&&!editing?t('welcomeBack',{name:profile.name}):t('learningStarts')}</h1><p className="text-indigo-100 mt-3">{t('gateIntro')}</p></div>
   <div className="p-6 sm:p-10">
    {profile&&!editing?<div className="space-y-5"><p className="text-slate-600">{t('continueProfile',{country:profile.country,language:profile.language})}</p><button className="primary-button" onClick={()=>onEnter(profile)}>{t('continueClassroom')}</button><button className="ml-4 text-indigo-700 font-semibold" onClick={()=>setEditing(true)}>{t('editProfile')}</button></div>
      :<><h2 className="text-xl font-bold mb-5">{profile?t('editProfile'):t('createProfile')}</h2><StudentProfileForm initial={profile} buttonText={profile?t('saveContinue'):t('saveEnter')} onSave={onEnter}/>{profile&&<button className="mt-4 text-slate-600" onClick={()=>setEditing(false)}>{t('back')}</button>}</>}
    <p className="text-xs text-slate-500 mt-8">{cloudConfigured?'Your profile and progress are saved to your account. Your AI provider key stays in this browser session.':t('localProfileNotice')}</p>
   </div>
  </main>
 </div>;
}
