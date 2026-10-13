import { createId } from '../services/id';
import React, { useEffect, useState } from 'react';
import { AIConnection } from '../services/aiConnection';
import { StudyKind, StudySource, importStudyFile, readStudySources, writeStudySources } from '../services/studySources';
import { StudyAnswer, StudyQuestion, askStudySources, createStudyQuestion, nextDifficulty } from '../services/studyAI';
import { readStudyProgress, saveStudyAttempt, studySummary } from '../services/studyProgress';
import { useUi } from '../uiText';
import ProviderRecovery, { useProviderWait } from './ProviderRecovery';

export default function StudyLab({ profileId, connection, language, onOpenProvider }: { profileId: string; connection: AIConnection; language: string; onOpenProvider: () => void }) {
  const t = useUi();
  const providerWaiting=useProviderWait(connection);
  const draftKey=`edu_study_session_${profileId}`;
  const [draft]=useState(()=>{try{return JSON.parse(localStorage.getItem(draftKey)||'{}');}catch{return {};}});
  const [sources, setSources] = useState<StudySource[]>(() => readStudySources(profileId));
  const [kind, setKind] = useState<StudyKind>('textbook');
  const [useGeminiMedia, setUseGeminiMedia] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState<string>(draft.query||'');
  const [answer, setAnswer] = useState<StudyAnswer | null>(draft.answer||null);
  const [question, setQuestion] = useState<StudyQuestion | null>(draft.question||null);
  const [selected, setSelected] = useState<number | null>(draft.selected??null);
  const [difficulty, setDifficulty] = useState<StudyQuestion['difficulty']>(draft.difficulty||'foundation');
  const [attempts, setAttempts] = useState(() => readStudyProgress(profileId));
  const score = studySummary(attempts);
  useEffect(()=>{try{localStorage.setItem(draftKey,JSON.stringify({query,answer,question,selected,difficulty}));}catch{}},[draftKey,query,answer,question,selected,difficulty]);
  const save = (next: StudySource[]) => { writeStudySources(profileId, next); setSources(next); };
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true); setError(''); setNotice('Reading study material…');
    try { const source = await importStudyFile(file, kind, { useGeminiMedia, connection }); save([...sources, source]); setNotice(`${source.title} added with ${source.chunks.length} cited sections.`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not read the file.'); setNotice(''); }
    finally { setBusy(false); }
  };
  const ask = async (event: React.FormEvent) => {
    event.preventDefault(); if (!query.trim()) return;
    setBusy(true); setError('');
    try { setAnswer(await askStudySources(connection, sources, query.trim(), language)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not answer yet.'); }
    finally { setBusy(false); }
  };
  const makeQuestion = async () => {
    setBusy(true); setError('');
    try { const next=await createStudyQuestion(connection, sources, query.trim() || 'key concepts from these materials', difficulty, language);setQuestion(next);setSelected(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create a question.'); }
    finally { setBusy(false); }
  };
  const choose = (index: number) => {
    if (!question || selected !== null) return;
    setSelected(index);
    const correct = index === question.correctIndex;
    try { setAttempts(saveStudyAttempt(profileId, { id: createId(), sourceId: question.citation.sourceId, topic: query.trim() || question.prompt, difficulty: question.difficulty, correct, timestamp: Date.now() })); }
    catch { setError('Your answer was checked, but progress could not be saved on this device.'); }
    setDifficulty(nextDifficulty(correct, question.difficulty));
  };
  return <div className="study-lab p-5 sm:p-10 max-w-6xl mx-auto space-y-7 text-slate-900">
    <header><p className="text-xs font-black uppercase tracking-[.22em] text-orange-600">Track D · {t('studyLab')}</p><h1 className="text-4xl sm:text-5xl font-black mt-2">{t('guideStudyTitle')}</h1><p className="text-slate-600 mt-3 max-w-2xl">{t('studyIntro')}</p></header>
    {!connection.key && <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 flex flex-wrap justify-between gap-3"><p>Connect an AI provider to ask questions and generate assessments.</p><button className="underline font-bold" onClick={onOpenProvider}>Open AI Provider</button></div>}
    <ProviderRecovery connection={connection} error={error} onOpenProvider={onOpenProvider} practice="You can read your uploaded sources, existing answer, and completed practice without AI."/>
    <section className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
      <div className="space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm"><h2 className="text-xl font-black">1. {t('studyUpload')}</h2><p className="text-sm text-slate-500 mt-1">{t('studyUploadHelp')}</p><div className="flex flex-wrap gap-3 mt-5 items-end"><label className="profile-field min-w-40"><span>{t('studyKind')}</span><select value={kind} onChange={event => setKind(event.target.value as StudyKind)}><option value="textbook">{t('studyTextbook')}</option><option value="slides">{t('studySlides')}</option><option value="lecture">{t('lecture')}</option></select></label><label className="primary-button cursor-pointer">{t('studyChoose')}<input aria-label={t('studyChoose')} type="file" accept=".pdf,.pptx,.txt,.md,.srt,.vtt,.mp4,.webm" className="sr-only" disabled={busy} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} /></label></div><label className="flex items-start gap-2 mt-4 text-sm"><input type="checkbox" checked={useGeminiMedia} onChange={event => setUseGeminiMedia(event.target.checked)}/><span>{t('studyMediaConsent')}</span></label><p className="text-xs text-slate-500 mt-3">{t('studyPrivacy')}</p></div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm"><h2 className="text-xl font-black">2. {t('studyAsk')}</h2><form onSubmit={ask} className="mt-4 space-y-3"><label className="block font-semibold" htmlFor="study-query">{t('studyQuestion')}</label><textarea id="study-query" className="w-full border border-slate-300 rounded-xl p-3 min-h-24" value={query} onChange={event => setQuery(event.target.value)} placeholder="What are the key ideas in these materials?"/><button className="primary-button" disabled={busy || providerWaiting || !sources.length || !connection.key || !query.trim()}>{t('studyAskButton')}</button></form>{answer && <div className="mt-6 rounded-2xl bg-slate-50 p-5"><h3 className="font-black mb-2">{t('studyAnswer')}</h3><p className="whitespace-pre-wrap leading-relaxed">{answer.text}</p>{answer.citations.length ? <div className="mt-5 space-y-2"><h4 className="font-bold">{t('studyCitations')}</h4>{answer.citations.map(item => <details key={item.number} className="bg-white border rounded-xl p-3"><summary className="cursor-pointer font-semibold">[{item.number}] {item.title} · {item.label}</summary><p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{item.excerpt}</p></details>)}</div> : <p className="text-amber-700 text-sm mt-3">No valid source citation was returned. Check the answer against your materials.</p>}</div>}</div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-black">3. {t('studyPractice')}</h2><p className="text-sm text-slate-500">{t('studyDifficulty')}: <strong className="capitalize">{difficulty}</strong> · {t('studyCorrect')}: {score.correct}/{score.total}</p></div><button className="primary-button" disabled={busy || providerWaiting || !sources.length || !connection.key} onClick={() => void makeQuestion()}>{question ? t('studyNext') : t('studyStart')}</button></div>{question && <div className="mt-5"><p className="text-xs uppercase font-black text-indigo-700">{question.difficulty}</p><h3 className="text-lg font-bold mt-2">{question.prompt}</h3><div className="grid gap-2 mt-4">{question.options.map((option, index) => <button key={index} disabled={selected !== null} onClick={() => choose(index)} className={`text-left rounded-xl border p-3 ${selected !== null && index === question.correctIndex ? 'bg-emerald-100 border-emerald-500' : selected === index ? 'bg-rose-100 border-rose-500' : 'bg-white hover:border-indigo-500'}`}>{String.fromCharCode(65 + index)}. {option}</button>)}</div>{selected !== null && <div role="status" className="mt-4 rounded-xl bg-slate-50 p-4"><strong>{selected === question.correctIndex ? 'Correct.' : 'Keep practicing.'}</strong> {question.explanation}<details className="mt-3"><summary className="cursor-pointer underline">Evidence: {question.citation.title} · {question.citation.label}</summary><p className="text-sm mt-2">{question.citation.excerpt}</p></details><p className="text-sm mt-2">Your next question will be {difficulty} level.</p></div>}</div>}</div>
      </div>
      <aside className="bg-slate-900 text-white rounded-3xl p-6 self-start"><h2 className="font-black text-xl">{t('studySources')}</h2>{sources.length ? <ul className="mt-5 space-y-3">{sources.map(source => <li key={source.id} className="rounded-xl bg-white/10 p-3"><p className="font-semibold break-all">{source.title}</p><p className="text-xs text-slate-300 capitalize">{source.kind} · {source.chunks.length} sections</p><button className="text-xs underline text-rose-200 mt-2" onClick={() => { try { save(sources.filter(item => item.id !== source.id)); setNotice('Source removed.'); setAnswer(null); setQuestion(null); } catch { setError('Could not update the source library.'); } }}>{t('studyRemove')}</button></li>)}</ul> : <p className="text-slate-300 mt-4">{t('studyEmpty')}</p>}</aside>
    </section>
    {notice && <p role="status" className="text-emerald-700 font-semibold">{notice}</p>}{error && <p role="alert" className="text-rose-700 font-semibold">{error}</p>}{busy && <p role="status">{t('studyWorking')}</p>}
  </div>;
}
