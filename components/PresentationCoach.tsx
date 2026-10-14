import { createId } from '../services/id';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, Mic, MicOff, Pause, Play, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import { AIConnection } from '../services/aiConnection';
import { ALL_LANGUAGES } from '../languages';
import { PresentationAttempt, PresentationBrief, PresentationPlan, makePresentationPlan, practiceMetrics, presentationFollowUp, readPresentationAttempts, reviewPresentation, savePresentationAttempt, starterPlan } from '../services/presentationCoach';
import { useUi } from '../uiText';
import { extractPresentationFile } from '../services/presentationUpload';
import ProviderRecovery, { useProviderWait } from './ProviderRecovery';

type Phase = 'setup' | 'rehearse' | 'review';
const stages = [
  { title: 'Opening', cue: 'Start with a hook, say why your topic matters, and preview the route ahead.', tip: 'Aim for a clear first sentence and a confident pause.' },
  { title: 'Main points', cue: 'Explain each point in order. Use a concrete example and a transition between ideas.', tip: 'Say where you are going: “First…”, “For example…”, “This means…”.' },
  { title: 'Closing', cue: 'Summarize the main message, connect it back to your opening, and invite questions.', tip: 'End with one takeaway instead of introducing a new topic.' },
  { title: 'Audience Q&A', cue: 'Listen to a likely question, pause briefly, and answer in one clear idea with an example.', tip: 'If you do not know, explain what you would check next.' },
] as const;
const emptyBrief: PresentationBrief = { title: '', audience: '', durationMinutes: 5, goal: '', keyPoints: '' };
const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export default function PresentationCoach({ profileId, connection, language, onOpenProvider }: { profileId: string; connection: AIConnection; language: string; onOpenProvider: () => void }) {
  const t = useUi();
  const providerWaiting=useProviderWait(connection);
  const draftKey=`edu_coach_session_${profileId}`;
  const [draft]=useState(()=>{try{return JSON.parse(localStorage.getItem(draftKey)||'{}');}catch{return {};}});
  const [phase, setPhase] = useState<Phase>(()=>draft.phase==='rehearse'&&draft.plan?'rehearse':draft.phase==='review'&&draft.attempt?'review':'setup');
  const [brief, setBrief] = useState<PresentationBrief>(() => draft.brief?.title ? draft.brief : ({ ...emptyBrief, audience: t('coachDefaultAudience') }));
  const [plan, setPlan] = useState<PresentationPlan | null>(draft.plan||null);
  const [stage, setStage] = useState(draft.stage||0);
  const [questionIndex, setQuestionIndex] = useState(draft.questionIndex||0);
  const [followUp, setFollowUp] = useState(draft.followUp||'');
  const [segments, setSegments] = useState<string[]>(Array.isArray(draft.segments)&&draft.segments.length===4?draft.segments:['', '', '', '']);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(draft.elapsed||0);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState<PresentationAttempt | null>(draft.attempt||null);
  const [attempts, setAttempts] = useState(() => readPresentationAttempts(profileId));
  const [selfCheck, setSelfCheck] = useState<string[]>(draft.selfCheck||[]);
  const recognition = useRef<any>(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const languageName = ALL_LANGUAGES.find(item => item.code === language)?.label || 'English';
  useEffect(()=>{try{localStorage.setItem(draftKey,JSON.stringify({phase,brief,plan,stage,questionIndex,followUp,segments,elapsed,attempt,selfCheck}));}catch{}},[draftKey,phase,brief,plan,stage,questionIndex,followUp,segments,elapsed,attempt,selfCheck]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setElapsed(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  useEffect(() => () => { try { recognition.current?.stop(); } catch { /* The browser may already have stopped it. */ } }, []);

  const stopMic = () => { try { recognition.current?.stop(); } catch { /* Already stopped. */ } recognition.current = null; setListening(false); };
  const toggleMic = () => {
    if (listening) { stopMic(); return; }
    const BrowserRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!BrowserRecognition) { setError('Speech-to-text is unavailable in this browser. Type your rehearsal below instead.'); return; }
    try {
      const instance = new BrowserRecognition();
      instance.lang = language === 'en-hi' ? 'hi-IN' : language;
      instance.continuous = true;
      instance.interimResults = false;
      instance.onresult = (event: any) => {
        const spoken = Array.from(event.results).slice(event.resultIndex).filter((result: any) => result.isFinal).map((result: any) => result[0]?.transcript || '').join(' ').trim();
        if (spoken) setSegments(current => current.map((text, index) => index === stageRef.current ? `${text}${text ? ' ' : ''}${spoken}`.slice(0, 8000) : text));
      };
      instance.onerror = () => { setListening(false); setError('The microphone stopped. Check browser permission or continue by typing.'); };
      instance.onend = () => { setListening(false); recognition.current = null; };
      recognition.current = instance;
      instance.start();
      setListening(true); setRunning(true); setError('');
    } catch { recognition.current = null; setListening(false); setError('The microphone could not start. Check browser permission or type your rehearsal.'); }
  };
  const updateBrief = (key: keyof PresentationBrief, value: string | number) => { setBrief(current => ({ ...current, [key]: value })); setPlan(null); };
  const uploadPresentation = async (file?: File) => {
    if (!file || uploading) return;
    setUploading(true); setError(''); setNotice('');
    try {
      const extracted = await extractPresentationFile(file);
      setBrief(current => ({ ...current, title: extracted.title, keyPoints: extracted.keyPoints }));
      setPlan(null); setUploadName(extracted.fileName);
      setNotice(extracted.keyPoints ? 'Text extracted. Review and edit the topic and key points before building your practice plan.' : 'A title was extracted, but no key points were found. Add your points before building a practice plan.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read this file. Try another PDF, PPTX or DOCX.');
    } finally { setUploading(false); }
  };
  const prepare = async (event: React.FormEvent) => {
    event.preventDefault();
    if (uploading) return;
    if (!brief.title.trim()) { setError('Enter the presentation topic or assignment first.'); return; }
    setError(''); setNotice(''); setBusy(true);
    try {
      const next = connection.key && !providerWaiting ? await makePresentationPlan(connection, brief, languageName) : starterPlan(brief, languageName);
      setPlan(next);
      if (!connection.key || providerWaiting) setNotice('Starter plan ready. You can rehearse without AI while this provider is unavailable.');
    } catch (cause) {
      if(!plan)setPlan(starterPlan(brief, languageName));
      setNotice(`${plan?'Your existing plan is unchanged.':'Starter plan ready.'} ${cause instanceof Error ? cause.message : 'Personalized outline is unavailable.'}`);
    } finally { setBusy(false); }
  };
  const begin = () => { stopMic(); setSegments(['', '', '', '']); setStage(0); setQuestionIndex(0); setFollowUp(''); setElapsed(0); setRunning(true); setError(''); setNotice(''); setAttempt(null); setSelfCheck([]); setPhase('rehearse'); };
  const getFeedback = async (current: PresentationAttempt) => {
    if (!connection.key || providerWaiting) {setNotice('Your rehearsal is saved. AI feedback is unavailable until the provider is ready; you can use the practice review below.');return;}
    setBusy(true); setNotice('');
    try {
      const aiFeedback = await reviewPresentation(connection, current, languageName);
      const updated = { ...current, aiFeedback };
      setAttempt(updated);
      try { setAttempts(savePresentationAttempt(profileId, updated)); } catch { setNotice('AI feedback is visible now but could not be saved on this device.'); }
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Personalized feedback is unavailable.'); }
    finally { setBusy(false); }
  };
  const finish = async () => {
    stopMic(); setRunning(false);
    if (!segments.some(part => part.trim())) { setError('Speak or type at least one part of your presentation before finishing.'); return; }
    const next: PresentationAttempt = { id: createId(), timestamp: Date.now(), brief, segments, plan: plan || undefined, elapsedSeconds: elapsed, selfCheck: [] };
    try { setAttempts(savePresentationAttempt(profileId, next)); }
    catch { setError('The rehearsal finished, but this browser could not save it. Copy your notes before leaving.'); }
    setAttempt(next); setPhase('review');
    setNotice('Your rehearsal is saved. Review your transcript below; AI feedback is available when you choose to request it.');
  };
  const moveStage = () => { stopMic(); if (stage === stages.length - 1) { void finish(); return; } setStage(value => value + 1); setError(''); };
  const playQuestion = () => {
    const question = followUp || plan?.questions[questionIndex];
    if (!question) return;
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') { setError('Speech playback is unavailable in this browser. Read the audience question above and continue by typing.'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question);
    utterance.lang = language === 'en-hi' ? 'hi-IN' : language;
    window.speechSynthesis.speak(utterance);
  };
  const askFollowUp = async () => {
    if (!plan || !segments[3].trim()) { setError('Answer a question first, then ask for a follow-up.'); return; }
    stopMic(); setError('');
    if (!connection.key || providerWaiting) {
      const next = (questionIndex + 1) % plan.questions.length;
      setQuestionIndex(next); setFollowUp('');
      setSegments(current => current.map((text, index) => index === 3 ? `${text}\n\n[Audience question: ${plan.questions[next]}]\n` : text));
      return;
    }
    setBusy(true);
    try {
      const next = await presentationFollowUp(connection, brief, followUp || plan.questions[questionIndex], segments[3], languageName);
      setFollowUp(next);
      setSegments(current => current.map((text, index) => index === 3 ? `${text}\n\n[Audience follow-up: ${next}]\n` : text));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create a follow-up question.'); }
    finally { setBusy(false); }
  };
  const review = attempt ? practiceMetrics(attempt.segments, attempt.elapsedSeconds, attempt.brief.durationMinutes) : null;
  const percent = Math.min(100, (elapsed / (Math.max(1, brief.durationMinutes) * 60)) * 100);
  const englishFillers = language === 'en' || language === 'en-hi';

  return <div className="presentation-coach mx-auto max-w-7xl p-5 sm:p-10 text-slate-900">
    <header className="coach-hero"><div><p className="coach-eyebrow">{t('coachEyebrow')} <span aria-hidden="true">✦</span> {languageName}</p><h1>{t('coachTitle')}<em>{t('coachTitleAccent')}</em></h1><p>{t('coachIntro')}</p></div><div className="coach-orbit" aria-hidden="true"><span>01</span><span>02</span><span>03</span><strong>YOU<br/>ARE<br/>READY.</strong></div></header>
    <nav className="coach-stepper" aria-label="Presentation Coach sections">{([t('coachSetup'), t('coachRehearse'), t('coachReview')] as const).map((name, index) => <button type="button" key={name} disabled={index === 1 ? !plan : index === 2 ? !attempt : false} onClick={() => { stopMic(); setRunning(false); setPhase((['setup', 'rehearse', 'review'] as const)[index]); }} className={index === ['setup', 'rehearse', 'review'].indexOf(phase) ? 'active' : ''} aria-current={index === ['setup', 'rehearse', 'review'].indexOf(phase) ? 'step' : undefined}><span>0{index + 1}</span>{name}</button>)}</nav>
    {error && <p role="alert" className="coach-alert">{error}</p>}{notice && <p role="status" className="coach-notice">{notice}</p>}
    <ProviderRecovery connection={connection} error={`${error} ${notice}`} onOpenProvider={onOpenProvider} practice="You can use the starter plan, rehearse, review your transcript, and use the self-check without AI."/>

    {phase === 'setup' && <div className="coach-layout"><section className="coach-card"><p className="coach-kicker">01 / {t('coachAssignment')}</p><h2>{t('coachTomorrow')}</h2><p className="coach-muted">{t('coachAssignmentHelp')}</p><div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2"><label className="block font-bold" htmlFor="coach-presentation-file">Upload a presentation (PDF, PPTX or DOCX)</label><input id="coach-presentation-file" aria-label="Upload presentation" type="file" accept=".pdf,.pptx,.docx" disabled={uploading || busy} onChange={event => { void uploadPresentation(event.target.files?.[0]); event.target.value = ''; }} className="block w-full text-sm"/><p className="text-sm text-slate-600">Up to 12 MB. Text is extracted in this browser. Scanned pages and images need a text-based export. You can always type the topic and key points yourself.</p>{uploading && <p role="status" className="text-sm">Extracting presentation text…</p>}{uploadName && <p className="text-sm font-semibold">Extracted from {uploadName}. Review and edit the fields below.</p>}<p className="text-sm text-slate-600">The complete file is never sent to an AI provider. If you build a personalized plan, the title, key points and other fields you review below are sent to your selected provider.</p></div><form onSubmit={event => void prepare(event)} className="coach-form"><label>{t('coachTopic')}<input required maxLength={160} value={brief.title} onChange={event => updateBrief('title', event.target.value)} placeholder={t('coachTopicExample')} /></label><div className="coach-form-row"><label>{t('coachAudience')}<input maxLength={100} value={brief.audience} onChange={event => updateBrief('audience', event.target.value)} placeholder={t('coachDefaultAudience')} /></label><label>{t('coachDuration')}<input type="number" min="1" max="30" value={brief.durationMinutes} onChange={event => updateBrief('durationMinutes', Math.max(1, Math.min(30, Number(event.target.value) || 1)))} /></label></div><label>{t('coachGoal')}<textarea rows={2} maxLength={800} value={brief.goal} onChange={event => updateBrief('goal', event.target.value)} placeholder={t('coachGoalExample')} /></label><label>{t('coachPoints')}<textarea rows={4} maxLength={2000} value={brief.keyPoints} onChange={event => updateBrief('keyPoints', event.target.value)} placeholder={t('coachPointsExample')} /></label><div className="coach-actions"><button className="coach-primary" type="submit" disabled={busy || uploading}>{uploading ? 'Extracting…' : busy ? t('coachPreparing') : plan ? t('coachRefresh') : t('coachBuild')} <ArrowRight size={18}/></button>{!connection.key && <button type="button" className="coach-link" onClick={onOpenProvider}>{t('coachConnect')}</button>}</div></form></section><aside className="coach-side"><p className="coach-kicker">{t('coachToolkit')}</p><h2>{t('coachToolkitTitle')}</h2><ul><li><CheckCircle2/> {t('coachTool1')}</li><li><CheckCircle2/> {t('coachTool2')}</li><li><CheckCircle2/> {t('coachTool3')}</li><li><CheckCircle2/> {t('coachTool4')}</li><li><CheckCircle2/> {t('coachTool5')}</li></ul><p>{t('coachToolkitHelp')}</p></aside></div>}

    {phase === 'setup' && plan && <section className="coach-card coach-plan" aria-label="Your practice plan"><div><p className="coach-kicker">{t('coachPlan')}</p><h2>{t('coachPlanTitle')}</h2></div><div className="coach-plan-grid"><div><span>01 / {t('coachOpening')}</span><p>{plan.opening}</p></div><div><span>02 / {t('coachMain')}</span><ol>{plan.body.map((point, index) => <li key={index}>{point}</li>)}</ol></div><div><span>03 / {t('coachClosing')}</span><p>{plan.closing}</p></div></div><button className="coach-primary" onClick={begin}>{t('coachStart')} <ArrowRight size={18}/></button></section>}

    {phase === 'rehearse' && plan && <div className="coach-layout"><section className="coach-card coach-stage"><div className="coach-stage-head"><div><p className="coach-kicker">{t('coachStage',{current:stage+1})}</p><h2>{t((['coachOpening','coachMain','coachClosing','coachQuestions'] as const)[stage])}</h2></div><div className="coach-timer" aria-label={`Elapsed time ${formatTime(elapsed)}`}><Clock3 size={18}/>{formatTime(elapsed)} <button type="button" aria-label={running ? t('coachPause') : t('coachResume')} onClick={() => { if (running) stopMic(); setRunning(!running); }}>{running ? <Pause size={17}/> : <Play size={17}/>}</button></div></div><div className="coach-timebar" role="progressbar" aria-label="Target duration progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}><span style={{ width: `${percent}%` }}/></div><p className="coach-muted">{t('coachTarget',{minutes:brief.durationMinutes})}</p><div className="coach-prompt"><span>{t('coachCue')}</span><p>{stage === 0 ? plan.opening : stage === 1 ? plan.body.join(' • ') : stage === 2 ? plan.closing : followUp || plan.questions[questionIndex]}</p></div>{stage === 3 && <div className="coach-questions" aria-label={t('coachQuestions')}>{plan.questions.map((question, index) => <button key={index} type="button" aria-pressed={questionIndex === index} onClick={() => { setQuestionIndex(index); setFollowUp(''); }}>{question}</button>)}</div>}{stage === 3 && <button type="button" className="coach-link" onClick={playQuestion}><Volume2 size={16}/> {t('coachHear')}</button>}{stage === 3 && <button type="button" className="coach-link" disabled={busy || !segments[3].trim()} onClick={() => void askFollowUp()}>{busy ? t('coachPreparing') : t('coachFollowUp')}</button>}<p className="coach-tip">{t((['coachStageTip1','coachStageTip2','coachStageTip3','coachStageTip4'] as const)[stage])}</p><label className="coach-transcript">{stage === 3 ? t('coachAnswer') : t('coachWords')}<textarea value={segments[stage]} onChange={event => setSegments(current => current.map((text, index) => index === stage ? event.target.value : text))} placeholder={t('coachPlaceholder')} maxLength={8000} rows={9}/></label><div className="coach-actions"><button type="button" className="coach-mic" aria-pressed={listening} onClick={toggleMic}>{listening ? <MicOff size={18}/> : <Mic size={18}/>} {listening ? t('coachStopListening') : t('coachMic')}</button><button type="button" className="coach-primary" onClick={moveStage}>{stage === 3 ? t('coachFinish') : t('coachNext')} <ArrowRight size={18}/></button></div></section><aside className="coach-side"><p className="coach-kicker">{t('coachRoute')}</p><h2>{brief.title}</h2><div className="coach-stage-list">{stages.map((item, index) => <button type="button" key={item.title} className={index === stage ? 'active' : ''} onClick={() => { stopMic(); setStage(index); }}><span>0{index + 1}</span>{t((['coachOpening','coachMain','coachClosing','coachQuestions'] as const)[index])}{segments[index].trim() && <CheckCircle2 size={16}/>}</button>)}</div><p>{t('coachRouteTip')}</p></aside></div>}

    {phase === 'review' && attempt && review && <div className="coach-layout"><section className="coach-card"><p className="coach-kicker">{t('coachPracticeReview')}</p><h2>{t('coachCloser')}</h2><p className="coach-muted">{attempt.brief.title} · {new Date(attempt.timestamp).toLocaleString()}</p><div className="coach-metrics"><div><strong>{review.words}</strong><span>{t('coachWordCount')}</span></div><div><strong>{formatTime(attempt.elapsedSeconds)}</strong><span>{t('coachPracticeTimer')}</span></div><div><strong>{englishFillers ? review.fillerCount : '—'}</strong><span>{t('coachFillerCount')}</span></div></div><p className="coach-muted">{t('coachEstimate',{estimated:review.estimatedMinutes,target:attempt.brief.durationMinutes})}</p><div className="coach-feedback"><h3>{t('coachNextPractice')}</h3><ul>{!review.hasOpening && <li>{t('coachFeedback1')}</li>}{!review.hasBody && <li>{t('coachFeedback2')}</li>}{!review.hasClosing && <li>{t('coachFeedback3')}</li>}{!review.hasQuestions && <li>{t('coachFeedback4')}</li>}{englishFillers && review.fillerCount > 2 && <li>{t('coachFeedback5')}</li>}{review.words < review.targetWords * .6 && <li>{t('coachFeedback6')}</li>}{review.words > review.targetWords * 1.5 && <li>{t('coachFeedback7')}</li>}{review.hasOpening && review.hasBody && review.hasClosing && review.fillerCount <= 2 && <li>{t('coachFeedback8')}</li>}</ul></div>{busy && <p role="status" className="coach-notice">{t('coachReviewing')}</p>}{attempt.aiFeedback && <div className="coach-ai-feedback"><p className="coach-kicker"><Sparkles size={16}/> {t('coachAIReview')}</p><p>{attempt.aiFeedback}</p></div>}{!connection.key && <div className="coach-muted"><p>{t('coachNoKey')}</p><button type="button" className="coach-link" onClick={onOpenProvider}>{t('coachConnect')}</button></div>}{connection.key && !attempt.aiFeedback && !busy && <div><p className="coach-muted">Choose this to send only your written transcript to your selected AI provider for feedback. Audio is never sent or recorded.</p><button type="button" className="coach-link" onClick={() => void getFeedback(attempt)}>{t('coachGetFeedback')}</button></div>}<div className="coach-actions"><button className="coach-primary" disabled={busy} onClick={begin}><RotateCcw size={18}/> {t('coachRehearseAgain')}</button><button className="coach-link" disabled={busy} onClick={() => { setPhase('setup'); setPlan(null); }}>{t('coachEdit')}</button></div></section><aside className="coach-side"><p className="coach-kicker">{t('coachReflect')}</p><h2>{t('coachReflectTitle')}</h2>{[t('coachReflect1'), t('coachReflect2'), t('coachReflect3'), t('coachReflect4')].map(item => <label className="coach-check" key={item}><input type="checkbox" checked={selfCheck.includes(item)} onChange={event => { const next = event.target.checked ? [...selfCheck, item] : selfCheck.filter(value => value !== item); setSelfCheck(next); const updated = { ...attempt, selfCheck: next }; setAttempt(updated); try { setAttempts(savePresentationAttempt(profileId, updated)); } catch { setError('Your self-check could not be saved on this device.'); } }}/>{item}</label>)}<p>{t('coachReflectNote')}</p></aside></div>}

    {attempts.length > 0 && phase === 'setup' && <section className="coach-card coach-history"><p className="coach-kicker">{t('coachHistory')}</p><h2>{t('coachHistoryTitle')}</h2><div>{attempts.slice(0, 5).map(item => <button type="button" key={item.id} onClick={() => { setAttempt(item); setSelfCheck(item.selfCheck || []); setBrief(item.brief); setPlan(item.plan || starterPlan(item.brief, languageName)); setPhase('review'); }}><span>{item.brief.title}</span><small>{new Date(item.timestamp).toLocaleDateString()} · {formatTime(item.elapsedSeconds)}</small><ArrowRight size={17}/></button>)}</div></section>}
  </div>;
}
