import React from 'react';
import type { Teacher } from '../types';

export default function TeacherAvatar({ teacher, speaking, busy, listening }: { teacher: Teacher; speaking: boolean; busy: boolean; listening: boolean }) {
  const state = listening ? 'Listening' : busy ? 'Preparing the board' : speaking ? 'Explaining' : 'Ready for your question';
  return <aside className={`teacher-avatar ${speaking ? 'is-speaking' : ''}`} aria-label={`AI teacher: ${teacher.name}`}>
    <div className="avatar-stage"><svg viewBox="0 0 180 170" role="img" aria-label="Animated AI teacher avatar"><ellipse cx="90" cy="156" rx="72" ry="12" fill="#102c38"/><path d="M34 162 Q32 112 68 108 L112 108 Q148 112 146 162" fill="#b7e1ce"/><path d="M75 105 L90 133 L105 105" fill="#fff4df"/><rect x="78" y="91" width="24" height="27" rx="9" fill="#cf9272"/><path d="M51 68 Q39 17 87 14 Q139 12 133 76" fill="#263342"/><ellipse cx="90" cy="68" rx="37" ry="43" fill="#eab08b"/><path d="M52 55 Q57 15 96 22 Q125 25 131 56 Q109 51 97 34 Q79 55 52 55" fill="#263342"/><g className="avatar-eyes" fill="#263342"><ellipse cx="75" cy="66" rx="3" ry="4"/><ellipse cx="105" cy="66" rx="3" ry="4"/></g><path d="M90 69 L87 80 L94 80" fill="none" stroke="#bb785f" strokeWidth="2"/><ellipse className="avatar-mouth" cx="90" cy="91" rx="9" ry="2" fill="#833f3f"/><path className="avatar-arm" d="M132 136 Q155 123 160 101" fill="none" stroke="#eab08b" strokeWidth="12" strokeLinecap="round"/><path d="M159 108 L163 85" stroke="#f8f5ed" strokeWidth="4" strokeLinecap="round"/></svg></div>
    <strong>{teacher.name}</strong><span role="status">{state}</span><small>AI avatar · animated illustration</small>
  </aside>;
}
