// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { COURSES } from '../constants';
import { displayText, ui } from '../uiText';
import { prepareInterfaceTranslation, loadCachedInterface } from '../services/interfaceTranslation';

beforeEach(()=>{localStorage.clear();});
afterEach(()=>vi.unstubAllGlobals());

test('translates and caches interface and curriculum text while preserving source course data',async()=>{
 const fetchMock=vi.fn(async (_url:string,options:RequestInit)=>{
  const payload=JSON.parse(String(options.body));
  const source=JSON.parse(payload.messages.at(-1).content);
  const translated=Object.fromEntries(Object.entries(source).map(([key,value])=>[key,`ES ${value}`]));
  return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(translated)}}]})};
 });
 vi.stubGlobal('fetch',fetchMock);
 const course=COURSES[0];
 const sourceTitle=course.title;
 const progress:number[]=[];
 await prepareInterfaceTranslation('es',{provider:'openai',key:'test-key',model:'test-model',source:'session'},(count)=>progress.push(count),new AbortController().signal);
 expect(ui('es','home')).toBe('ES Home');
 expect(displayText('es',course.title)).toBe(`ES ${sourceTitle}`);
 expect(course.title).toBe(sourceTitle);
 expect(progress.at(-1)).toBeGreaterThan(100);
 const callCount=fetchMock.mock.calls.length;
 expect(loadCachedInterface('es')).toBe(progress.at(-1));
 await prepareInterfaceTranslation('es',{provider:'openai',key:'test-key',model:'test-model',source:'session'},()=>{},new AbortController().signal);
 expect(fetchMock).toHaveBeenCalledTimes(callCount);
});
