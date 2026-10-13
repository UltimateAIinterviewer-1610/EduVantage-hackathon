
import React from 'react';
import { BookOpen, UserCheck, TrendingUp, Building2, ChevronRight, Terminal, Music, Play, Zap, Palette, Clover } from 'lucide-react';
import { Course, Segment } from '../types';
import { useDisplayText, useUi } from '../uiText';

interface CourseCardProps {
  course: Course;
  onSelect: (course: Course) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onSelect }) => {
  const t=useUi();
  const display=useDisplayText();
  const getIcon = () => {
    switch(course.segment) {
      case Segment.School: return <BookOpen className="text-sky-500" />;
      case Segment.University: return <TrendingUp className="text-purple-500" />;
      case Segment.Individual: return <UserCheck className="text-emerald-500" />;
      case Segment.Business: return <Building2 className="text-indigo-500" />;
    }
  };

  const getFormatBadge = () => {
    switch(course.format) {
      case 'Practical': return 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5';
      case 'Lecture': return 'border-indigo-500/30 text-indigo-500 bg-indigo-500/5';
      case 'Masterclass': return 'border-amber-500/30 text-amber-500 bg-amber-500/5';
    }
  };

  const getLevelBadge = () => {
    switch(course.level) {
      case 'Beginner': return 'bg-emerald-100 text-emerald-700';
      case 'Intermediate': return 'bg-amber-100 text-amber-700';
      case 'Advanced': return 'bg-rose-100 text-rose-700';
    }
  };

  return (
    <div 
      role="button" tabIndex={0} aria-label={`${t('planClass')} ${display(course.title)}`}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(course); } }}
      onClick={() => onSelect(course)}
      className="course-card group bg-white rounded-[2rem] p-8 border border-slate-200 hover:border-indigo-400 hover:shadow-2xl transition-all cursor-pointer flex flex-col relative overflow-hidden h-full"
    >
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
        {getIcon()}
      </div>

      <div className="flex justify-between items-start mb-6">
        <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
          {getIcon()}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getLevelBadge()}`}>
            {t(course.level==='Beginner'?'beginner':course.level==='Intermediate'?'intermediate':'advanced')}
          </span>
          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getFormatBadge()}`}>
            {t(course.format==='Lecture'?'lecture':course.format==='Practical'?'practical':'masterclass')}
          </span>
        </div>
      </div>
      
      <h3 className="course-card-title font-black text-slate-900 text-xl mb-3 leading-tight group-hover:text-indigo-600 transition">
        {display(course.title)}
      </h3>
      
      <p className="text-slate-500 text-sm mb-8 flex-1 leading-relaxed">
        {display(course.description)}
      </p>
      
      <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px]">
          {display(course.category)}
        </span>
        <div className="flex items-center text-indigo-600 font-black text-xs uppercase tracking-widest group-hover:translate-x-1 transition-transform">
          {t('planClass')} <ChevronRight size={16} />
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
