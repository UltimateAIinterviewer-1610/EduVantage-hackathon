import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, FileText, Sparkles } from 'lucide-react';
import { createId } from '../services/id';
import type { AIConnection } from '../services/aiConnection';
import { persistLearnerData } from '../services/cloud';
import { type StudyKind, type StudySource, importStudyFile, readStudySources, writeStudySources } from '../services/studySources';
import { type Citation, type StudyAnswer, type StudyQuestion, askStudySources, createStudyQuestion, nextDifficulty, validStudyCitationNumbers } from '../services/studyAI';
import { readStudyProgress, saveStudyAttempt, studySummary } from '../services/studyProgress';
import { useUi } from '../uiText';
import ProviderRecovery, { useProviderWait } from './ProviderRecovery';

type View = 'sources' | 'ask' | 'practice' | 'progress';
const views: { id: View; title: string }[] = [
  { id: 'sources', title: 'My sources' }, { id: 'ask', title: 'Ask a question' },
  { id: 'practice', title: 'Practice' }, { id: 'progress', title: 'Progress' },
];

function AnswerText({ answer, open }: { answer: StudyAnswer; open: (citation: Citation) => void }) {
  const cited = new Map(answer.citations.map(item => [item.number, item]));
  return <p className="study-answer-text">{answer.text.split(/(\[\d+\])/g).map((part, index) => {
    const marker = /^\[(\d+)\]$/.exec(part);
    if (!marker) return <React.Fragment key={index}>{part}</React.Fragment>;
    const citation = cited.get(Number(marker[1]));
    return citation ? <button type="button" key={index} className="study-citation-link" onClick={() => open(citation)} aria-label={`Open citation ${citation.number}: ${citation.title}, ${citation.label}`}>{part}</button> : null;
  })}</p>;
}

export default function StudyLab({ profileId, connection, language, onOpenProvider }: { profileId: string; connection: AIConnection; language: string; onOpenProvider: () => void }) {
  const t = useUi();
  const providerWaiting = useProviderWait(connection);
  const draftKey = `edu_study_session_${profileId}`;
  const [draft] = useState(() => { try { return JSON.parse(localStorage.getItem(draftKey) || '{}'); } catch { return {}; } });
  const [view, setView] = useState<View>('sources');
  const [sources, setSources] = useState<StudySource[]>(() => readStudySources(profileId));
  const [kind, setKind] = useState<StudyKind>('textbook');
  const [useGeminiMedia, setUseGeminiMedia] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState<string>(draft.query || '');
  const [answer, setAnswer] = useState<StudyAnswer | null>(draft.answer || null);
  const [question, setQuestion] = useState<StudyQuestion | null>(draft.question || null);
  const [selected, setSelected] = useState<number | null>(draft.selected ?? null);
  const [difficulty, setDifficulty] = useState<StudyQuestion['difficulty']>(draft.difficulty || 'foundation');
  const [attempts, setAttempts] = useState(() => readStudyProgress(profileId));
  const [excerpt, setExcerpt] = useState<Citation | null>(null);
  const excerptTrigger = useRef<HTMLElement | null>(null);
  const openExcerpt = (citation: Citation) => { excerptTrigger.current = document.activeElement as HTMLElement; setExcerpt(citation); };
  const closeExcerpt = () => { setExcerpt(null); queueMicrotask(() => excerptTrigger.current?.focus()); };
  const score = studySummary(attempts);
  const citationInSources = (citation: Citation) => sources.some(source => source.id === citation.sourceId && source.title === citation.title && source.chunks.some(chunk => chunk.label === citation.label && chunk.text === citation.excerpt));
  const visibleAnswer = answer ? { ...answer, citations: answer.citations.filter(citationInSources) } : null;
  const hasValidAnswerCitation = Boolean(visibleAnswer && validStudyCitationNumbers(visibleAnswer.text, visibleAnswer.citations).length);
  // The existing device draft format is unchanged; this Study Lab key now also syncs with the learner account.
  useEffect(() => { try { persistLearnerData(draftKey, JSON.stringify({ query, answer, question, selected, difficulty })); } catch {} }, [draftKey, query, answer, question, selected, difficulty]);
  const save = (next: StudySource[]) => { writeStudySources(profileId, next); setSources(next); };
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true); setError(''); setNotice('Reading study material…');
    try {
      const source = await importStudyFile(file, kind, { useGeminiMedia, connection });
      save([...sources, source]); setNotice(`${source.title} added with ${source.chunks.length} readable sections.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not read the file.'); setNotice(''); }
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
    try { const next = await createStudyQuestion(connection, sources, query.trim() || 'key concepts from these materials', difficulty, language, attempts.map(item => item.prompt).filter((prompt): prompt is string => Boolean(prompt))); setQuestion(next); setSelected(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create a question.'); }
    finally { setBusy(false); }
  };
  const choose = (index: number) => {
    if (!question || selected !== null) return;
    setSelected(index);
    const correct = index === question.correctIndex;
    try { setAttempts(saveStudyAttempt(profileId, { id: createId(), sourceId: question.citation.sourceId, topic: query.trim() || question.prompt, difficulty: question.difficulty, correct, timestamp: Date.now(), prompt: question.prompt })); }
    catch { setError('Your answer was checked, but progress could not be saved on this device.'); }
    setDifficulty(nextDifficulty(correct, question.difficulty));
  };
  return <div className="study-lab study-workspace mx-auto max-w-6xl p-4 sm:p-8 lg:p-10">
    <header className="study-hero"><div><span className="study-pill">STUDY SPACE</span><h1>Make sense of what <em>you’re learning.</em></h1><p>Bring your course material together. Ask better questions, find the source, and practice at your own pace.</p></div><div className="study-hero-art" aria-hidden="true"><span>01 <strong>Read with purpose</strong></span><span>02 <strong>Ask & explore</strong></span><span>03 <strong>Practice & grow</strong></span></div></header>
    <nav className="study-tabs" aria-label="Study Lab sections">{views.map(item => <button type="button" key={item.id} className={view === item.id ? 'active' : ''} aria-current={view === item.id ? 'page' : undefined} onClick={() => { setView(item.id); setError(''); }}>{item.title}</button>)}</nav>
    {notice && <p role="status" className="study-message success">{notice}</p>}{error && <p role="alert" className="study-message error">{error}</p>}{busy && <p role="status" className="study-message">{t('studyWorking')}</p>}
    <ProviderRecovery connection={connection} error={error} onOpenProvider={onOpenProvider} practice="You can read your uploaded sources, existing answer, and completed practice without AI."/>
    {!connection.key && (view === 'ask' || view === 'practice') && <p className="study-message">Connect an AI provider to ask or generate source-grounded practice. <button type="button" onClick={onOpenProvider}>Open AI Provider</button></p>}
    {view === 'sources' && <section className="study-panel"><div className="study-section-head"><div><p className="study-overline">YOUR LIBRARY</p><h2>Start with your material</h2><p>Add a file and review its readable pages, slides, or sections.</p></div><span className="study-count">{sources.length} {sources.length === 1 ? 'source' : 'sources'}</span></div>
      <div className="study-upload"><FileText aria-hidden="true"/><label htmlFor="study-file">Choose a file to add</label><input id="study-file" type="file" accept=".pdf,.pptx,.txt,.md,.srt,.vtt,.mp4,.webm" disabled={busy} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }}/><small>Text-selectable PDF, PPTX, TXT, MD, SRT or VTT · Up to 12 MB</small></div>
      <div className="study-upload-options"><label className="profile-field"><span>{t('studyKind')}</span><select value={kind} onChange={event => setKind(event.target.value as StudyKind)}><option value="textbook">{t('studyTextbook')}</option><option value="slides">{t('studySlides')}</option><option value="lecture">{t('lecture')}</option></select></label><label className="study-media-option"><input type="checkbox" checked={useGeminiMedia} onChange={event => setUseGeminiMedia(event.target.checked)}/><span>{t('studyMediaConsent')}</span></label></div><p className="study-help">{t('studyPrivacy')}</p>
      <div className="study-source-list">{sources.length ? sources.map(source => <article className="study-source-card" key={source.id}><div className="study-source-title"><FileText aria-hidden="true"/><div><h3>{source.title}</h3><p>{source.kind} · {source.chunks.length} readable sections</p></div><button type="button" onClick={() => { try { save(sources.filter(item => item.id !== source.id)); setAnswer(null); setQuestion(null); setNotice('Source removed.'); } catch { setError('Could not update the source library.'); } }} aria-label={`Remove ${source.title}`}>Remove</button></div><details><summary>Review source excerpts</summary>{source.chunks.map(chunk => <div className="study-source-excerpt" key={chunk.id}><strong>{chunk.label}</strong><p>{chunk.text}</p></div>)}</details></article>) : <p className="study-empty"><BookOpen aria-hidden="true"/>No materials yet. Add a readable file to begin.</p>}</div>
    </section>}
    {view === 'ask' && <section className="study-panel"><div className="study-section-head"><div><p className="study-overline">ASK & EXPLORE</p><h2>Ask your material</h2><p>Answers use relevant passages from your sources and your selected AI provider.</p></div><Sparkles aria-hidden="true"/></div><form onSubmit={ask} className="study-question-form"><label htmlFor="study-query">Your question</label><textarea id="study-query" value={query} onChange={event => setQuery(event.target.value)} rows={4} placeholder="What are the key ideas in these materials?"/><button type="submit" className="study-primary" disabled={busy || providerWaiting || !sources.length || !connection.key || !query.trim()}>{t('studyAskButton')} <ArrowRight size={17} aria-hidden="true"/></button></form>{visibleAnswer && <article className="study-answer"><p className="study-overline">SOURCE-GROUNDED ANSWER</p><AnswerText answer={visibleAnswer} open={openExcerpt}/>{hasValidAnswerCitation ? <p className="study-help">Select a citation in the answer to read its supporting excerpt.</p> : <p className="study-no-citation">No valid source citation was returned. Check this answer against your materials.</p>}</article>}</section>}
    {view === 'practice' && <section className="study-panel"><div className="study-section-head"><div><p className="study-overline">PRACTICE & GROW</p><h2>Practice, one step at a time</h2><p>One four-choice question at a time, based on your source excerpts.</p></div><span className="study-level">{difficulty}</span></div><div className="study-practice-summary"><span>{score.correct} correct of {score.total} attempts</span><button type="button" className="study-primary" disabled={busy || providerWaiting || !sources.length || !connection.key} onClick={() => void makeQuestion()}>{question ? t('studyNext') : t('studyStart')} <ArrowRight size={17} aria-hidden="true"/></button></div>{question ? <div className="study-practice-card"><p className="study-overline">{question.difficulty} · FOUR CHOICES</p><h3>{question.prompt}</h3><div className="study-choices">{question.options.map((option, index) => <button type="button" key={index} disabled={selected !== null} className={selected !== null && index === question.correctIndex ? 'correct' : selected === index ? 'incorrect' : ''} onClick={() => choose(index)}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>{selected !== null && <div role="status" className="study-feedback"><strong>{selected === question.correctIndex ? 'Correct.' : 'Keep practicing.'}</strong><p>{question.explanation}</p><details><summary>Supporting evidence · {question.citation.title}, {question.citation.label}</summary><p>{question.citation.excerpt}</p></details><small>Your next question will be {difficulty} level.</small></div>}</div> : <div className="study-empty"><Sparkles aria-hidden="true"/><h3>Ready when you are</h3><p>Add a source and generate a question from its readable content.</p></div>}</section>}
    {view === 'progress' && <section className="study-panel"><div className="study-section-head"><div><p className="study-overline">YOUR PROGRESS</p><h2>Keep the momentum.</h2><p>Every completed question shows what you remember and what to revisit.</p></div></div><div className="study-stats"><div><strong>{score.total}</strong><span>Practice attempts</span></div><div><strong>{score.total ? Math.round(score.correct / score.total * 100) : 0}%</strong><span>Overall accuracy</span></div><div><strong>{difficulty}</strong><span>Current level</span></div><div><strong>{score.recentAccuracy}%</strong><span>Last 10 accuracy</span></div></div><h3 className="study-progress-title">Topics to revisit</h3>{score.topics.length ? <ul className="study-topic-list">{score.topics.map(topic => <li key={topic.topic}><span>{topic.topic}</span><strong>{topic.correct}/{topic.total} correct · {topic.accuracy}%</strong></li>)}</ul> : <p className="study-empty">Your completed practice will appear here.</p>}{score.topics.length > 0 && <p className="study-help">Topics are ordered by practice accuracy. This is an attempt summary, not a validated mastery estimate.</p>}{attempts.length > 0 && <div className="study-recent"><h3>Recent attempts</h3>{attempts.slice(0, 6).map(item => <p key={item.id}>{item.correct ? 'Correct' : 'Review'} · {item.difficulty} · {item.topic}</p>)}</div>}</section>}
    {excerpt && <div className="study-excerpt-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeExcerpt(); }}><div className="study-excerpt-dialog" role="dialog" aria-modal="true" aria-label={`Source excerpt from ${excerpt.title}`} onKeyDown={event => { if (event.key === 'Escape') closeExcerpt(); }}><button type="button" autoFocus className="study-excerpt-close" onClick={closeExcerpt}>Close</button><p className="study-overline">SOURCE EXCERPT [{excerpt.number}]</p><h2>{excerpt.title}</h2><p className="study-help">{excerpt.label}</p><p>{excerpt.excerpt}</p></div></div>}
  </div>;
}
