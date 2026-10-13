import { createId } from '../services/id';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Mic, MicOff, Send, Square, Volume2, VolumeX } from 'lucide-react';
import { Course, LanguageCode, SessionRecord, StudentProfile, Teacher, WhiteboardContent } from '../types';
import { LessonPlan } from '../learningPaths';
import { AIConnection, ChatMessage, providerLabel, sendAIChat } from '../services/aiConnection';
import { readHistory, readNotes } from '../services/storage';
import { ALL_LANGUAGES } from '../languages';
import { useDisplayText, useUi } from '../uiText';
import { lessonSourceContext, readStudySources } from '../services/studySources';
import { persistLearnerData } from '../services/cloud';
import TeachingBoard from './TeachingBoard';
import TeacherAvatar from './TeacherAvatar';
import ThemeSelector from './ThemeSelector';
import { parseTeachingStep, teachingBoardInstruction } from '../services/teachingBoard';
import { classroomVoiceLocale, matchingClassroomVoices, preferredClassroomVoice } from '../services/classroomVoice';
import { teachingLanguageStyle } from '../services/teachingLanguage';
import ProviderRecovery, { useProviderWait } from './ProviderRecovery';
interface Props {course:Course;teacher:Teacher;lessonPlan:LessonPlan;student:StudentProfile;language:LanguageCode;connection:AIConnection;onExit:()=>void;onOpenProvider:()=>void}
export default function TextClassroom({course,teacher,lessonPlan,student,language,connection,onExit,onOpenProvider}:Props) {
 const checkpointKey=`edu_text_classroom_${student.id}`;
 const [checkpoint]=useState(()=>{try{const value=JSON.parse(localStorage.getItem(checkpointKey)||'null');return value?.course?.id===course.id?value:null;}catch{return null;}});
 const t=useUi();
 const display=useDisplayText();
 const [active,setActive]=useState(Boolean(checkpoint?.active));
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [input,setInput]=useState(checkpoint?.input||'');
 const [notes,setNotes]=useState(()=>readNotes(course.id));
 const [noteStatus,setNoteStatus]=useState(t('notesSaved'));
 const [transcription,setTranscription]=useState<{user:string;ai:string}[]>(checkpoint?.transcription||[]);
 const [whiteboard,setWhiteboard]=useState<WhiteboardContent[]>(checkpoint?.whiteboard||[]);
 const [sources]=useState(()=>readStudySources(student.id || ''));
 const [useSources,setUseSources]=useState(()=>readStudySources(student.id || '').length>0);
 const [voiceEnabled,setVoiceEnabled]=useState(true);
 const [availableVoices,setAvailableVoices]=useState<SpeechSynthesisVoice[]>([]);
 const [selectedVoice,setSelectedVoice]=useState(()=>{try{return localStorage.getItem(`edu_class_voice_${language}`)||'';}catch{return '';}});
 const voiceEnabledRef=useRef(true);
 const [listening,setListening]=useState(false);
 const [speaking,setSpeaking]=useState(false);
 const [page,setPage]=useState(checkpoint?.page||0);
 const [panel,setPanel]=useState(false);
 const speechGeneration=useRef(0);
 const startedRef=useRef<number|null>(checkpoint?.started||null);
 const turnsRef=useRef<ChatMessage[]>(checkpoint?.turns||[]);
 const transcriptRef=useRef<typeof transcription>(checkpoint?.transcription||[]);
 const boardRef=useRef<WhiteboardContent[]>(checkpoint?.whiteboard||[]);
 const controllerRef=useRef<AbortController|null>(null);
 const recognizerRef=useRef<any>(null);
 const busyRef=useRef(false);
 const generationRef=useRef(0);
 const feedEndRef=useRef<HTMLDivElement>(null);
 const canvasRef=useRef<HTMLElement>(null);
 const languageLabel=ALL_LANGUAGES.find(item=>item.code===language)?.label||'English';
 const providerWaiting=useProviderWait(connection);
 const system=`You are ${teacher.name}, a helpful teacher for ${course.title}. Teach ${lessonPlan.subject}, chapter ${lessonPlan.chapter}, topic ${lessonPlan.topic}. Learning track: ${course.segment}. Learner level: ${student.className||course.level}. Country: ${student.country}. Teach in ${languageLabel}. ${teachingLanguageStyle(language)} Learner requirements: ${lessonPlan.requirements||'Explain clearly, give examples and check understanding.'} Stay on the selected topic. Invite questions and give short practice after an explanation.`;
 useEffect(()=>{try{localStorage.setItem(checkpointKey,JSON.stringify({course,teacher,lessonPlan,language,active,input,transcription,whiteboard,page,started:startedRef.current,turns:turnsRef.current}));}catch{}},[checkpointKey,course,teacher,lessonPlan,language,active,input,transcription,whiteboard,page]);
 useEffect(()=>{try{persistLearnerData(`edu_notes_${course.id}`,notes);setNoteStatus(t('notesSaved'));}catch{setNoteStatus(t('notesFailed'));}},[notes,course.id,language]);
 useEffect(()=>{if(panel)feedEndRef.current?.scrollIntoView?.({behavior:'smooth',block:'nearest'});},[transcription,panel]);
 useEffect(()=>{canvasRef.current?.scrollTo?.({top:0});},[page,whiteboard.length]);
 useEffect(()=>{voiceEnabledRef.current=voiceEnabled;},[voiceEnabled]);
 useEffect(()=>{
  const synthesis=window.speechSynthesis;
  if(!synthesis?.getVoices)return;
  const update=()=>setAvailableVoices(synthesis.getVoices());
  update();synthesis.addEventListener?.('voiceschanged',update);
  return ()=>synthesis.removeEventListener?.('voiceschanged',update);
 },[]);
 useEffect(()=>{try{setSelectedVoice(localStorage.getItem(`edu_class_voice_${language}`)||'');}catch{setSelectedVoice('');}},[language]);
 const saveHistory=()=>{
  const start=startedRef.current;if(start===null)return;startedRef.current=null;
  const record:SessionRecord={id:createId(),courseId:course.id,courseTitle:course.title,teacherName:teacher.name,timestamp:start,duration:Math.max(1,Math.floor((Date.now()-start)/1000)),videoUrl:'',lessonPlan,transcript:transcriptRef.current,whiteboard:boardRef.current};
  try{persistLearnerData('edu_history',JSON.stringify([record,...readHistory()]));}catch{setError('Could not save session history on this device.');}
 };
 const stop=()=>{
  generationRef.current++;controllerRef.current?.abort();controllerRef.current=null;
  try{recognizerRef.current?.stop();}catch{}recognizerRef.current=null;setListening(false);
  speechGeneration.current++;setSpeaking(false);try{window.speechSynthesis?.cancel();}catch{}
  saveHistory();setActive(false);setBusy(false);busyRef.current=false;
 };
 useEffect(()=>()=>{generationRef.current++;speechGeneration.current++;controllerRef.current?.abort();try{recognizerRef.current?.stop();}catch{}try{window.speechSynthesis?.cancel();}catch{}saveHistory();},[]);
 const silence=()=>{speechGeneration.current++;setSpeaking(false);try{window.speechSynthesis?.cancel();}catch{}};
 const speak=(text:string)=>{silence();if(!voiceEnabledRef.current||!('speechSynthesis' in window))return;const generation=speechGeneration.current;try{const utterance=new SpeechSynthesisUtterance(text);utterance.lang=classroomVoiceLocale(language);utterance.rate=.92;utterance.pitch=1;const voice=preferredClassroomVoice(window.speechSynthesis.getVoices?.()||availableVoices,language,selectedVoice);if(voice)utterance.voice=voice;utterance.onstart=()=>{if(generation===speechGeneration.current)setSpeaking(true);};utterance.onend=()=>{if(generation===speechGeneration.current)setSpeaking(false);};utterance.onerror=()=>{if(generation===speechGeneration.current){setSpeaking(false);setError('Voice could not play. You can read the explanation or try replaying it.');}};window.speechSynthesis.speak(utterance);}catch{setSpeaking(false);}};
 const ask=async(text:string,opening=false)=>{
  const question=text.trim();if(!question||busyRef.current)return;
  silence();
  const generation=generationRef.current;busyRef.current=true;setBusy(true);setError('');if(!opening)setInput('');
 const nextTurns:ChatMessage[]=[...turnsRef.current.slice(-8),{role:'user',content:question}];
  const controller=new AbortController();controllerRef.current=controller;
  try{
   const sourceContext=useSources?lessonSourceContext(sources,`${lessonPlan.subject} ${lessonPlan.chapter} ${lessonPlan.topic} ${opening?'':question}`):null;
   if(useSources&&!sourceContext?.matches.length)throw new Error('No matching passage was found in your uploaded materials. Add a relevant source or turn off source-grounded teaching.');
   const reply=await sendAIChat(connection,[{role:'system',content:`${system}\n${teachingBoardInstruction}${sourceContext?.instruction?`\n\n${sourceContext.instruction}`:''}`},...nextTurns],controller.signal,1800);
   if(generation!==generationRef.current)return;
   turnsRef.current=[...nextTurns,{role:'assistant',content:reply}];
   const step=parseTeachingStep(reply,lessonPlan.topic);
   transcriptRef.current=[...transcriptRef.current,...(!opening?[{user:question,ai:''}]:[]),{user:'',ai:step.narration}];setTranscription(transcriptRef.current);
   boardRef.current=[...boardRef.current,{id:createId(),topic:lessonPlan.topic,subtopic:lessonPlan.chapter,type:'text',content:step.narration,teachingStep:step,timestamp:Date.now(),sources:sourceContext?.matches.map(({source,chunk},index)=>({number:index+1,title:source.title,label:chunk.label,excerpt:chunk.text}))}];setWhiteboard(boardRef.current);setPage(boardRef.current.length-1);
   speak(`${step.narration} ${step.question}`);
  }catch(cause){if(generation!==generationRef.current)return;setError(cause instanceof Error?cause.message:'Could not get a response. Try again.');if(!opening)setInput(question);}
  finally{if(generation===generationRef.current){busyRef.current=false;setBusy(false);controllerRef.current=null;}}
 };
 const begin=()=>{if(active)return;turnsRef.current=[];transcriptRef.current=[];boardRef.current=[];setTranscription([]);setWhiteboard([]);setPage(0);startedRef.current=Date.now();setActive(true);void ask(`Begin teaching ${lessonPlan.topic}. Teach only the first concept with a relevant visual on the board, then wait for my answer.`,true);};
 const speakQuestion=()=>{
  silence();
  const Recognition=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
  if(!Recognition){setError('Speech input is unavailable in this browser. Type your question instead.');return;}
  if(listening){try{recognizerRef.current?.stop();}catch{}setListening(false);return;}
  const recognizer=new Recognition();recognizerRef.current=recognizer;recognizer.lang=language==='en-hi'?'en-IN':language;recognizer.interimResults=false;recognizer.continuous=false;
  const recognitionGeneration=generationRef.current;
  recognizer.onresult=(event:any)=>{if(startedRef.current===null||recognitionGeneration!==generationRef.current)return;const text=event.results?.[0]?.[0]?.transcript?.trim();if(text){setInput(text);void ask(text);}};
  recognizer.onerror=()=>{setError('Could not hear your question. Type it or try the microphone again.');setListening(false);};
  recognizer.onend=()=>setListening(false);
  try{recognizer.start();setListening(true);setError('');}catch{setError('Microphone could not start. Type your question instead.');}
 };
 const exit=()=>{stop();try{localStorage.removeItem(checkpointKey);}catch{}onExit();};
 const speechAvailable=Boolean((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition);
 const current=whiteboard[page];
 const navigate=(value:number)=>{silence();setPage(value);};
 return <div className="text-classroom teaching-room">
  <header className="teaching-header"><div><p>{providerLabel(connection.provider)} · {t('interactiveClass')}</p><h1>{display(lessonPlan.topic)}</h1><small>{display(lessonPlan.subject)} → {display(lessonPlan.chapter)}</small></div><div className="teaching-actions"><ThemeSelector/>{active?<button onClick={stop}><Square size={16}/>{t('stop')}</button>:<button onClick={begin} className="primary-button" disabled={!connection.key||providerWaiting}>{t('beginClass')}</button>}<button onClick={()=>setPanel(!panel)} aria-expanded={panel}>{t('notebook')} & {t('conversation')}</button><button onClick={exit}><ArrowLeft size={16}/>{t('exitSession')}</button></div></header>
  {error&&<div role="alert" className="teaching-error">{error}<button onClick={onOpenProvider}>{t('providerSettings')}</button></div>}
  <ProviderRecovery connection={connection} error={error} onOpenProvider={onOpenProvider} practice="You can review the board, transcript, and notes without AI."/>
  <div className="teaching-workspace"><main ref={canvasRef} className="teaching-canvas" aria-label="Teaching board" aria-busy={busy}>
   <div className="board-toolbar"><span>{t('whiteboard')} · {whiteboard.length ? `${page+1} / ${whiteboard.length}` : 'Ready'}</span><div><button disabled={page===0||busy} onClick={()=>navigate(page-1)}>← Previous board</button><button disabled={page>=whiteboard.length-1||busy} onClick={()=>navigate(page+1)}>Next board →</button></div></div>
   {sources.length>0&&<label className="board-source-toggle"><input type="checkbox" checked={useSources} disabled={busy} onChange={event=>setUseSources(event.target.checked)}/>{t('studySourceMode')} ({sources.length})</label>}
   {current ? <div key={current.id}><TeachingBoard step={current.teachingStep||parseTeachingStep(current.content,lessonPlan.topic)}/></div> : <div className="board-welcome"><h2>{display(lessonPlan.topic)}</h2><p>{t(active?busy?'firstExplanation':'askContinue':'beginFirst')}</p></div>}
   {busy&&<p role="status" className="board-loading">Your teacher is preparing the next explanation…</p>}
   {current?.sources?.map(source=><details key={source.number} className="board-evidence"><summary>[{source.number}] {source.title} · {source.label}</summary><p>{source.excerpt}</p></details>)}
   {current&&<details className="board-explanation"><summary>Read the teacher’s explanation</summary><p>{current.content}</p></details>}
  </main>
  <TeacherAvatar teacher={teacher} speaking={speaking} busy={busy} listening={listening}/>
  <aside hidden={!panel} className="teaching-notebook"><button onClick={()=>setPanel(false)}>Close notes & conversation</button><h2>{t('conversation')}</h2><section>{transcription.length?transcription.map((line,index)=><p key={index}><strong>{line.user?student.name:t('teacher')}:</strong> {line.user||line.ai}</p>):<p>{t('conversationEmpty')}</p>}<div ref={feedEndRef}/></section><h2>{t('notebook')}</h2><p role="status">{noteStatus}</p><textarea aria-label={t('personalNotes')} value={notes} onChange={e=>setNotes(e.target.value)} placeholder={t('writeNotes')}/></aside>
  </div>
  <footer className="teaching-controls">{active&&<><form onSubmit={e=>{e.preventDefault();void ask(input);}}><input aria-label={t('askTeacher')} value={input} onChange={e=>setInput(e.target.value)} placeholder="Answer your teacher, ask a question, or request an example…"/><button className="primary-button" disabled={busy||providerWaiting||!input.trim()} aria-label={t('sendQuestion')}><Send size={18}/></button>{speechAvailable&&<button type="button" disabled={busy} onClick={speakQuestion} aria-pressed={listening} aria-label={t(listening?'stopListening':'speakQuestion')}>{listening?<MicOff size={18}/>:<Mic size={18}/>}</button>}</form><div className="teaching-actions"><button disabled={busy||providerWaiting} onClick={()=>void ask('Continue to the next small concept on the selected topic and update the board.')}>Continue lesson →</button><button disabled={busy||providerWaiting} onClick={()=>void ask('Explain this same concept more simply with a concrete example and a relevant diagram or table.')}>Explain more simply</button><button disabled={!current||busy} onClick={()=>speak(`${current?.content||''} ${current?.teachingStep?.question||''}`)}>Replay explanation</button><button onClick={silence} disabled={!speaking}>Pause voice</button><button onClick={()=>{setVoiceEnabled(!voiceEnabled);silence();}}>{voiceEnabled?<Volume2 size={16}/>:<VolumeX size={16}/>} {t('browserVoice')} {t(voiceEnabled?'on':'off')}</button>{availableVoices.length>0&&<label className="classroom-voice-picker">Teacher voice <select aria-label="Teacher voice" value={selectedVoice} onChange={event=>{const value=event.target.value;setSelectedVoice(value);try{if(value)localStorage.setItem(`edu_class_voice_${language}`,value);else localStorage.removeItem(`edu_class_voice_${language}`);}catch{}silence();}}><option value="">Best available</option>{matchingClassroomVoices(availableVoices,language).map(voice=><option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}</select></label>}</div></>}</footer>
 </div>;
}
