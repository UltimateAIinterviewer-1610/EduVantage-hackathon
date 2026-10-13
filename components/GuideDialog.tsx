import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChartNoAxesCombined, CircleHelp, Globe2, GraduationCap, History, KeyRound, ListChecks, MessagesSquare, Sparkles, UserRound, X } from 'lucide-react';
import { UiKey, useUi } from '../uiText';

export type GuideDestination='profile'|'courses'|'study'|'coach'|'interview'|'provider'|'history'|'dashboard';
const steps:{title:UiKey;description:UiKey;icon:React.ComponentType<{size?:number}>;destination?:GuideDestination}[]=[
 {title:'guideProfileTitle',description:'guideProfileBody',icon:UserRound,destination:'profile'},
 {title:'guideLanguageTitle',description:'guideLanguageBody',icon:Globe2},
 {title:'guideProviderTitle',description:'guideProviderBody',icon:KeyRound,destination:'provider'},
 {title:'guideBrowseTitle',description:'guideBrowseBody',icon:BookOpen,destination:'courses'},
 {title:'guideCustomTitle',description:'guideCustomBody',icon:Sparkles,destination:'courses'},
 {title:'guidePlanTitle',description:'guidePlanBody',icon:ListChecks,destination:'courses'},
 {title:'guideClassTitle',description:'guideClassBody',icon:GraduationCap},
 {title:'guideStudyTitle',description:'guideStudyBody',icon:Sparkles,destination:'study'},
 {title:'guideCoachTitle',description:'guideCoachBody',icon:GraduationCap,destination:'coach'},
 {title:'guideArchiveTitle',description:'guideArchiveBody',icon:History,destination:'history'},
 {title:'interviewGuideTitle',description:'interviewGuideBody',icon:MessagesSquare,destination:'interview'},
 {title:'guideDashboardTitle',description:'guideDashboardBody',icon:ChartNoAxesCombined,destination:'dashboard'},
];

export default function GuideDialog({onClose,onNavigate}:{onClose:()=>void;onNavigate?:(destination:GuideDestination)=>void}) {
 const t=useUi();
 const dialog=useRef<HTMLDialogElement>(null);
 const [step,setStep]=useState(0);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  dialog.current?.showModal();
  return ()=>{dialog.current?.close();previous?.focus();};
 },[]);
 const current=steps[step];
 const Icon=current.icon;
 return <dialog ref={dialog} onCancel={onClose} aria-labelledby="guide-title" aria-describedby="guide-intro" className="guide-dialog">
  <div className="guide-header">
   <div><p className="guide-kicker"><CircleHelp size={16}/>{t('guideEyebrow')}</p><h2 id="guide-title">{t('guideTitle')}</h2><p id="guide-intro">{t('guideIntro')}</p></div>
   <button autoFocus type="button" onClick={onClose} aria-label={t('guideClose')} className="guide-close"><X size={22}/></button>
  </div>
  <div className="guide-layout">
   <nav className="guide-steps" aria-label={t('guideSteps')}>
    {steps.map((item,index)=><button key={item.title} type="button" onClick={()=>setStep(index)} aria-current={index===step?'step':undefined} className={index===step?'active':''}><span className="guide-step-number">{String(index+1).padStart(2,'0')}</span><span>{t(item.title)}</span></button>)}
   </nav>
   <section className="guide-content" aria-live="polite">
    <div className="guide-visual" aria-hidden="true"><span className="guide-orbit"/><span className="guide-orbit second"/><Icon size={54}/><span className="guide-visual-number">{String(step+1).padStart(2,'0')}</span></div>
    <p className="guide-step-label">{t('guideStep',{current:step+1,total:steps.length})}</p>
    <h3>{t(current.title)}</h3>
    <p className="guide-description">{t(current.description)}</p>
    {current.destination&&onNavigate&&<button type="button" className="guide-jump" onClick={()=>{onClose();onNavigate(current.destination!);}}>{t('guideOpenSection')} <ArrowRight size={18}/></button>}
    <div className="guide-progress" aria-hidden="true"><span style={{width:`${((step+1)/steps.length)*100}%`}}/></div>
    <div className="guide-actions"><button type="button" onClick={()=>setStep(value=>Math.max(0,value-1))} disabled={step===0}><ArrowLeft size={18}/>{t('guideBack')}</button><button type="button" className="guide-next" onClick={()=>step===steps.length-1?onClose():setStep(value=>value+1)}>{step===steps.length-1?t('guideDone'):t('guideNext')}<ArrowRight size={18}/></button></div>
   </section>
  </div>
 </dialog>;
}
