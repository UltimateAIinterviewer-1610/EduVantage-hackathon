import React, { useRef, useState } from 'react';
import { ArrowUpRight, ClipboardCopy, ExternalLink, Sparkles } from 'lucide-react';
import type { SessionRecord } from '../types';
import { readHistory } from '../services/storage';
import { practiceBrief, readInterviewerUrl, saveInterviewerUrl, validInterviewerUrl } from '../services/interviewBridge';
import { useUi } from '../uiText';

export default function InterviewBridge({ initialRecord }: { initialRecord?: SessionRecord | null }) {
  const t = useUi();
  const [records] = useState(() => readHistory());
  const [recordId, setRecordId] = useState(initialRecord?.id || records[0]?.id || '');
  const [focus, setFocus] = useState('');
  const [destination, setDestination] = useState(readInterviewerUrl);
  const [message, setMessage] = useState('');
  const briefField = useRef<HTMLTextAreaElement>(null);
  const record = records.find(item => item.id === recordId) || null;
  const brief = practiceBrief(record, focus);
  const url = validInterviewerUrl(destination);

  const saveUrl = () => {
    if (!saveInterviewerUrl(destination)) { setMessage(t('interviewUrlError')); return; }
    setDestination(validInterviewerUrl(destination) || '');
    setMessage(t('interviewUrlSaved'));
  };
  const copyBrief = async () => {
    if (!brief) { setMessage(t('interviewFocusNeeded')); return; }
    try { await navigator.clipboard.writeText(brief); setMessage(t('interviewCopied')); }
    catch { setMessage(t('interviewCopyFallback')); briefField.current?.select(); }
  };

  return <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-10 text-slate-900">
    <header className="interview-hero rounded-[2rem] bg-slate-900 p-7 text-white sm:p-10"><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">{t('interviewEyebrow')}</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">{t('interviewTitle')}</h1><p className="mt-4 max-w-2xl text-slate-200">{t('interviewIntro')}</p></header>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"><h2 className="text-xl font-black">{t('interviewChoose')}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="profile-field"><span>{t('interviewRecent')}</span><select value={recordId} onChange={event => { setRecordId(event.target.value); setMessage(''); }}><option value="">{t('interviewNoRecord')}</option>{records.slice(0, 20).map(item => <option key={item.id} value={item.id}>{item.lessonPlan?.topic || item.courseTitle}</option>)}</select></label><label className="profile-field"><span>{t('interviewFocus')}</span><input maxLength={160} value={focus} onChange={event => { setFocus(event.target.value); setMessage(''); }} placeholder={t('interviewFocusExample')}/></label></div><p className="mt-3 text-sm text-slate-600">{t('interviewPrivacy')}</p></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"><div className="flex items-center gap-3"><Sparkles className="text-indigo-600"/><h2 className="text-xl font-black">{t('interviewBriefTitle')}</h2></div><p className="mt-2 text-sm text-slate-600">{t('interviewBriefHelp')}</p><textarea ref={briefField} readOnly value={brief} aria-label={t('interviewBriefTitle')} rows={6} placeholder={t('interviewEmpty')} className="mt-4 w-full rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm leading-relaxed"/><button type="button" onClick={() => void copyBrief()} disabled={!brief} className="primary-button mt-3 inline-flex items-center gap-2 disabled:opacity-50"><ClipboardCopy size={17}/>{t('interviewCopy')}</button></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"><h2 className="text-xl font-black">{t('interviewConnect')}</h2><p className="mt-2 text-sm text-slate-600">{t('interviewConnectHelp')}</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><input type="url" aria-label={t('interviewUrl')} value={destination} onChange={event => { setDestination(event.target.value); setMessage(''); }} placeholder="https://your-interviewer-site.example" className="min-w-0 flex-1 rounded-xl border border-slate-300 p-3"/><button type="button" onClick={saveUrl} className="rounded-xl border border-slate-300 px-5 py-3 font-bold hover:bg-slate-50">{t('interviewSaveUrl')}</button></div><div className="mt-5 flex flex-wrap gap-3">{url ? <><a href={`${url}/`} target="_blank" rel="noopener noreferrer" className="primary-button inline-flex items-center gap-2">{t('interviewConnect')}<ExternalLink size={17}/></a><a href={`${url}/pitch-practice`} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-indigo-300 px-5 py-3 font-bold text-indigo-700 hover:bg-indigo-50">{t('interviewPitch')} <ArrowUpRight className="inline" size={17}/></a></> : <p role="alert" className="text-sm text-rose-700">{t('interviewUrlError')}</p>}</div>{message && <p role="status" className="mt-4 text-sm font-semibold text-slate-700">{message}</p>}<p className="mt-4 text-xs text-slate-500">{t('interviewSeparate')}</p></section>
  </div>;
}
