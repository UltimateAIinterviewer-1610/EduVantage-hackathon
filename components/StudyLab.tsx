import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, FileText, Sparkles } from 'lucide-react';
import { createId } from '../services/id';
import type { AIConnection } from '../services/aiConnection';
import { persistLearnerData } from '../services/cloud';
import { type StudyKind, type StudySource, importStudyFile, readStudySources, writeStudySources, studyTopics } from '../services/studySources';
import { type Citation, type StudyAnswer, type StudyQuestion, type StudyQuestionVerification, askStudySources, createStudyQuestion, nextDifficulty, validStudyCitationNumbers, verifyStudyQuestion } from '../services/studyAI';
import { readStudyProgress, saveStudyAttempt, studySummary, topicMastery } from '../services/studyProgress';
import { useUi } from '../uiText';
import ProviderRecovery, { useProviderWait } from './ProviderRecovery';
import StudyAssessmentPanel from './StudyAssessmentPanel';
import { buildStudyConcepts } from '../services/studyConcepts';
import { revisionCards, revisionSchedule } from '../services/studyRevision';
import { cacheStudyOriginal, getStudyOriginal, removeStudyOriginal, retryPendingStudyOriginalRemovals, studyOriginalFragment, uploadStudyOriginal } from '../services/studyOriginals';

type View = 'sources' | 'topics' | 'ask' | 'practice' | 'assessment' | 'progress';
const views: { id: View; title: string }[] = [
  { id: 'sources', title: 'My sources' }, { id: 'topics', title: 'Topic map' }, { id: 'ask', title: 'Ask a question' },
  { id: 'practice', title: 'Practice' }, { id: 'assessment', title: 'Mini assessment' }, { id: 'progress', title: 'Progress' },
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
  const [answerTopic, setAnswerTopic] = useState<string>(draft.answerTopic || '');
  const [ratedAnswer, setRatedAnswer] = useState<boolean>(Boolean(draft.ratedAnswer));
  const [question, setQuestion] = useState<StudyQuestion | null>(draft.question || null);
  const [questionVerification, setQuestionVerification] = useState<StudyQuestionVerification | null>(draft.questionVerification || null);
  const [selected, setSelected] = useState<number | null>(draft.selected ?? null);
  const [difficulty, setDifficulty] = useState<StudyQuestion['difficulty']>(draft.difficulty || 'foundation');
  const [practiceTopic, setPracticeTopic] = useState<string>(draft.practiceTopic || '');
  const [examDate, setExamDate] = useState<string>(draft.examDate || '');
  const [attempts, setAttempts] = useState(() => readStudyProgress(profileId));
  const [excerpt, setExcerpt] = useState<Citation | null>(null);
  const [originalLink, setOriginalLink] = useState<{ sourceId: string; url: string; download: boolean } | null>(null);
  useEffect(() => {
    const retry = () => { void retryPendingStudyOriginalRemovals(profileId).catch(() => {}); };
    retry();
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [profileId]);
  useEffect(() => () => { if (originalLink) URL.revokeObjectURL(originalLink.url.split('#')[0]); }, [originalLink]);
  const excerptTrigger = useRef<HTMLElement | null>(null);
  const openExcerpt = (citation: Citation) => { excerptTrigger.current = document.activeElement as HTMLElement; setOriginalLink(null); setExcerpt(citation); };
  const closeExcerpt = () => { setExcerpt(null); queueMicrotask(() => excerptTrigger.current?.focus()); };
  const score = studySummary(attempts);
  const mastery = topicMastery(attempts);
  const availableTopics = studyTopics(sources);
  const suggestedTopic = mastery.find(item => availableTopics.includes(item.topic))?.topic || '';
  const concepts = buildStudyConcepts(sources);
  const cards = revisionCards(sources, attempts);
  const schedule = examDate ? revisionSchedule(attempts, examDate) : [];
  const citationInSources = (citation: Citation) => sources.some(source => source.id === citation.sourceId && source.title === citation.title && source.chunks.some(chunk => chunk.label === citation.label && chunk.text === citation.excerpt));
  const visibleAnswer = answer ? { ...answer, citations: answer.citations.filter(citationInSources) } : null;
  const hasValidAnswerCitation = Boolean(visibleAnswer && validStudyCitationNumbers(visibleAnswer.text, visibleAnswer.citations).length);
  // The existing device draft format is unchanged; this Study Lab key now also syncs with the learner account.
  useEffect(() => { try { persistLearnerData(draftKey, JSON.stringify({ query, answer, answerTopic, ratedAnswer, question, questionVerification, selected, difficulty, practiceTopic, examDate })); } catch {} }, [draftKey, query, answer, answerTopic, ratedAnswer, question, questionVerification, selected, difficulty, practiceTopic, examDate]);
  const save = (next: StudySource[]) => { writeStudySources(profileId, next); setSources(next); };
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true); setError(''); setNotice('Reading study material…');
    try {
      const source = await importStudyFile(file, kind, { useGeminiMedia, connection });
      save([...sources, source]);
      const localCopy = await cacheStudyOriginal(profileId, source.id, file).catch(() => false);
      let syncedPath: string | null = null;
      try { syncedPath = await uploadStudyOriginal(source.id, file); }
      catch { setNotice(`${source.title} added with ${source.chunks.length} readable sections. Original-file sync is unavailable; its excerpts are saved${localCopy ? ' and the original is on this device' : ''}.`); return; }
      if (syncedPath) save([...sources, { ...source, originalPath: syncedPath }]);
      setNotice(`${source.title} added with ${source.chunks.length} readable sections.${syncedPath ? ' Original file synced privately.' : localCopy ? ' Original file saved on this device.' : ' Original file could not be retained.'}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not read the file.'); setNotice(''); }
    finally { setBusy(false); }
  };
  const removeSource = async (source: StudySource) => {
    setBusy(true); setError('');
    try {
      const cloudRemoved = await removeStudyOriginal(profileId, source.id, source.originalPath);
      save(sources.filter(item => item.id !== source.id));
      setAnswer(null); setQuestion(null); setQuestionVerification(null); setOriginalLink(null); setNotice(cloudRemoved ? 'Source removed.' : 'Source removed here. The private original file will be deleted when you return online on this device.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove this source.'); }
    finally { setBusy(false); }
  };
  const prepareOriginal = async (source: StudySource, label = '') => {
    setBusy(true); setError(''); setOriginalLink(null);
    try {
      const blob = await getStudyOriginal(profileId, source.id, source.originalPath);
      if (!blob) throw new Error('The original file is unavailable here. The saved excerpt remains available.');
      const url = URL.createObjectURL(blob) + studyOriginalFragment(label);
      setOriginalLink({ sourceId: source.id, url, download: /\.pptx$/i.test(source.title) });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open the original file.'); }
    finally { setBusy(false); }
  };
  const ask = async (event: React.FormEvent) => {
    event.preventDefault(); if (!query.trim()) return;
    setBusy(true); setError('');
    try { const next = await askStudySources(connection, sources, query.trim(), language); setAnswer(next); setAnswerTopic(query.trim()); setRatedAnswer(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not answer yet.'); }
    finally { setBusy(false); }
  };
  const rateConversation = (understood: boolean) => {
    if (!answer || ratedAnswer) return;
    try {
      const cited = answer.citations[0];
      const sourceTopic = sources.find(source => source.id === cited?.sourceId)?.chunks.find(chunk => chunk.label === cited?.label)?.topic;
      setAttempts(saveStudyAttempt(profileId, { id: createId(), sourceId: cited?.sourceId || '', topic: sourceTopic || answerTopic || 'General concepts', difficulty: 'foundation', correct: understood, timestamp: Date.now(), kind: 'conversation' }));
      setRatedAnswer(true);
    } catch { setError('Your self-check could not be saved on this device.'); }
  };
  const makeQuestion = async () => {
    setBusy(true); setError('');
    try { const next = await createStudyQuestion(connection, sources, practiceTopic.trim() || suggestedTopic || 'key concepts from these materials', difficulty, language, attempts.map(item => item.prompt).filter((prompt): prompt is string => Boolean(prompt))); setQuestion(next); setQuestionVerification(null); setSelected(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create a question.'); }
    finally { setBusy(false); }
  };
  const verifyQuestion = async () => {
    if (!question || !citationInSources(question.citation)) return;
    setBusy(true); setError('');
    try { setQuestionVerification(await verifyStudyQuestion(connection, question)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not verify this question.'); }
    finally { setBusy(false); }
  };
  const choose = (index: number) => {
    if (!question || selected !== null) return;
    setSelected(index);
    const correct = index === question.correctIndex;
    try { setAttempts(saveStudyAttempt(profileId, { id: createId(), sourceId: question.citation.sourceId, topic: question.topic || question.citation.title, difficulty: question.difficulty, correct, timestamp: Date.now(), prompt: question.prompt })); }
    catch { setError('Your answer was checked, but progress could not be saved on this device.'); }
    setDifficulty(nextDifficulty(correct, question.difficulty));
  };
  return <div className="study-lab study-workspace mx-auto max-w-6xl p-4 sm:p-8 lg:p-10">
    <header className="study-hero"><div><span className="study-pill">STUDY SPACE</span><h1>Make sense of what <em>you’re learning.</em></h1><p>Bring your course material together. Ask better questions, find the source, and practice at your own pace.</p></div><div className="study-hero-art" aria-hidden="true"><span>01 <strong>Read with purpose</strong></span><span>02 <strong>Ask & explore</strong></span><span>03 <strong>Practice & grow</strong></span></div></header>
    <nav className="study-tabs" aria-label="Study Lab sections">{views.map(item => <button type="button" key={item.id} className={view === item.id ? 'active' : ''} aria-current={view === item.id ? 'page' : undefined} onClick={() => { setView(item.id); setError(''); }}>{item.title}</button>)}</nav>
    {notice && <p role="status" className="study-message success">{notice}</p>}{error && <p role="alert" className="study-message error">{error}</p>}{busy && <p role="status" className="study-message">{t('studyWorking')}</p>}
    <ProviderRecovery connection={connection} error={error} onOpenProvider={onOpenProvider} practice="You can read your uploaded sources, existing answer, and completed practice without AI."/>
    {view === 'practice' && suggestedTopic && !practiceTopic.trim() && <p className="study-help">Suggested next topic from your saved answers: {suggestedTopic}. Choose a different topic at any time.</p>}
    {!connection.key && (view === 'ask' || view === 'practice' || view === 'assessment') && <p className="study-message">Connect an AI provider to ask or generate source-grounded practice. <button type="button" onClick={onOpenProvider}>Open AI Provider</button></p>}
    {view === 'sources' && <section className="study-panel"><div className="study-section-head"><div><p className="study-overline">YOUR LIBRARY</p><h2>Start with your material</h2><p>Add a file and review its readable pages, slides, or sections.</p></div><span className="study-count">{sources.length} {sources.length === 1 ? 'source' : 'sources'}</span></div>
      <div className="study-upload"><FileText aria-hidden="true"/><label htmlFor="study-file">Choose a file to add</label><input id="study-file" type="file" accept=".pdf,.pptx,.txt,.md,.srt,.vtt,.mp4,.webm" disabled={busy} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }}/><small>Text-selectable PDF, PPTX, TXT, MD, SRT or VTT · Up to 12 MB</small></div>
      <div className="study-upload-options"><label className="profile-field"><span>{t('studyKind')}</span><select value={kind} onChange={event => setKind(event.target.value as StudyKind)}><option value="textbook">{t('studyTextbook')}</option><option value="slides">{t('studySlides')}</option><option value="lecture">{t('lecture')}</option></select></label><label className="study-media-option"><input type="checkbox" checked={useGeminiMedia} onChange={event => setUseGeminiMedia(event.target.checked)}/><span>{t('studyMediaConsent')}</span></label></div><p className="study-help">{t('studyPrivacy')} When enabled, Gemini also inspects up to 12 PDF pages or slide images for diagrams and figures. Each inspection may use provider quota; only select this when you want to send those pages or images to Google.</p>
      <div className="study-source-list">{sources.length ? sources.map(source => <article className="study-source-card" key={source.id}><div className="study-source-title"><FileText aria-hidden="true"/><div><h3>{source.title}</h3><p>{source.kind} · {source.chunks.length} readable sections</p></div><button type="button" disabled={busy} onClick={() => void removeSource(source)} aria-label={`Remove ${source.title}`}>Remove</button></div><div className="study-practice-summary"><button type="button" disabled={busy} onClick={() => void prepareOriginal(source)}>Prepare original file</button>{originalLink?.sourceId === source.id && <a href={originalLink.url} target="_blank" rel="noopener noreferrer" download={originalLink.download ? source.title : undefined}>{originalLink.download ? 'Download original slides' : 'Open original file'}</a>}</div><details><summary>Review source excerpts</summary>{source.chunks.map(chunk => <div className="study-source-excerpt" key={chunk.id}><strong>{chunk.label}</strong><p>{chunk.text}</p></div>)}</details></article>) : <p className="study-empty"><BookOpen aria-hidden="true"/>No materials yet. Add a readable file to begin.</p>}</div>
    </section>}
    {view === 'topics' && <section className="study-panel"><div className="study-section-head"><div><p className="study-overline">YOUR MATERIAL MAP</p><h2>Topics and source locations</h2><p>These labels are extracted from headings and opening text. Prerequisites appear only when your material states them explicitly.</p></div></div>{concepts.length ? <ol className="study-topic-list">{concepts.map(concept => <li key={concept.topic}><div><strong>{concept.topic}</strong><p>{concept.locations.map(location => `${location.title} · ${location.label}`).join('; ')}</p>{concept.prerequisites.length > 0 && <p>Before this: {concept.prerequisites.join(', ')}</p>}</div><button type="button" onClick={() => { setPracticeTopic(concept.topic); setView('practice'); }}>Practise topic</button></li>)}</ol> : <p className="study-empty">Add a readable source to see its topic map.</p>}</section>}
    {view === 'ask' && <section className="study-panel"><div className="study-section-head"><div><p className="study-overline">ASK & EXPLORE</p><h2>Ask your material</h2><p>Answers use relevant passages from your sources and your selected AI provider.</p></div><Sparkles aria-hidden="true"/></div><form onSubmit={ask} className="study-question-form"><label htmlFor="study-query">Your question</label><textarea id="study-query" value={query} onChange={event => setQuery(event.target.value)} rows={4} placeholder="What are the key ideas in these materials?"/><button type="submit" className="study-primary" disabled={busy || providerWaiting || !sources.length || !connection.key || !query.trim()}>{t('studyAskButton')} <ArrowRight size={17} aria-hidden="true"/></button></form>{visibleAnswer && <article className="study-answer"><p className="study-overline">SOURCE-GROUNDED ANSWER</p><AnswerText answer={visibleAnswer} open={openExcerpt}/>{hasValidAnswerCitation ? <p className="study-help">Select a citation in the answer to read its supporting excerpt.</p> : <p className="study-no-citation">No valid source citation was returned. Check this answer against your materials.</p>}{hasValidAnswerCitation && !ratedAnswer && <div className="study-practice-summary"><span>Self-check: do you understand this answer?</span><button type="button" onClick={() => rateConversation(true)}>Yes</button><button type="button" onClick={() => rateConversation(false)}>Not yet</button></div>}{ratedAnswer && <p className="study-help">Your self-check was saved. It helps choose topics to revisit; it is not an assessed answer.</p>}</article>}</section>}
    {view === 'practice' && <section className="study-panel"><div className="study-section-head"><div><p className="study-overline">PRACTICE & GROW</p><h2>Practice, one step at a time</h2><p>{score.total ? 'One four-choice question at a time, based on your source excerpts.' : 'New here? Your first question is a diagnostic starting point. Your next difficulty adjusts from your answer.'}</p></div><span className="study-level">{difficulty}</span></div><label className="profile-field"><span>Topic to practise</span><input list="study-topic-options" value={practiceTopic} onChange={event => setPracticeTopic(event.target.value)} placeholder="Choose a source topic or enter one"/><datalist id="study-topic-options">{availableTopics.map(topic => <option key={topic} value={topic}/>)}</datalist></label><div className="study-practice-summary"><span>{score.correct} correct of {score.total} attempts</span><button type="button" className="study-primary" disabled={busy || providerWaiting || !sources.length || !connection.key} onClick={() => void makeQuestion()}>{question ? t('studyNext') : t('studyStart')} <ArrowRight size={17} aria-hidden="true"/></button></div>{question ? <div className="study-practice-card"><p className="study-overline">{question.difficulty} · FOUR CHOICES</p><h3>{question.prompt}</h3><p className="study-help">The quoted evidence is checked against your source. For an optional second AI check of the designated answer, select Verify source support; it uses one additional provider request.</p><button type="button" disabled={busy || providerWaiting || !connection.key || !citationInSources(question.citation)} onClick={() => void verifyQuestion()}>Verify source support (extra AI request)</button>{questionVerification && <p role="status" className={questionVerification.supported ? 'study-message success' : 'study-message error'}>{questionVerification.supported ? 'Second AI check found supporting evidence.' : 'Second AI check could not confirm support.'} {questionVerification.reason} This check is not independent proof of correctness.</p>}<div className="study-choices">{question.options.map((option, index) => <button type="button" key={index} disabled={selected !== null || busy} className={selected !== null && index === question.correctIndex ? 'correct' : selected === index ? 'incorrect' : ''} onClick={() => choose(index)}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>{selected !== null && <div role="status" className="study-feedback"><strong>{selected === question.correctIndex ? 'Correct.' : 'Keep practicing.'}</strong><p>{question.explanation}</p><details><summary>Supporting evidence · {question.citation.title}, {question.citation.label}</summary><p>{question.evidenceQuote || question.citation.excerpt}</p></details><small>Your next question will be {difficulty} level.</small></div>}</div> : <div className="study-empty"><Sparkles aria-hidden="true"/><h3>Ready when you are</h3><p>Add a source and generate a question from its readable content.</p></div>}</section>}
    {view === 'assessment' && <StudyAssessmentPanel profileId={profileId} connection={connection} language={language} sources={sources} topic={practiceTopic || suggestedTopic} attempts={attempts} onAttempts={setAttempts}/> }
    {view === 'progress' && <section className="study-panel"><div className="study-section-head"><div><p className="study-overline">YOUR PROGRESS</p><h2>Keep the momentum.</h2><p>Every completed question shows what you remember and what to revisit.</p></div></div><div className="study-stats"><div><strong>{score.total}</strong><span>Practice attempts</span></div><div><strong>{score.total ? Math.round(score.correct / score.total * 100) : 0}%</strong><span>Overall accuracy</span></div><div><strong>{difficulty}</strong><span>Current level</span></div><div><strong>{score.recentAccuracy}%</strong><span>Last 10 accuracy</span></div></div><h3 className="study-progress-title">Topics to revisit</h3>{mastery.length ? <ul className="study-topic-list">{mastery.map(item => <li key={item.topic}><span>{item.topic}</span><strong>{item.estimate}% estimated familiarity · {item.observations} {item.observations === 1 ? 'observation' : 'observations'}</strong></li>)}</ul> : <p className="study-empty">Your completed practice will appear here.</p>}{mastery.length > 0 && <p className="study-help">This estimate uses your answers to guide practice; it is not a validated exam score. Lower estimates appear first.</p>}{cards.length > 0 && <div className="study-recent"><h3>Revision cards</h3><p>Review these source excerpts, beginning with weaker topics.</p>{cards.map((card, index) => <details key={`${card.source}-${card.label}-${index}`}><summary>{card.prompt}</summary><p>{card.excerpt}</p><small>{card.source} · {card.label}</small></details>)}</div>}{mastery.length > 0 && <div className="study-recent"><h3>Study plan</h3><label className="profile-field"><span>Exam date</span><input type="date" value={examDate} onChange={event => setExamDate(event.target.value)}/></label>{examDate && (schedule.length ? <ol>{schedule.map((item, index) => <li key={index}>{item.day}: revisit {item.topics.join(', ')}</li>)}</ol> : <p>Choose a future exam date to see a plan.</p>)}<p className="study-help">This plan prioritizes your lower estimated topics and spaces review days. It does not predict exam performance.</p></div>}{attempts.length > 0 && <div className="study-recent"><h3>Recent attempts</h3>{attempts.slice(0, 6).map(item => <p key={item.id}>{item.correct ? 'Correct' : 'Review'} · {item.difficulty} · {item.topic}</p>)}</div>}</section>}
    {excerpt && <div className="study-excerpt-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeExcerpt(); }}><div className="study-excerpt-dialog" role="dialog" aria-modal="true" aria-label={`Source excerpt from ${excerpt.title}`} onKeyDown={event => { if (event.key === 'Escape') closeExcerpt(); }}><button type="button" autoFocus className="study-excerpt-close" onClick={closeExcerpt}>Close</button><p className="study-overline">SOURCE EXCERPT [{excerpt.number}]</p><h2>{excerpt.title}</h2><p className="study-help">{excerpt.label}</p><p>{excerpt.excerpt}</p>{sources.find(source => source.id === excerpt.sourceId) && <div className="study-practice-summary"><button type="button" disabled={busy} onClick={() => void prepareOriginal(sources.find(source => source.id === excerpt.sourceId)!, excerpt.label)}>Prepare original location</button>{originalLink?.sourceId === excerpt.sourceId && <a href={originalLink.url} target="_blank" rel="noopener noreferrer" download={originalLink.download ? excerpt.title : undefined}>{originalLink.download ? 'Download original slides and open the labelled slide' : excerpt.label.startsWith('AI-estimated timestamp') ? 'Open near AI-estimated time' : 'Open original at labelled location'}</a>}</div>}</div></div>}
  </div>;
}
