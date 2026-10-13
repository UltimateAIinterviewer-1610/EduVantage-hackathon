
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Award, Target, Rocket, ShieldAlert, Sparkles, Languages, Briefcase, Cpu } from 'lucide-react';
import { ReadinessScore } from '../types';
import { UiKey, useUi } from '../uiText';
import { readStudyProgress, studySummary } from '../services/studyProgress';
import { readPresentationAttempts } from '../services/presentationCoach';

const MOCK_READINESS_DATA = [
  { category: 'AI Literacy', score: 85, fullMark: 100 },
  { category: 'Subject Readiness', score: 92, fullMark: 100 },
  { category: 'Ethics', score: 78, fullMark: 100 },
  { category: 'Business AI Index', score: 65, fullMark: 100 },
  { category: 'Language Comfort', score: 88, fullMark: 100 },
  { category: 'Governance', score: 40, fullMark: 100 },
];

const MOCK_LITERACY_DATA = [
  { aspect: 'Algorithmic Bias', score: 85, fullMark: 100 },
  { aspect: 'Data Privacy', score: 90, fullMark: 100 },
  { aspect: 'Prompt Precision', score: 75, fullMark: 100 },
  { aspect: 'Tool Versatility', score: 88, fullMark: 100 },
  { aspect: 'Ethical Reasoning', score: 82, fullMark: 100 },
];

const Dashboard: React.FC<{ profileId: string; onOpenStudy: () => void; onOpenCoach: () => void }> = ({ profileId, onOpenStudy, onOpenCoach }) => {
  const t=useUi();
  const study=studySummary(readStudyProgress(profileId));
  const rehearsals=readPresentationAttempts(profileId);
  const readinessKeys:Record<string,UiKey>={'AI Literacy':'aiLiteracy','Subject Readiness':'subjectReadiness','Ethics':'ethics','Business AI Index':'businessAiIndex','Language Comfort':'languageComfort','Governance':'governance'};
  const literacyKeys:Record<string,UiKey>={'Algorithmic Bias':'algorithmicBias','Data Privacy':'dataPrivacy','Prompt Precision':'promptPrecision','Tool Versatility':'toolVersatility','Ethical Reasoning':'ethicalReasoning'};
  const readinessData=MOCK_READINESS_DATA.map(item=>({...item,category:t(readinessKeys[item.category])}));
  const literacyData=MOCK_LITERACY_DATA.map(item=>({...item,aspect:t(literacyKeys[item.aspect])}));
  return (
    <div className="mastery-dashboard p-8 space-y-8 animate-in fade-in duration-500">
      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm" aria-label={t('studyProgress')}>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-orange-600">{t('studyActual')}</p><h2 className="text-2xl font-black">{t('studyProgress')}</h2></div><button className="primary-button" onClick={onOpenStudy}>{t('studyOpen')}</button></div>
        {study.total ? <div className="mt-4"><p className="font-semibold">{t('studyCorrectOf',{correct:study.correct,total:study.total,accuracy:study.recentAccuracy,recent:Math.min(10,study.total)})}</p><div className="grid sm:grid-cols-2 gap-3 mt-4">{study.topics.slice(0,4).map(item=><div key={item.topic} className="bg-slate-50 rounded-xl p-3"><strong className="block break-words">{item.topic}</strong><span className="text-sm text-slate-600">{item.correct}/{item.total} correct</span></div>)}</div></div> : <p className="text-slate-600 mt-3">{t('studyNoProgress')}</p>}
      </section>
      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm" aria-label={t('coachNav')}>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-orange-600">{t('coachEyebrow')}</p><h2 className="text-2xl font-black">{t('coachNav')}</h2></div><button className="primary-button" onClick={onOpenCoach}>{t('coachStart')}</button></div>
        <p className="text-slate-600 mt-3">{rehearsals.length ? t('coachDashboardLast',{title:rehearsals[0].brief.title,count:rehearsals.length}) : t('coachDashboardEmpty')}</p>
      </section>
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('masteryProfile')}</h1>
          <p className="text-slate-500">{t('sampleReadiness')}</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
              <Award />
            </div>
            <div>
              <div className="text-2xl font-black">128</div>
              <div className="text-[10px] text-slate-500 uppercase font-black tracking-wider">{t('skillCredits')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-slate-800 uppercase tracking-widest text-xs">
              <Target className="text-rose-500" size={16} /> {t('readinessIndex')}
            </h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={readinessData}>
                  <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} axisLine={false} tick={false} />
                  <Radar 
                    name="Readiness" 
                    dataKey="score" 
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    fill="#4f46e5" 
                    fillOpacity={0.4} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-slate-800 uppercase tracking-widest text-xs">
              <Cpu className="text-indigo-500" size={16} /> {t('literacyBreakdown')}
            </h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={literacyData}>
                  <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="aspect" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} axisLine={false} tick={false} />
                  <Radar 
                    name="Literacy" 
                    dataKey="score" 
                    stroke="#0ea5e9" 
                    strokeWidth={3}
                    fill="#0ea5e9" 
                    fillOpacity={0.4} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
          <Rocket className="mb-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" size={32} />
          <h3 className="text-2xl font-black mb-2 tracking-tight">{t('nextMilestone')}</h3>
          <p className="opacity-80 text-sm mb-6 font-medium">{t('milestoneText')}</p>
          <div className="bg-white/10 p-5 rounded-2xl border border-white/20 backdrop-blur-md">
            <div className="flex justify-between mb-2 text-[10px] font-black uppercase tracking-widest">
              <span>{t('progress')}</span>
              <span>65%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white w-[65%] transition-all duration-1000"></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 space-y-6 shadow-sm flex flex-col justify-center">
          <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-3 text-slate-800">
            <ShieldAlert className="text-amber-500" size={16} /> {t('highFocusZones')}
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
              <Languages className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-amber-900 font-bold leading-relaxed">{t('languageComfortText')}</p>
            </div>
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
              <Briefcase className="text-rose-600 shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-rose-900 font-bold leading-relaxed">{t('businessReadinessText')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
