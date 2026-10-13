import { expect, test } from 'vitest';
import { classroomVoiceLocale, matchingClassroomVoices, preferredClassroomVoice } from '../services/classroomVoice';

const voice=(name:string,lang:string,voiceURI=name)=>({name,lang,voiceURI,default:false} as SpeechSynthesisVoice);

test('chooses a natural voice in the teaching language when the browser provides one',()=>{
 const voices=[voice('Default English','en-US'),voice('Natural Hindi','hi-IN'),voice('Basic Hindi','hi-IN')];
 expect(preferredClassroomVoice(voices,'hi')?.name).toBe('Natural Hindi');
 expect(matchingClassroomVoices(voices,'hi')).toHaveLength(2);
 expect(classroomVoiceLocale('en-hi')).toBe('en-IN');
});

test('respects a chosen voice and falls back when it is unavailable',()=>{
 const voices=[voice('Basic','en-US'),voice('Premium','en-GB')];
 expect(preferredClassroomVoice(voices,'en','Basic')?.name).toBe('Basic');
 expect(preferredClassroomVoice(voices,'en','missing')?.name).toBe('Premium');
});
