
import React, { useState, useMemo, useEffect } from 'react';
import { Home, BookOpen, BarChart3, Settings, LogOut, GraduationCap, Globe, Users, Search, Sparkles, Filter, Code, Palette, Music, Swords, ChefHat, Leaf, Camera, Cpu, Shapes, Briefcase, ChevronDown, PieChart, LineChart, Trophy, History, PlayCircle, Clock, Calendar, X, PauseCircle, ShieldAlert, GraduationCap as SchoolIcon, Landmark, Scale, BookMarked, Flower2, Wind, Languages, CircleHelp, Presentation, MessagesSquare } from 'lucide-react';
import { COURSES, TEACHERS } from './constants';
import { RECOMMENDED_COURSES } from './recommendedCourses';
import { Course, Segment, Teacher, CourseCategory, LanguageCode, SessionRecord, StudentProfile } from './types';
import CourseCard from './components/CourseCard';
import Classroom from './components/Classroom';
import Dashboard from './components/Dashboard';
import { readHistory } from './services/storage';
import SessionReview from './components/SessionReview';
import './styles.css';
import { orderedLanguages } from './languages';
import { LessonPlan } from './learningPaths';
import { readProfile, saveProfile, isSignedIn, setSignedIn } from './services/profile';
import StudentGate from './components/StudentGate';
import StudentProfileForm from './components/StudentProfileForm';
import CourseSetup from './components/CourseSetup';
import AIProviderDialog from './components/AIProviderDialog';
import TextClassroom from './components/TextClassroom';
import { getAIConnection } from './services/aiConnection';
import { UiKey, UiProvider, displayText, hasInterfaceTranslation, ui } from './uiText';
import { loadCachedInterface, prepareInterfaceTranslation } from './services/interfaceTranslation';
import GuideDialog, { GuideDestination } from './components/GuideDialog';
import StudyLab from './components/StudyLab';
import PresentationCoach from './components/PresentationCoach';
import InterviewBridge from './components/InterviewBridge';
import CloudGate from './components/CloudGate';
import AccountControls from './components/AccountControls';
import PublicLanding from './components/PublicLanding';
import PrivacyPolicy from './components/PrivacyPolicy';
import ThemeSelector from './components/ThemeSelector';
import { publicContactRequired } from './services/publicIdentity';
import { cloudCompleteRedirect, cloudConfigured, cloudRequired, cloudSignOut, cloudSyncError, cloudUserEmail, currentCloudSession, flushCloudWrites, hydrateLearnerData, onCloudStatus } from './services/cloud';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'courses' | 'study' | 'coach' | 'interview' | 'dashboard' | 'history' | 'profile'>('home');
  const [openHomeSection, setOpenHomeSection] = useState<'library' | 'recommended' | 'more' | null>(null);
  const [interviewRecord,setInterviewRecord]=useState<SessionRecord|null>(null);
  const [providerOpen,setProviderOpen]=useState(false);
  const [guideOpen,setGuideOpen]=useState(false);
  const [entryOpen,setEntryOpen]=useState(false);
  const [accountMode,setAccountMode]=useState<'sign-in' | 'sign-up' | null>(null);
  const [privacyOpen,setPrivacyOpen]=useState(()=>window.location.hash==='#/privacy');
  const [providerVersion,setProviderVersion]=useState(0);
  const [profile, setProfile] = useState<StudentProfile | null>(() => cloudConfigured ? null : readProfile());
  const [signedIn, setSignedInState] = useState(() => cloudConfigured ? false : isSignedIn());
  const [accountReady,setAccountReady]=useState(!cloudConfigured);
  const [accountError,setAccountError]=useState('');
  const [recovering,setRecovering]=useState(false);
  const [syncMessage,setSyncMessage]=useState('');
  const [syncRetrying,setSyncRetrying]=useState(false);
  const [preparingCourse, setPreparingCourse] = useState<Course | null>(null);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [classroomMode,setClassroomMode]=useState<'live'|'text'|null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher>(TEACHERS[0]);
  useEffect(()=>{
    if(!accountReady||!signedIn||!profile?.id||selectedCourse||preparingCourse)return;
    try {
      const draft=JSON.parse(localStorage.getItem(`edu_text_classroom_${profile.id}`)||'null');
      if(draft?.course?.id&&draft.lessonPlan&&draft.teacher){setSelectedTeacher(draft.teacher);setSelectedLanguage(draft.language||profile.language);setLessonPlan(draft.lessonPlan);setClassroomMode('text');setSelectedCourse(draft.course);}
    } catch {}
  },[accountReady,signedIn,profile?.id]);
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<Segment | 'All'>('All');
  const [customCourseName, setCustomCourseName] = useState('');
  const [customLevel, setCustomLevel] = useState<Segment>(Segment.School);
  const [categoryFilter, setCategoryFilter] = useState<CourseCategory | 'All'>('All');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(() => readProfile()?.language || 'en');
  const [translationStatus,setTranslationStatus]=useState('');
  const [translationError,setTranslationError]=useState(false);
  const [translationRetry,setTranslationRetry]=useState(0);
  const [sessionHistory, setSessionHistory] = useState<SessionRecord[]>([]);
  const [replayingRecord, setReplayingRecord] = useState<SessionRecord | null>(null);
  const t=(key:UiKey,values?:Record<string,string|number>)=>ui(selectedLanguage,key,values);
  const levelLabel=(level:Segment)=>t(({[Segment.School]:'school',[Segment.University]:'university',[Segment.Individual]:'individual',[Segment.Business]:'business'} as const)[level]);

  const enterCloudAccount=async(importDevice=false)=>{
    await hydrateLearnerData(importDevice);
    const stored=readProfile();
    setProfile(stored);setSelectedLanguage(stored?.language || 'en');
    setSignedInState(Boolean(stored));setAccountReady(true);setAccountError('');
  };
  useEffect(()=>{
    const syncRoute=()=>setPrivacyOpen(window.location.hash==='#/privacy');
    window.addEventListener('hashchange',syncRoute);
    return()=>window.removeEventListener('hashchange',syncRoute);
  },[]);
  useEffect(()=>{
    if(!cloudConfigured)return;
    let active=true;
    void (async()=>{
      try {
        const reset=await cloudCompleteRedirect();
        if(reset&&active)setRecovering(true);
        const current=await currentCloudSession();
        if(current&&active&&!reset)await enterCloudAccount();
      } catch(error){if(active)setAccountError(error instanceof Error?error.message:'Could not load your account.');}
      finally{if(active)setAccountReady(true);}
    })();
    const remove=onCloudStatus(()=>{if(active)setSyncMessage(cloudSyncError());});
    return()=>{active=false;remove();};
  },[]);

  useEffect(() => {
    const history = readHistory();
    setSessionHistory(history);
  }, [activeTab, selectedCourse]);
  useEffect(()=>{
    document.documentElement.lang=selectedLanguage==='en-hi'?'hi':selectedLanguage;
    document.documentElement.dir=['ar','ur','fa'].includes(selectedLanguage)?'rtl':'ltr';
    if(['en','hi','bn'].includes(selectedLanguage)){setTranslationStatus('');setTranslationError(false);return;}
    const cached=loadCachedInterface(selectedLanguage);
    const controller=new AbortController();
    setTranslationError(false);
    if(cached)setTranslationStatus(`Interface translation: ${cached} labels ready`);
    prepareInterfaceTranslation(selectedLanguage,getAIConnection(profile?.id), (count,total)=>{
      if(!controller.signal.aborted)setTranslationStatus(count===total?'':`Translating interface: ${count}/${total} labels`);
    },controller.signal).catch(error=>{if(!controller.signal.aborted){setTranslationError(true);setTranslationStatus(error instanceof Error?error.message:'Interface translation unavailable.');}});
    return ()=>controller.abort();
  },[selectedLanguage,profile?.id,providerVersion,translationRetry]);

  const filteredCourses = useMemo(() => {
    return COURSES.filter(c => {
      const matchesSearch = [c.title,c.description,displayText(selectedLanguage,c.title),displayText(selectedLanguage,c.description)].some(text=>text.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSegment = segmentFilter === 'All' || c.segment === segmentFilter;
      const matchesCategory = categoryFilter === 'All' || c.category === categoryFilter;
      return matchesSearch && matchesSegment && matchesCategory;
    });
  }, [searchQuery, segmentFilter, categoryFilter, selectedLanguage, translationStatus]);

  const categories: { label: CourseCategory; icon: any; displayLabel: string }[] = [
    { label: 'General Studies', icon: SchoolIcon, displayLabel: t('schoolLevel') },
    { label: 'Management', icon: Landmark, displayLabel: t('universityLevel') },
    { label: 'Competitive Exams', icon: Trophy, displayLabel: t('exams') },
    { label: 'Programming', icon: Code, displayLabel: t('programming') },
    { label: 'Data Analytics', icon: LineChart, displayLabel: t('dataAnalytics') },
    { label: 'Business Analytics', icon: PieChart, displayLabel: t('businessAnalytics') },
    { label: 'Advanced Photography', icon: Camera, displayLabel: t('photography') },
    { label: 'Performing Arts', icon: Palette, displayLabel: t('danceMusic') },
    { label: 'Literature', icon: Languages, displayLabel: t('grammar') },
    { label: 'Botany & Ecology', icon: Flower2, displayLabel: t('agriculture') },
    { label: 'Culinary Arts', icon: ChefHat, displayLabel: t('cooking') },
    { label: 'Digital Design', icon: Shapes, displayLabel: t('design') },
    { label: 'Wellness & Nature', icon: Wind, displayLabel: t('meditation') },
    { label: 'Sanskrit', icon: Globe, displayLabel: t('sanskritSpiritual') },
    { label: 'AI Fundamentals', icon: Cpu, displayLabel: t('aiTech') },
    { label: 'AI Ethics', icon: ShieldAlert, displayLabel: t('ethics') },
  ];

  const handleSelectCourse = (course: Course) => {
    const textToMatch = (course.title + ' ' + course.description + ' ' + course.category).toLowerCase();
    let teacher: Teacher;
    if (textToMatch.includes('photography')) {
      teacher = TEACHERS.find(t => t.id === 'visualist-victor') || TEACHERS[0];
    } else if (textToMatch.includes('analytics') || /\bbi\b/.test(textToMatch)) {
      teacher = TEACHERS.find(t => t.id === 'analyst-maya') || TEACHERS[0];
    } else if (textToMatch.includes('python') || textToMatch.includes('programming')) {
      teacher = TEACHERS.find(t => t.id === 'dev-ravi')!;
    } else if (textToMatch.includes('music') || textToMatch.includes('design')) {
      teacher = TEACHERS.find(t => t.id === 'maestro-elena')!;
    } else if (textToMatch.includes('martial') || textToMatch.includes('chess')) {
      teacher = TEACHERS.find(t => t.id === 'sensei-lee')!;
    } else if (textToMatch.includes('botany') || textToMatch.includes('cook')) {
      teacher = TEACHERS.find(t => t.id === 'chef-flora')!;
    } else if (textToMatch.includes('business') || textToMatch.includes('mba')) {
      teacher = TEACHERS.find(t => t.id === 'strategist-max')!;
    } else if (textToMatch.includes('history') || textToMatch.includes('sanskrit')) {
      teacher = TEACHERS.find(t => t.id === 'historian-henry')!;
    } else if (textToMatch.includes('bio') || textToMatch.includes('science')) {
      teacher = TEACHERS.find(t => t.id === 'scientist-sarah')!;
    } else if (course.segment === Segment.University) {
      teacher = TEACHERS.find(t => t.id === 'prof-aurora')!;
    } else if (textToMatch.includes('prompt')) {
      teacher = TEACHERS.find(t => t.id === 'coach-zen')!;
    } else {
      teacher = TEACHERS.find(t => t.id === 'ms-spark')!;
    }
    setSelectedTeacher(teacher);
    setPreparingCourse(course);
  };

  const planCustomCourse = (event: React.FormEvent) => {
    event.preventDefault();
    const title = customCourseName.trim();
    if (!title) return;
    handleSelectCourse({
      id: `custom-${customLevel.toLowerCase()}-${title.toLocaleLowerCase()}`,
      title,
      segment: customLevel,
      description: t('customCourseDescription'),
      category: 'General Studies',
      level: customLevel === Segment.School || customLevel === Segment.Individual ? 'Beginner' : 'Intermediate',
      format: 'Lecture',
    });
  };

  const chooseLanguage=(value:LanguageCode)=>{
    setSelectedLanguage(value);
    document.documentElement.lang=value==='en-hi'?'hi':value;
    if(profile){const next={...profile,language:value};setProfile(next);saveProfile(next);}
  };
  const enter=(value:StudentProfile)=>{setProfile(value);setSelectedLanguage(value.language);setSignedIn(true);setSignedInState(true);};
  const openGuideSection=(destination:GuideDestination)=>{if(destination==='provider')setProviderOpen(true);else setActiveTab(destination);};
  const guideDialog=guideOpen&&<GuideDialog onClose={()=>setGuideOpen(false)} onNavigate={signedIn&&profile&&!selectedCourse&&!preparingCourse?openGuideSection:undefined}/>;
  const guideFloat=<button type="button" className={`guide-float ${selectedCourse||preparingCourse?'compact':''}`} aria-label={t('guideOpen')} title={t('guideOpen')} onClick={()=>setGuideOpen(true)}><CircleHelp size={20}/><span>{t('guideOpen')}</span></button>;
  if (privacyOpen) return <><ThemeSelector className="theme-floating"/><PrivacyPolicy onBack={()=>{window.location.hash='';setPrivacyOpen(false);}}/></>;
  if (cloudRequired || publicContactRequired) return <div role="alert" className="min-h-screen grid place-items-center p-8 text-center"><div><h1 className="text-2xl font-bold">Public launch settings are incomplete</h1><p className="mt-3">This public build requires the account service and a valid support email. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. If VITE_SUPPORT_EMAIL is set, it must be a valid address. See DEPLOYMENT.md.</p></div></div>;
  if (!accountReady) return <div role="status" className="min-h-screen grid place-items-center">Loading your account…</div>;
  let hasStoredCloudSession=false;
  try {hasStoredCloudSession=Boolean(cloudConfigured&&sessionStorage.getItem('edu_cloud_session'));} catch {}
  const closeEntry=()=>{setEntryOpen(false);setAccountMode(null);};
  if (!cloudConfigured && accountMode) return <CloudGate initialMode={accountMode} onReady={enterCloudAccount} onBack={closeEntry}/>;
  if (!signedIn && !entryOpen && !hasStoredCloudSession) return <UiProvider language={selectedLanguage}><PublicLanding onStart={()=>{setAccountMode(null);setEntryOpen(true);}} onAccount={mode=>{setAccountMode(mode);setEntryOpen(true);}} onGuide={()=>setGuideOpen(true)}/>{guideDialog}</UiProvider>;
  if (cloudConfigured && !recovering && !signedIn && !profile && !accountError && !hasStoredCloudSession) return <UiProvider language={selectedLanguage}><ThemeSelector className="theme-floating"/><CloudGate initialMode={accountMode || 'sign-in'} onReady={enterCloudAccount} onBack={closeEntry}/></UiProvider>;
  if (cloudConfigured && (recovering || (!signedIn && !profile && accountError))) return <UiProvider language={selectedLanguage}><div>{accountError&&<p role="alert" className="p-4 text-rose-700">{accountError}</p>}<ThemeSelector className="theme-floating"/><CloudGate recovering={recovering} onReady={async()=>{setRecovering(false);await enterCloudAccount();}} onBack={closeEntry}/></div></UiProvider>;
  if (!signedIn || !profile) return <UiProvider language={selectedLanguage}><ThemeSelector className="theme-floating"/><StudentGate profile={profile} onEnter={enter} onBack={closeEntry}/>{guideFloat}{guideDialog}</UiProvider>;
  const providerDialog=providerOpen&&<AIProviderDialog profileId={profile.id || ''} onClose={()=>setProviderOpen(false)} onChanged={()=>setProviderVersion(v=>v+1)}/>;
  const aiConnection=getAIConnection(profile.id);
  const hasAIKey=Boolean(aiConnection.key);
  if (selectedCourse && lessonPlan) {
    return (
      <UiProvider language={selectedLanguage}><div className="min-h-screen bg-white">
        {providerDialog}
        {guideFloat}{guideDialog}
        {classroomMode === 'live' ? <Classroom
          course={selectedCourse}
          teacher={selectedTeacher}
          onExit={() => { setSelectedCourse(null); setLessonPlan(null); setClassroomMode(null); setPreparingCourse(null); setActiveTab('history'); }}
          language={selectedLanguage}
          lessonPlan={lessonPlan}
          student={profile}
          onOpenProvider={()=>setProviderOpen(true)}
        /> : <TextClassroom course={selectedCourse} teacher={selectedTeacher} onExit={() => { setSelectedCourse(null); setLessonPlan(null); setClassroomMode(null); setPreparingCourse(null); setActiveTab('history'); }} language={selectedLanguage} lessonPlan={lessonPlan} student={profile} connection={aiConnection} onOpenProvider={()=>setProviderOpen(true)} />}
      </div></UiProvider>
    );
  }

  if (preparingCourse) return <UiProvider language={selectedLanguage}>{providerDialog}{guideFloat}{guideDialog}<ThemeSelector className="theme-floating"/><CourseSetup course={preparingCourse} profile={profile} language={selectedLanguage} onLanguage={chooseLanguage} onOpenProvider={()=>setProviderOpen(true)} hasAIKey={hasAIKey} onBack={()=>setPreparingCourse(null)} onStart={plan=>{setLessonPlan(plan);setClassroomMode(aiConnection.provider==='gemini'?'live':'text');setSelectedCourse(preparingCourse);setPreparingCourse(null);}}/></UiProvider>;
  return (
    <UiProvider language={selectedLanguage}><div className="app-shell flex h-screen bg-slate-50 text-slate-900 font-sans">
      {providerDialog}
      {guideDialog}
      {accountError&&<div role="alert" className="fixed top-2 left-2 z-[100] max-w-sm rounded-xl bg-rose-100 border border-rose-400 p-4 text-rose-950">{accountError}</div>}
      {syncMessage&&<div role="alert" className="fixed top-2 right-2 z-[100] max-w-sm rounded-xl bg-amber-100 border border-amber-400 p-4 text-amber-950"><p>{syncMessage}</p><button type="button" disabled={syncRetrying} className="mt-2 font-bold underline disabled:opacity-60" onClick={async()=>{setSyncRetrying(true);try{await flushCloudWrites();}catch{}finally{setSyncRetrying(false);setSyncMessage(cloudSyncError());}}}>{syncRetrying?'Retrying…':'Retry cloud save'}</button></div>}
      {replayingRecord && <SessionReview record={replayingRecord} onClose={() => setReplayingRecord(null)} />}
      <aside className="w-20 lg:w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0"><Globe size={24} /></div>
          <div className="hidden lg:block">
            <span className="brand-name text-2xl">EduVantage<span className="brand-period">.</span></span>
            <p className="brand-kicker text-[9px] uppercase tracking-widest">{t('studio')}</p>
          </div>
        </div>
        <nav className="flex-1 px-6 py-8 space-y-3">
          {[{ id: 'home', icon: Home, label: t('home') }, { id: 'recommended', icon: BookMarked, label: t('recommendedCourses') }, { id: 'courses', icon: BookOpen, label: t('curriculum') }, { id: 'study', icon: Sparkles, label: t('studyLab') }, { id: 'coach', icon: Presentation, label: t('coachNav') }, { id: 'interview', icon: MessagesSquare, label: t('interviewNav') }, { id: 'dashboard', icon: BarChart3, label: t('dashboard') }, { id: 'history', icon: History, label: t('archive') }, { id: 'profile', icon: Users, label: t('profile') }].map(tab => (
            <button key={tab.id} aria-label={tab.label} aria-current={activeTab === tab.id ? "page" : undefined} title={tab.label} onClick={() => { if(tab.id==='recommended'){setOpenHomeSection('recommended');setActiveTab('home');requestAnimationFrame(()=>document.getElementById('recommended-courses')?.scrollIntoView({behavior:'smooth',block:'start'}));}else setActiveTab(tab.id as typeof activeTab); }} className={`w-full flex items-center gap-5 px-5 py-4 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white font-black shadow-xl shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-900'}`}>
              <tab.icon size={22} /> <span className="hidden lg:block text-sm uppercase font-bold tracking-widest">{tab.label}</span>
            </button>
          ))}
        </nav>
        <button aria-label={t('guideOpen')} title={t('guideOpen')} className="guide-nav-button" onClick={()=>setGuideOpen(true)}><CircleHelp size={19}/><span className="hidden lg:block">{t('guideOpen')}</span></button>
        <button aria-label={t('aiProvider')} className="provider-nav flex items-center gap-3 px-6 py-4 mx-3 rounded-xl text-indigo-700 hover:bg-indigo-50 font-bold" onClick={()=>setProviderOpen(true)}><Settings size={18}/><span className="hidden lg:block">{t('aiProvider')}{hasAIKey?` · ${t('keySaved')}`:''}</span></button>
        <button aria-label={t('signOut')} className="sign-out flex items-center gap-3 px-6 py-4 mx-3 mb-4 rounded-xl text-slate-500 hover:bg-slate-100" onClick={async()=>{try{if(cloudConfigured){await cloudSignOut();setProfile(null);}else setSignedIn(false);setSignedInState(false);setEntryOpen(false);}catch(error){setAccountError(error instanceof Error?error.message:'Could not finish saving your work.');}}}><LogOut size={18}/><span className="hidden lg:block">{t('signOut')}</span></button>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50/50">
        <div className="app-topbar sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 flex-wrap"><ThemeSelector/><div className="flex min-w-0 items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl text-slate-600 border border-slate-200">
             <Globe size={16} />
             <select id="teaching-language-select" aria-label={t('teachingLanguage')} value={selectedLanguage} onChange={(e) => chooseLanguage(e.target.value as LanguageCode)} className="bg-transparent text-sm font-bold focus:ring-0 cursor-pointer">
               {orderedLanguages(profile.country).map(lang => <option key={lang.code} value={lang.code}>{selectedLanguage==='en'?`${lang.label} (${lang.nativeLabel})`:lang.nativeLabel}</option>)}
             </select>
          </div>
          <button type="button" className="provider-topbar-button inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold" onClick={()=>setProviderOpen(true)}><Settings size={18} aria-hidden="true"/>{t('aiProvider')}</button>
          </div>
          {(translationStatus||!hasInterfaceTranslation(selectedLanguage))&&<div role="status" className="text-xs text-amber-900 max-w-xs">{translationStatus||t('interfaceFallback')}{!getAIConnection(profile.id).key&&<button className="block underline font-bold mt-1" onClick={()=>setProviderOpen(true)}>{t('connectProvider')}</button>}{translationError&&<button className="block underline font-bold mt-1" onClick={()=>setTranslationRetry(value=>value+1)}>{t('retryTranslation')}</button>}</div>}
          <div className="flex min-w-0 items-center gap-4 max-sm:w-full">
             <div className="relative group max-sm:w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  aria-label={t('searchSubjects')} type="search" 
                  placeholder={t('searchSubjects')} 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); if (activeTab === "dashboard" || activeTab === "history") setActiveTab("courses"); }}
                  className="pl-11 pr-6 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-64 max-sm:w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-sm font-medium"
                />
             </div>
          </div>
        </div>

        {activeTab === 'profile' ? <div className="p-6 lg:p-12 max-w-4xl mx-auto"><h1 className="text-3xl font-black mb-3">{t('studentProfile')}</h1><p className="text-slate-500 mb-7">{cloudConfigured?'Your profile and learning progress are saved to your account.':t('profileSaved')}</p><div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-10">{cloudConfigured && cloudUserEmail() && <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-bold text-slate-600">Account email</p><p className="mt-1 break-all text-slate-900">{cloudUserEmail()}</p></div>}<StudentProfileForm initial={profile} onSave={value=>{setProfile(value);setSelectedLanguage(value.language);}}/></div><AccountControls onDeleted={()=>{setProfile(null);setSignedInState(false);setAccountError('');}}/></div> : activeTab === 'study' ? <StudyLab profileId={profile.id} connection={aiConnection} language={selectedLanguage} onOpenProvider={()=>setProviderOpen(true)}/> : activeTab === 'coach' ? <PresentationCoach profileId={profile.id} connection={aiConnection} language={selectedLanguage} onOpenProvider={()=>setProviderOpen(true)}/> : activeTab === 'interview' ? <InterviewBridge initialRecord={interviewRecord}/> : activeTab === 'dashboard' ? <Dashboard profileId={profile.id} onOpenStudy={()=>setActiveTab('study')} onOpenCoach={()=>setActiveTab('coach')}/> : activeTab === 'history' ? (
          <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
            <h1 className="text-3xl font-black text-slate-900">{t('archive')}</h1>
            {sessionHistory.length === 0 ? <p className="text-slate-400">{t('archiveEmpty')}</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sessionHistory.map(record => (
                  <div key={record.id} className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm hover:shadow-lg transition">
                    <h3 className="text-lg font-black mb-4">{displayText(selectedLanguage,record.courseTitle)}</h3>
                    <p className="text-xs text-slate-500 mb-6">{t('teacher')}: {record.teacherName}</p>
                    <button onClick={() => setReplayingRecord(record)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 transition">{t('reviewSession')}</button>
                    <button onClick={() => { setInterviewRecord(record); setActiveTab('interview'); }} className="mt-3 w-full rounded-2xl border border-indigo-300 px-4 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-50">{t('interviewPracticeThis')}</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
            {activeTab === 'home' && (
              <section className="studio-hero relative overflow-hidden text-white">
                <div className="hero-copy relative z-10">
                  <p className="hero-eyebrow">{t('studio')} <span aria-hidden="true">✦</span> {t('heroBuilt')}</p>
                  <h1>{t('mvpHeroOne')}<br/><em>{t('mvpHeroTwo')}</em></h1>
                  <p className="hero-description">{t('mvpHeroDescription')}</p>
                  <button onClick={() => setActiveTab('courses')} className="hero-action">{t('mvpHeroAction')} <span aria-hidden="true">↗</span></button>
                </div>
                <div className="hero-art" aria-hidden="true"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-orbit orbit-three"/><div className="hero-art-center">EV<span>✳</span></div><span className="art-star star-one">✦</span><span className="art-star star-two">✦</span><span className="art-note">{t('curiosity')}</span></div>
                <div className="hero-bottom" aria-hidden="true"><span>01 / {t('discover')}</span><span>02 / {t('customize')}</span><span>03 / {t('learn')}</span></div>
              </section>
            )}
            <section id="subject-library" className="space-y-10 scroll-mt-28">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div><p className="section-eyebrow">{t('nextSpark')}</p><h2 className="text-3xl font-black text-slate-900">{activeTab==='home'?<button type="button" className="home-section-toggle" aria-expanded={openHomeSection==='library'} aria-controls="library-content" onClick={()=>setOpenHomeSection(value=>value==='library'?null:'library')}>{t('subjectLibrary')}<span className="accent-period">.</span><ChevronDown aria-hidden="true" className={openHomeSection==='library'?'home-section-chevron open':'home-section-chevron'}/></button>:<>{t('subjectLibrary')}<span className="accent-period">.</span></>}</h2></div>
                  <span role="status" className="text-sm text-slate-500">{filteredCourses.length} {t('courses')}</span>
                </div>

                {(activeTab!=='home'||openHomeSection==='library')&&<>
                <div className="flex flex-wrap items-center gap-3">
                  <label htmlFor="segment" className="text-sm font-semibold">{t('learningLevel')}</label>
                  <select id="segment" className="border border-slate-200 rounded-xl p-3 bg-white" value={segmentFilter} onChange={e => { const level=e.target.value as Segment | 'All';setSegmentFilter(level);if(level!=='All')setCustomLevel(level); }}>
                    <option value="All">{t('allLevels')}</option>{Object.values(Segment).map(segment => <option key={segment} value={segment}>{levelLabel(segment)}</option>)}
                  </select>
                  <button className="text-indigo-700 text-sm font-semibold p-3" onClick={() => { setSearchQuery(''); setSegmentFilter('All'); setCategoryFilter('All'); }}>{t('resetFilters')}</button>
                </div>
                <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
                  <button 
                    aria-pressed={categoryFilter === 'All'} onClick={() => setCategoryFilter('All')}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${categoryFilter === 'All' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'}`}
                  >
                    {t('allSubjects')}
                  </button>
                  {categories.map(cat => (
                    <button 
                      key={cat.label} 
                      aria-pressed={categoryFilter === cat.label} onClick={() => setCategoryFilter(cat.label)}
                      className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${categoryFilter === cat.label ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'}`}
                    >
                      <cat.icon size={14} />
                      {cat.displayLabel}
                    </button>
                  ))}
                </div>
                </>}
              </div>

              {(activeTab!=='home'||openHomeSection==='library')&&<div id="library-content" className="space-y-10">
              <form className="custom-course-panel" onSubmit={planCustomCourse}>
                <div className="custom-course-copy"><p className="section-eyebrow">{t('yourCuriosity')}</p><h3>{t('createCourse')}<span className="accent-period">.</span></h3><p>{t('createCourseHelp')}</p></div>
                <div className="custom-course-fields"><label className="profile-field"><span>{t('learningLevel')}</span><select aria-label={t('learningLevel')} value={customLevel} onChange={e=>setCustomLevel(e.target.value as Segment)}>{Object.values(Segment).map(level=><option key={level} value={level}>{levelLabel(level)}</option>)}</select></label><label className="profile-field"><span>{t('subjectCourse')}</span><input aria-label={t('subjectCourse').replace(' *','')} value={customCourseName} onChange={e=>setCustomCourseName(e.target.value)} required maxLength={100} placeholder={t('subjectExample')}/></label><button type="submit" className="primary-button">{t('planMyCourse')} <span aria-hidden="true">↗</span></button></div>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {filteredCourses.length > 0 ? (
                  filteredCourses.map(course => <CourseCard key={course.id} course={course} onSelect={handleSelectCourse} />)
                ) : (
                  <div className="col-span-full py-20 text-center bg-white border border-slate-200 rounded-[2.5rem]">
                    <Search size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('noCourses')}</p>
                  </div>
                )}
              </div>
              </div>}
            </section>
            {activeTab === 'home' && <section id="recommended-courses" className="space-y-7 scroll-mt-28" aria-labelledby="recommended-courses-title">
              <div><p className="section-eyebrow">{t('recommendedCourses')}</p><h2 id="recommended-courses-title" className="text-3xl font-black text-slate-900"><button type="button" className="home-section-toggle" aria-expanded={openHomeSection==='recommended'} aria-controls="recommended-content" onClick={()=>setOpenHomeSection(value=>value==='recommended'?null:'recommended')}>{t('recommendedTitle')}<span className="accent-period">.</span><ChevronDown aria-hidden="true" className={openHomeSection==='recommended'?'home-section-chevron open':'home-section-chevron'}/></button></h2></div>
              {openHomeSection==='recommended'&&<div id="recommended-content" className="space-y-7"><p className="max-w-3xl text-slate-600">{t('recommendedDescription')}</p><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">{RECOMMENDED_COURSES.map(course=><CourseCard key={course.id} course={course} onSelect={handleSelectCourse}/>)}</div></div>}
            </section>}
            {activeTab === 'home' && <section className="feature-discovery" aria-labelledby="feature-discovery-title"><div><p className="section-eyebrow">{t('mvpMoreEyebrow')}</p><h2 id="feature-discovery-title"><button type="button" className="home-section-toggle" aria-expanded={openHomeSection==='more'} aria-controls="more-content" onClick={()=>setOpenHomeSection(value=>value==='more'?null:'more')}>{t('mvpMoreTitle')}<ChevronDown aria-hidden="true" className={openHomeSection==='more'?'home-section-chevron open':'home-section-chevron'}/></button></h2></div>{openHomeSection==='more'&&<div id="more-content" className="feature-discovery-grid">
              <button type="button" onClick={()=>setActiveTab('study')}><Sparkles aria-hidden="true"/><strong>{t('studyLab')}</strong><span>{t('mvpStudyDescription')}</span><span className="feature-link">{t('mvpDiscover')} ↗</span></button>
              <button type="button" onClick={()=>setActiveTab('coach')}><Presentation aria-hidden="true"/><strong>{t('coachNav')}</strong><span>{t('mvpCoachDescription')}</span><span className="feature-link">{t('mvpDiscover')} ↗</span></button>
              <button type="button" onClick={()=>document.getElementById('teaching-language-select')?.focus()}><Languages aria-hidden="true"/><strong>{t('mvpLanguages')}</strong><span>{t('mvpLanguagesDescription')}</span><span className="feature-link">{t('mvpChooseLanguage')} ↗</span></button>
              <button type="button" onClick={()=>{setInterviewRecord(null);setActiveTab('interview');}}><MessagesSquare aria-hidden="true"/><strong>{t('interviewNav')}</strong><span>{t('mvpInterviewDescription')}</span><span className="feature-link">{t('mvpDiscover')} ↗</span></button>
            </div>}</section>}
          </div>
        )}
      </main>
    </div></UiProvider>
  );
};

export default App;
