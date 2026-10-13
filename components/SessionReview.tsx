import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { SessionRecord } from '../types';
import { useDisplayText, useUi } from '../uiText';
import TeachingBoard from './TeachingBoard';

export default function SessionReview({ record, onClose }: { record: SessionRecord; onClose: () => void }) {
  const t = useUi();
  const display = useDisplayText();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="review-title" className="session-review rounded-3xl bg-white text-slate-900 p-0 shadow-2xl">
    <header className="flex items-start justify-between gap-4 p-6 border-b border-slate-200">
      <div><h2 id="review-title" className="text-xl font-bold">{display(record.courseTitle)}</h2><p className="text-sm text-slate-500 mt-2">{record.teacherName} · {new Date(record.timestamp).toLocaleString()} · {Math.floor(record.duration / 60)}m {record.duration % 60}s</p></div>
      <button autoFocus aria-label={t('closeReview')} onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X /></button>
    </header>
    <div className="p-6 space-y-6">
      {record.lessonPlan&&<section className="rounded-xl bg-indigo-50 p-4"><h3 className="font-bold mb-2">{t('learningPlan')}</h3><p>{display(record.lessonPlan.subject)} · {display(record.lessonPlan.chapter)} · {display(record.lessonPlan.topic)}</p>{record.lessonPlan.requirements&&<p className="mt-2 text-sm whitespace-pre-wrap">{record.lessonPlan.requirements}</p>}</section>}
      {record.videoUrl && record.videoUrl !== '#' ? <video controls src={record.videoUrl} className="w-full rounded-xl" /> : <p className="text-sm text-slate-500">{t('savedTextOnly')}</p>}
      {record.sourceRefs?.length ? <section className="rounded-xl bg-emerald-50 p-4"><h3 className="font-bold mb-2">{t('studyEvidence')}</h3>{record.sourceRefs.map((source,index)=><details key={index} className="mb-2"><summary className="cursor-pointer">[{index+1}] {source.title} · {source.label}</summary><p className="text-sm mt-2">{source.excerpt}</p></details>)}</section>:null}
      <section><h3 className="font-bold mb-3">{t('lessonNotes')}</h3>{record.whiteboard?.length ? record.whiteboard.map(item => <div key={item.id} className="rounded-xl bg-slate-50 p-4 mb-3 whitespace-pre-wrap break-words">{item.teachingStep ? <TeachingBoard step={item.teachingStep}/> : <>{item.topic && <h4 className="font-semibold mb-2">{item.topic}</h4>}{item.type === 'code' ? <pre className="overflow-auto"><code>{item.content}</code></pre> : item.content}</>}{item.sources?.map(source=><details key={source.number} className="mt-2"><summary className="cursor-pointer">[{source.number}] {source.title} · {source.label}</summary><p className="text-sm mt-2">{source.excerpt}</p></details>)}</div>) : <p className="text-slate-500 text-sm">{t('noWhiteboard')}</p>}</section>
      <section><h3 className="font-bold mb-3">{t('conversation')}</h3>{record.transcript?.length ? record.transcript.map((line, index) => <p key={index} className="p-3 mb-2 bg-indigo-50 rounded-xl whitespace-pre-wrap break-words"><strong>{line.user ? `${t('you')}: ` : `${t('teacher')}: `}</strong>{line.user || line.ai}</p>) : <p className="text-slate-500 text-sm">{t('noTranscript')}</p>}</section>
    </div>
  </dialog>;
}
