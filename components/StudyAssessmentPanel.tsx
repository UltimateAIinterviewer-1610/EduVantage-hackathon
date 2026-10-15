import React, { useEffect, useState } from 'react';
import type { AIConnection } from '../services/aiConnection';
import { createId } from '../services/id';
import { createStudyAssessment, gradeAssessmentResponse, type AssessmentQuestion } from '../services/studyAssessment';
import type { StudySource } from '../services/studySources';
import { saveStudyAttempt, type StudyAttempt } from '../services/studyProgress';
import { readAssessmentDraft, readAssessmentReports, saveAssessmentDraft, saveAssessmentReport } from '../services/studyAssessmentProgress';

export default function StudyAssessmentPanel({ profileId, connection, language, sources, topic, attempts, onAttempts }: { profileId: string; connection: AIConnection; language: string; sources: StudySource[]; topic: string; attempts: StudyAttempt[]; onAttempts: (items: StudyAttempt[]) => void }) {
  const [draft] = useState(() => readAssessmentDraft(profileId));
  const [questions, setQuestions] = useState<AssessmentQuestion[]>(draft?.questions || []);
  const [reports, setReports] = useState(() => readAssessmentReports(profileId));
  const [index, setIndex] = useState(draft?.index || 0);
  const [response, setResponse] = useState(draft?.response || '');
  const [answers, setAnswers] = useState<{ correct: boolean; response: string }[]>(draft?.answers || []);
  const [showKey, setShowKey] = useState(draft?.showKey || false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = questions[index];
  const finished = questions.length > 0 && index >= questions.length;
  useEffect(() => { if (questions.length) saveAssessmentDraft(profileId, { questions, index, response, answers, showKey }); }, [profileId, questions, index, response, answers, showKey]);
  const start = async () => {
    setBusy(true); setError('');
    try {
      const next = await createStudyAssessment(connection, sources, topic.trim() || 'key concepts from these materials', language, attempts.map(item => item.prompt).filter((prompt): prompt is string => Boolean(prompt)));
      setQuestions(next); setIndex(0); setResponse(''); setAnswers([]); setShowKey(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create an assessment.'); }
    finally { setBusy(false); }
  };
  const finishAnswer = (correct: boolean) => {
    if (!current || answers.length !== index) return;
    try {
      const saved = saveStudyAttempt(profileId, { id: createId(), sourceId: current.citation.sourceId, topic: current.topic, difficulty: current.difficulty, correct, timestamp: Date.now(), prompt: current.prompt });
      onAttempts(saved);
      setAnswers([...answers, { correct, response }]);
      setShowKey(true);
    } catch { setError('The answer could not be saved. Try again before continuing.'); }
  };
  const continueAssessment = () => {
    if (index + 1 >= questions.length) {
      try {
        setReports(saveAssessmentReport(profileId, { id: createId(), completedAt: Date.now(), topic: topic.trim() || 'General concepts', results: questions.map((question, questionIndex) => ({ prompt: question.prompt, topic: question.topic, correct: Boolean(answers[questionIndex]?.correct), sourceId: question.citation.sourceId, sourceLabel: question.citation.label, explanation: question.explanation })) }));
      } catch { setError('The report could not be saved. Try again before leaving this assessment.'); return; }
    }
    setIndex(index + 1); setResponse(''); setShowKey(false);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!current || !response.trim()) return;
    const result = gradeAssessmentResponse(current, response);
    if (result !== null) finishAnswer(result);
    else setShowKey(true);
  };
  return <section className="study-panel" aria-label="Mini assessment">
    <div className="study-section-head"><div><p className="study-overline">CHECK YOUR UNDERSTANDING</p><h2>Mini assessment</h2><p>Questions come from your uploaded material. Each shows the supporting passage.</p></div></div>
    {error && <p className="study-message error" role="alert">{error}</p>}
    {!questions.length && <div className="study-empty"><p>Choose a topic in Practice, then create a mixed assessment with multiple-choice and short-answer questions. A numerical problem appears only when the material supports one.</p><button type="button" className="study-primary" disabled={busy || !sources.length || !connection.key} onClick={() => void start()}>{busy ? 'Creating assessment…' : 'Create mini assessment'}</button></div>}
    {current && <article className="study-practice-card"><p className="study-overline">QUESTION {index + 1} OF {questions.length} · {current.format} · {current.difficulty}</p><h3>{current.prompt}</h3><form onSubmit={submit}>
      {current.options ? <div className="study-choices">{current.options.map((option, optionIndex) => <label key={optionIndex}><input type="radio" name={`exam-${current.id}`} value={String(optionIndex)} checked={response === String(optionIndex)} disabled={answers.length > index} onChange={event => setResponse(event.target.value)}/><span>{option}</span></label>)}</div> : <label className="profile-field"><span>Your {current.format === 'numerical' ? 'number' : 'short answer'}</span><input type={current.format === 'numerical' ? 'number' : 'text'} step="any" value={response} disabled={showKey} onChange={event => setResponse(event.target.value)}/></label>}
      {!showKey && <button type="submit" className="study-primary" disabled={!response.trim()}>Check answer</button>}
    </form>
    {showKey && <div role="status" className="study-feedback"><strong>Reference answer: {current.answer}</strong><p>{current.explanation}</p><details><summary>Source evidence · {current.citation.title}, {current.citation.label}</summary><p>{current.evidenceQuote}</p></details>
      {current.format === 'short-answer' && answers.length === index && <div className="study-practice-summary"><span>Compare your answer with the reference and mark your result:</span><button type="button" onClick={() => finishAnswer(true)}>I got it right</button><button type="button" onClick={() => finishAnswer(false)}>I need review</button></div>}
      {answers.length > index && <><p>{answers[index].correct ? 'Recorded as correct.' : 'Recorded for review.'}</p><button type="button" className="study-primary" onClick={continueAssessment}>Continue</button></>}
    </div>}</article>}
    {finished && <div className="study-feedback" role="status"><h3>Assessment report</h3><p>{answers.filter(answer => answer.correct).length} of {answers.length} recorded correct.</p>{questions.map((question, questionIndex) => <p key={question.id}>{answers[questionIndex]?.correct ? '✓' : 'Review'} · {question.topic} · {question.difficulty} · {question.citation.label}{!answers[questionIndex]?.correct ? ` — ${question.explanation}` : ''}</p>)}<button type="button" className="study-primary" disabled={busy} onClick={() => void start()}>New assessment</button></div>}
    {reports.length > 0 && <div className="study-recent"><h3>Recent assessments</h3>{reports.slice(0, 5).map(report => <p key={report.id}>{new Date(report.completedAt).toLocaleDateString()} · {report.topic} · {report.results.filter(result => result.correct).length}/{report.results.length} correct</p>)}</div>}
  </section>;
}
