import { createId } from '../services/id';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Behavior, GoogleGenAI, Modality, Type, FunctionDeclaration } from '@google/genai';
import { 
  MicOff, Play, Square, User, GraduationCap, PenTool, Layout, Terminal, 
  Book, Highlighter, ChevronRight, AlertCircle, Presentation, Network, 
  GitGraph, Hand, StickyNote, Activity, Target, Zap, Clock, Save,
  Circle, Square as SquareIcon, Minus, Globe, MessagesSquare, Type as TypeIcon, X
} from 'lucide-react';
import { Teacher, Course, WhiteboardContent, EngagementMetrics, Shape, Annotation, LanguageCode, SessionRecord, StudentProfile } from '../types';
import { LessonPlan } from '../learningPaths';
import { decode, decodeAudioData, createPcmBlob } from '../services/audioProcessing';
import { readHistory, readNotes } from '../services/storage';
import { ALL_LANGUAGES } from '../languages';
import { getAIConnection, getLiveAccessKey, LIVE_MODEL } from '../services/aiConnection';
import { useDisplayText, useUi } from '../uiText';
import { lessonSourceContext, readStudySources } from '../services/studySources';
import { persistLearnerData } from '../services/cloud';
import TeachingBoard from './TeachingBoard';
import TeacherAvatar from './TeacherAvatar';
import ThemeSelector from './ThemeSelector';
import { parseTeachingStep, teachingBoardInstruction } from '../services/teachingBoard';
import { providerFailure } from '../services/providerFailure';
import { teachingLanguageStyle } from '../services/teachingLanguage';
import ProviderRecovery, { useProviderWait } from './ProviderRecovery';

interface ClassroomProps {
  teacher: Teacher;
  course: Course;
  onExit: () => void;
  language?: LanguageCode;
  lessonPlan?: LessonPlan;
  student?: StudentProfile;
  onOpenProvider?: () => void;
}

const Classroom: React.FC<ClassroomProps> = ({ teacher, course, onExit, language = 'en', lessonPlan, student, onOpenProvider }) => {
  const t=useUi();
  const display=useDisplayText();
  const [isActive, setIsActive] = useState(false);
  const [speaking,setSpeaking]=useState(false);
  const [panelOpen,setPanelOpen]=useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [transcription, setTranscription] = useState<{ user: string; ai: string; handRaised?: boolean; isDiscussion?: boolean }[]>([]);
  const [whiteboard, setWhiteboard] = useState<WhiteboardContent[]>([]);
  const [sources] = useState(() => readStudySources(student?.id || ''));
  const [useSources, setUseSources] = useState(() => readStudySources(student?.id || '').length > 0);
  const [sourceEvidence, setSourceEvidence] = useState<{ title: string; label: string; excerpt: string }[]>([]);
  const sourceEvidenceRef = useRef<typeof sourceEvidence>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState<string>(lessonPlan?.topic || course.title);
  const [currentSubTopic, setCurrentSubTopic] = useState<string | null>(lessonPlan?.chapter || null);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>(t('readyClass'));
  
  const [studentNotes, setStudentNotes] = useState<string>(() => readNotes(course.id));
  const [activeSideTab, setActiveSideTab] = useState<'chat' | 'notes' | 'metrics'>('chat');

  const liveRef = useRef(false);
  const handRef = useRef(false);
  const generationRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const startedRef = useRef<number | null>(null);
  const transcriptRef = useRef<typeof transcription>([]);
  const whiteboardRef = useRef<WhiteboardContent[]>([]);
  const [noteStatus, setNoteStatus] = useState(t('notesSaved'));
  useEffect(() => {
    try { persistLearnerData(`edu_notes_${course.id}`, studentNotes); setNoteStatus(t('notesSaved')); }
    catch { setNoteStatus(t('notesFailed')); }
  }, [studentNotes, course.id]);
  const releaseResources = () => {
    setSpeaking(false);
    liveRef.current = false;
    generationRef.current += 1;
    const session = activeSessionRef.current;
    activeSessionRef.current = null;
    session?.close();
    processorRef.current?.disconnect();
    if (processorRef.current) processorRef.current.onaudioprocess = null;
    processorRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    sourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
    sourcesRef.current.clear();
    void audioContextInRef.current?.close().catch(() => {});
    void audioContextOutRef.current?.close().catch(() => {});
    audioContextInRef.current = null;
    audioContextOutRef.current = null;
    nextStartTimeRef.current = 0;
    subtitleQueueRef.current = [];
  };
  useEffect(() => () => { saveToHistory(); releaseResources(); }, []);

  const tempTextRef = useRef<string>("");
  const subtitleQueueRef = useRef<{ text: string; startTime: number; duration: number }[]>([]);
  
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const boardEndRef = useRef<HTMLDivElement>(null);
  const activeSessionRef = useRef<any>(null);

  const hasAIKey=Boolean(getAIConnection(student?.id).key);
  const activeConnection=getAIConnection(student?.id);
  const providerWaiting=useProviderWait(activeConnection);
  const currentLanguage = useMemo(() => ALL_LANGUAGES.find(l => l.code === language) || ALL_LANGUAGES[0], [language]);

  // Karaoke Subtitles Logic: Persistence and synchronization
  useEffect(() => {
    let animationFrameId: number;
    const syncSubtitles = () => {
      if (audioContextOutRef.current && isActive) {
        const now = audioContextOutRef.current.currentTime;
        const activeSub = subtitleQueueRef.current.find(
          s => now >= s.startTime && now <= (s.startTime + s.duration)
        );
        
        if (activeSub) {
          if (currentSubtitle !== activeSub.text) {
            setCurrentSubtitle(activeSub.text);
          }
        }
        // Subtitles persist until next scheduled phrase block arrives
        
        // Clean up queue
        if (subtitleQueueRef.current.length > 50) {
          subtitleQueueRef.current = subtitleQueueRef.current.filter(
            s => now <= (s.startTime + s.duration + 5)
          );
        }
      }
      animationFrameId = requestAnimationFrame(syncSubtitles);
    };
    syncSubtitles();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isActive, currentSubtitle]);

  const saveToHistory = () => {
    if (startedRef.current === null) return;
    const start = startedRef.current;
    startedRef.current = null;
    const newRecord: SessionRecord = {
      id: createId(), courseId: course.id, courseTitle: course.title,
      teacherName: teacher.name, timestamp: start,
      duration: Math.max(1, Math.floor((Date.now() - start) / 1000)), videoUrl: '',
      lessonPlan,
      transcript: transcriptRef.current, whiteboard: whiteboardRef.current, sourceRefs: sourceEvidenceRef.current
    };
    try { persistLearnerData('edu_history', JSON.stringify([newRecord, ...readHistory()])); }
    catch { setError('Session could not be saved: device storage is unavailable or full.'); }
  };

  const stopSession = () => {
    saveToHistory();
    releaseResources();
    setIsActive(false);
    setIsConnecting(false);
    handRef.current = false;
    setIsHandRaised(false);
    setCurrentSubtitle(t('classEnded'));
  };

  const handleExit = () => { stopSession(); onExit(); };

  const updateWhiteboardFn: FunctionDeclaration = {
    name: 'updateWhiteboard',
    behavior: Behavior.BLOCKING,
    parameters: {
      type: Type.OBJECT,
      description: 'Draw a concise teaching board for the concept currently being explained. Call before explaining every new concept.',
      properties: {
        topic: { type: Type.STRING },
        subtopic: { type: Type.STRING },
        content: { type: Type.STRING },
        boardJson: { type: Type.STRING, description: teachingBoardInstruction },
        type: { type: Type.STRING, enum: ['text', 'code', 'diagram', 'math'] }
      },
      required: ['content', 'type']
    }
  };

  const startSession = async () => {
    if (liveRef.current || isConnecting || providerWaiting) return;
    const generation = ++generationRef.current;
    setIsConnecting(true);
    setError(null);
    try {
      const apiKey=activeConnection.provider==='gemini'?activeConnection.key:'';
      if (!apiKey) throw new Error('Connect a Gemini API key in AI Provider before beginning a live class.');
      const sourceContext = useSources ? lessonSourceContext(sources, `${lessonPlan?.subject || course.category} ${lessonPlan?.chapter || ''} ${lessonPlan?.topic || course.title}`) : null;
      if (useSources && !sourceContext?.matches.length) throw new Error('No matching passage was found in your uploaded materials. Add a relevant source or turn off source-grounded teaching.');
      sourceEvidenceRef.current = sourceContext?.matches.map(({ source, chunk }) => ({ title: source.title, label: chunk.label, excerpt: chunk.text })) || [];
      setSourceEvidence(sourceEvidenceRef.current);
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access requires HTTPS or localhost.');
      const ai = new GoogleGenAI({ apiKey: await getLiveAccessKey(apiKey) });
      tempTextRef.current = '';

      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (generation !== generationRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      await Promise.all([audioContextInRef.current!.resume(), audioContextOutRef.current!.resume()]);
      const sessionPromise = ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: `
            ROLE: ${teacher.name}, ${teacher.role}.
            COURSE: ${course.title}. SUBJECT: ${lessonPlan?.subject || course.category}. LEARNING TRACK: ${course.segment}.
            LEARNER LEVEL: ${student?.className || course.level}. Adapt the depth to this level.
            COUNTRY: ${student?.country || 'Not specified'}. Use locally relevant examples when helpful.
            TEACHING LANGUAGE: ${currentLanguage.label}. ${teachingLanguageStyle(language)} Explain in this language unless the student asks to switch.
            SELECTED CHAPTER: ${lessonPlan?.chapter || course.title}. SELECTED TOPIC: ${lessonPlan?.topic || course.title}.
            LEARNER REQUIREMENTS: ${lessonPlan?.requirements || 'Explain clearly with examples and practice.'}
            ${sourceContext?.instruction || ''}
            Stay focused on the selected topic. Explain clearly, use examples, invite a short practice question, and check understanding before moving on.
            You teach at a board, not by reading an essay. Before each explanation, call updateWhiteboard with boardJson containing a short teaching step: definitions, key points and a relevant diagram, comparison table or chart. Explain the idea conversationally in short turns (roughly 60–90 words), refer to the board one point at a time, then pause for the student's answer to one understanding check. Do not read JSON, headings, or formatting aloud. Use boardJson for structured visual content and content for a plain text summary. Avoid invented factual numbers; label hypothetical examples illustrative.
            If the student raises a hand, listen and answer their question, then return to the selected topic.
            Do not advance to a different chapter unless the student asks.
          `,
          tools: [{ functionDeclarations: [updateWhiteboardFn] }],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            if (generation !== generationRef.current) return;
            liveRef.current = true;
            startedRef.current = Date.now();
            setIsActive(true);
            setIsConnecting(false);
            const source = audioContextInRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;
            scriptProcessor.onaudioprocess = (e) => {
              if (!liveRef.current) return;
              const pcmBlob = createPcmBlob(e.inputBuffer.getChannelData(0));
              sessionPromise.then(s => { if (generation === generationRef.current) s.sendRealtimeInput({ media: pcmBlob }); }).catch(() => {});
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInRef.current!.destination);
            sessionPromise.then(s => { if (generation === generationRef.current) s.sendRealtimeInput({ text: `Begin the lesson on "${lessonPlan?.topic || course.title}" from "${lessonPlan?.chapter || course.title}". Explain the first concept, then pause for my response.` }); }).catch(() => {});
          },
          onmessage: async (msg) => {
            if (generation !== generationRef.current) return;
            const incoming = msg.serverContent?.inputTranscription?.text;
            const outgoing = msg.serverContent?.outputTranscription?.text;
            if (incoming || outgoing) {
              const entry = { user: incoming || '', ai: outgoing || '' };
              transcriptRef.current = [...transcriptRef.current, entry];
              setTranscription(transcriptRef.current);
              if (outgoing) setCurrentSubtitle(outgoing);
            }
            if (msg.serverContent?.outputTranscription) {
              tempTextRef.current += msg.serverContent.outputTranscription.text;
            }
            
            // Wait for the learner's answer or explicit Continue instead of looping lectures.

            for (const part of msg.serverContent?.modelTurn?.parts || []) {
              const audioData = part.inlineData?.data;
              if (!audioData || !audioContextOutRef.current) continue;
              const ctx = audioContextOutRef.current;
              // Enhanced Jitter Buffer (0.25s) to eliminate FM-radio glitching artifacts
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              if (generation !== generationRef.current) return;
              const scheduledStartTime = Math.max(nextStartTimeRef.current, ctx.currentTime + 0.25);
              
              subtitleQueueRef.current.push({
                text: tempTextRef.current.trim() || "...",
                startTime: scheduledStartTime,
                duration: buffer.duration
              });
              tempTextRef.current = ""; 

              const source = ctx.createBufferSource();
              if (generation !== generationRef.current) return;
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(scheduledStartTime);
              nextStartTimeRef.current = scheduledStartTime + buffer.duration;
              sourcesRef.current.add(source);
              setSpeaking(true);
              source.onended = () => {sourcesRef.current.delete(source);if(generation===generationRef.current&&!sourcesRef.current.size)setSpeaking(false);};
            }

            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'updateWhiteboard') {
                  const args = fc.args as any;
                  if (args.topic) setCurrentTopic(args.topic);
                  if (args.subtopic) setCurrentSubTopic(args.subtopic);
                  whiteboardRef.current = [...whiteboardRef.current, { ...args, teachingStep: args.boardJson ? parseTeachingStep(String(args.boardJson),args.topic || currentTopic) : undefined, id: createId(), timestamp: Date.now() }];
                  setWhiteboard(whiteboardRef.current);
                  sessionPromise.then(s => { if (generation === generationRef.current) s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: 'Board updated.' } } }); }).catch(() => {});
                }
              }
            }

            if (msg.serverContent?.interrupted) {
              setSpeaking(false);
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              subtitleQueueRef.current = [];
            }
          },
          onerror: (event) => { if (generation !== generationRef.current) return; stopSession(); setError(providerFailure(event, 'Connection interrupted. Check your connection and try Begin Class again.',activeConnection)); },
          onclose: () => { if (generation !== generationRef.current) return; stopSession(); }
        }
      });
      const session = await sessionPromise;
      if (generation !== generationRef.current) { session.close(); return; }
      activeSessionRef.current = session;
    } catch (err: any) {
      if (generation !== generationRef.current) return;
      releaseResources();
      setIsActive(false);
      setError(err.name === "NotAllowedError" ? "Microphone permission was denied. Allow microphone access in your browser and try again." : providerFailure(err, "Unable to connect. Please try again.",activeConnection));
      setIsConnecting(false);
    }
  };

  const handleRaiseHand = () => {
    if (!isActive || !activeSessionRef.current) return;
    const nextState = !isHandRaised;
    handRef.current = nextState;
    setIsHandRaised(nextState);
    if (nextState) { sourcesRef.current.forEach(s => { try { s.stop(); } catch {} }); sourcesRef.current.clear(); nextStartTimeRef.current = 0; subtitleQueueRef.current = []; }
    activeSessionRef.current.sendRealtimeInput({ text: nextState ? "Interruption: Student has a query." : "Interruption resolved: Resume lecture." });
  };

  return (
    <div className="classroom live-board-room flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      <header className="flex items-center justify-between px-8 py-5 bg-slate-900/95 backdrop-blur-3xl border-b border-white/5 shrink-0 z-50">
        <div className="flex items-center gap-6">
          <img src={teacher.avatar} className="w-14 h-14 rounded-xl object-cover ring-1 ring-white/20" alt={teacher.name} />
          <div>
            <div className="flex items-center gap-3">
              <button disabled={!isActive} onClick={()=>activeSessionRef.current?.sendRealtimeInput({text:'Continue with the next small concept on the selected topic. Update the board first and finish with one question for me.'})}>Continue lesson →</button>
              <h2 className="font-black text-white text-xl tracking-tight">{teacher.name}</h2>
              {isActive && (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                   <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">{t(isHandRaised ? 'paused' : 'livestream')}</span>
                </div>
              )}
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{display(course.title)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeSelector/>
          <button onClick={()=>setPanelOpen(!panelOpen)} aria-expanded={panelOpen}>{t('notebook')} & {t('conversation')}</button>
          {!isActive ? (
            <button onClick={hasAIKey&&activeConnection.provider==='gemini' ? startSession : (onOpenProvider || startSession)} disabled={isConnecting||providerWaiting} className="px-10 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-500 transition">
              {t(isConnecting ? 'linking' : hasAIKey ? 'beginClass' : 'connectProvider')}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={handleRaiseHand} className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl font-black text-xs uppercase border transition-all ${isHandRaised ? 'bg-amber-500 text-white border-amber-400' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                <Hand size={18} /> {t(isHandRaised ? 'resumeLecture' : 'raiseHand')}
              </button>
              <button onClick={stopSession} className="px-8 py-3.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl font-black text-sm uppercase">{t('stop')}</button>
            </div>
          )}
          <button onClick={handleExit} className="bg-white/5 text-slate-400 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition">
            {t('exitSession')}
          </button>
        </div>
      </header>

      {error && <div role="alert" className="bg-rose-950 text-rose-100 p-4 border-b border-rose-800 flex items-center gap-4">{error}{onOpenProvider&&<button className="underline font-bold" onClick={onOpenProvider}>{t('providerSettings')}</button>}</div>}
      {error&&onOpenProvider&&<ProviderRecovery connection={activeConnection} error={error} onOpenProvider={onOpenProvider} practice="You can review the board, transcript, and notes without AI. Live audio can resume when Gemini is available; another provider can be used in a new text classroom."/>}
      {sources.length>0&&!isActive&&<label className="flex gap-2 items-start bg-slate-800 px-6 py-3 text-sm"><input type="checkbox" checked={useSources} onChange={event=>setUseSources(event.target.checked)} className="mt-1"/><span>{t('studySourceMode')}. Relevant excerpts will be sent to Gemini and cited in this lesson.</span></label>}
      {sourceEvidence.length>0&&<details className="bg-slate-800 px-6 py-3 text-sm"><summary className="cursor-pointer font-bold">{t('studyEvidence')} ({sourceEvidence.length})</summary><div className="space-y-2 mt-3">{sourceEvidence.map((item,index)=><p key={index} className="text-slate-300">[{index+1}] {item.title} · {item.label}: {item.excerpt.slice(0,240)}…</p>)}</div></details>}
      <div className="classroom-body flex flex-1 overflow-hidden relative">
        <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-8 lg:p-16 custom-scrollbar">
            <div className="max-w-4xl mx-auto w-full space-y-16 pb-96">
              <div className="text-center pb-12 border-b border-white/5">
                 <h1 className="text-4xl lg:text-7xl font-black text-white tracking-tighter mb-4">{currentTopic}</h1>
                 {currentSubTopic && <div className="inline-block bg-indigo-500/10 px-6 py-2 rounded-full border border-indigo-500/20 text-indigo-400 font-bold italic">{currentSubTopic}</div>}
              </div>

              <div className="space-y-16">
                {whiteboard.length === 0 ? (
                  <div className="h-[40vh] flex flex-col items-center justify-center text-slate-400">
                    <PenTool size={160} />
                    <p className="text-2xl font-black uppercase tracking-[0.5em] mt-8">{t('boardEmpty')}</p>
                  </div>
                ) : (
                  whiteboard.map((item) => (
                    item.teachingStep ? <div key={item.id}><TeachingBoard step={item.teachingStep}/></div> :
                    <div key={item.id} className="p-12 lg:p-16 rounded-[3rem] border bg-slate-900/40 border-white/5 shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-8 left-8 text-[9px] font-black uppercase text-indigo-500 tracking-[0.3em] opacity-30 group-hover:opacity-100 transition-opacity">{t('whiteboard')}</div>
                      <div className="text-xl lg:text-2xl text-slate-200 leading-[1.8] text-justify font-medium">{item.type === 'code' ? <pre className="overflow-x-auto text-left whitespace-pre-wrap"><code>{item.content}</code></pre> : <div className="whitespace-pre-wrap text-left">{item.content}</div>}</div>
                    </div>
                  ))
                )}
                <div ref={boardEndRef} className="h-64" />
              </div>
            </div>
          </div>

          {/* Karaoke Subtitle persistent overlay: dedicated zone at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-8 z-50 pointer-events-none bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
            {isActive && currentSubtitle && (
              <div className="max-w-4xl mx-auto">
                <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl text-center ring-1 ring-white/20 animate-in fade-in slide-in-from-bottom-2 duration-700">
                  <p className="text-2xl lg:text-4xl font-black text-white tracking-tight leading-tight transition-all duration-300">
                    {currentSubtitle}
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>

        <TeacherAvatar teacher={teacher} speaking={speaking} busy={isConnecting} listening={isActive&&!speaking}/>
        <aside hidden={!panelOpen} className="live-notebook w-96 lg:w-112 bg-slate-900 border-l border-white/5 flex flex-col shrink-0">
          <div className="flex bg-slate-950/50 border-b border-white/5">
            {[{ id: 'chat', icon: Presentation, label: t('feed') }, { id: 'notes', icon: StickyNote, label: t('notebook') }].map(tab => (
              <button key={tab.id} onClick={() => setActiveSideTab(tab.id as any)} className={`flex-1 flex flex-col items-center gap-2 py-6 transition-all border-b-2 ${activeSideTab === tab.id ? 'bg-white/5 text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent'}`}>
                <tab.icon size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/30 p-8">
            {activeSideTab === 'chat' ? (
              transcription.length === 0 ? <p className="text-sm text-slate-400">{t('liveConversationEmpty')}</p> : transcription.map((line, idx) => (
                <div key={idx} className="mb-6 animate-in slide-in-from-bottom-2 duration-300">
                  {line.user && <div className="flex justify-end mb-2"><div className="bg-slate-800 p-3 rounded-2xl rounded-tr-none text-xs text-slate-300 border border-white/5">{line.user}</div></div>}
                  {line.ai && <div className="flex justify-start"><div className="bg-indigo-600/10 p-4 rounded-2xl rounded-tl-none text-indigo-50 text-xs border border-indigo-500/10">{line.ai}</div></div>}
                </div>
              ))
            ) : (
              <><p role="status" className="text-xs text-slate-400 mb-3">{noteStatus}</p><textarea aria-label={t('personalNotes')} 
                value={studentNotes} 
                onChange={(e) => setStudentNotes(e.target.value)} 
                placeholder={t('writeNotes')} 
                className="w-full h-full bg-transparent border-none focus:ring-0 text-slate-100 resize-none font-medium leading-relaxed" 
              /></>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Classroom;
