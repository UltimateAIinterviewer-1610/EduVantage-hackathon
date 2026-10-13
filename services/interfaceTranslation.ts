import { COURSES } from '../constants';
import { ALL_LANGUAGES } from '../languages';
import { chaptersFor, subjectsFor } from '../learningPaths';
import { LanguageCode } from '../types';
import { englishUi, setCatalogTranslations, setInterfaceTranslations, UiKey } from '../uiText';
import { AIConnection, generateGeminiText, sendAIChat } from './aiConnection';

const VERSION=2;
const keyFor=(language:LanguageCode)=>`edu_ui_translation_v${VERSION}_${language}`;
const uiKeys=Object.keys(englishUi) as UiKey[];
const catalogStrings=[...new Set(COURSES.flatMap(course=>[
 course.title,course.description,course.category,
 ...subjectsFor(course).flatMap(subject=>[subject,...chaptersFor(course,subject).flatMap(chapter=>[chapter.title,...chapter.topics])])
]))];
const entries:Record<string,string>={...Object.fromEntries(uiKeys.map(key=>[`ui_${key}`,englishUi[key]])),...Object.fromEntries(catalogStrings.map((value,index)=>[`catalog_${index}`,value]))};
const entryKeys=Object.keys(entries);
type Pack=Record<string,string>;

function validEntry(key:string,value:unknown):value is string {
 const source=entries[key];
 if(!source||typeof value!=='string'||!value.trim()||value.length>source.length*8+120)return false;
 const tokens=source.match(/\{\w+\}/g)||[];
 return tokens.every(token=>value.includes(token));
}
function parsePack(raw:string):Pack {
 let value:any;
 try {value=JSON.parse(raw);} catch {
  const first=raw.indexOf('{'),last=raw.lastIndexOf('}');
  if(first<0||last<=first)return {};
  try {value=JSON.parse(raw.slice(first,last+1));}catch{return {};}
 }
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const pack:Pack={};
 for(const key of entryKeys)if(validEntry(key,value[key]))pack[key]=value[key];
 return pack;
}
function readPack(language:LanguageCode):Pack {
 try {return parsePack(localStorage.getItem(keyFor(language))||'{}');}catch{return {};}
}
function savePack(language:LanguageCode,pack:Pack):void {
 try {localStorage.setItem(keyFor(language),JSON.stringify(pack));}catch{}
}
function applyPack(language:LanguageCode,pack:Pack):void {
 const interfaceValues:Partial<Record<UiKey,string>>={};
 const catalogValues:Record<string,string>={};
 for(const key of uiKeys)if(pack[`ui_${key}`])interfaceValues[key]=pack[`ui_${key}`];
 catalogStrings.forEach((source,index)=>{if(pack[`catalog_${index}`])catalogValues[source]=pack[`catalog_${index}`];});
 setInterfaceTranslations(language,interfaceValues);
 setCatalogTranslations(language,catalogValues);
}
export function loadCachedInterface(language:LanguageCode):number {
 const pack=readPack(language);
 applyPack(language,pack);
 return Object.keys(pack).length;
}
async function browserTranslator(language:LanguageCode):Promise<((text:string)=>Promise<string>)|null> {
 const factory=(globalThis as any).Translator;
 if(!factory?.create)return null;
 try {
  const translator=await factory.create({sourceLanguage:'en',targetLanguage:language});
  return (text:string)=>translator.translate(text);
 }catch{return null;}
}
async function aiTranslate(language:LanguageCode,batch:Record<string,string>,connection:AIConnection,signal:AbortSignal):Promise<string> {
 const label=ALL_LANGUAGES.find(item=>item.code===language)?.label||language;
 const instruction=`Translate this JSON object of app labels and course names from English to ${label} (${language}). Return only a JSON object with exactly the same keys. Translate naturally for a student-facing learning app. Keep placeholders like {name} and {country} unchanged, and preserve product/provider names. Do not translate URLs. No markdown.`;
 if(connection.provider==='gemini'){
  return generateGeminiText(connection.key,`${instruction}\n${JSON.stringify(batch)}`,{json:true,maxTokens:4096,signal});
 }
 return sendAIChat(connection,[{role:'system',content:instruction},{role:'user',content:JSON.stringify(batch)}],signal,4096);
}
export function prepareInterfaceTranslation(language:LanguageCode,connection:AIConnection,onProgress:(count:number,total:number)=>void,signal:AbortSignal):Promise<void> {
 if(language==='en'||language==='hi'||language==='bn')return Promise.resolve();
 const work=(async()=>{
  let pack=readPack(language);
  applyPack(language,pack);
  onProgress(Object.keys(pack).length,entryKeys.length);
  if(Object.keys(pack).length===entryKeys.length)return;
  const translator=await browserTranslator(language);
  if(!translator&&!connection.key)throw new Error('Connect an AI provider to translate this interface, or use a browser with built-in translation.');
  if(connection.key){
   const retry=entryKeys.filter(key=>!pack[key]);
   for(let offset=0;offset<retry.length;offset+=24){
    if(signal.aborted)throw new Error('Translation cancelled.');
    const keys=retry.slice(offset,offset+24);
    const batch=Object.fromEntries(keys.map(key=>[key,entries[key]]));
    try {pack={...pack,...parsePack(await aiTranslate(language,batch,connection,signal))};}
    catch(error){if(!translator)throw error;}
    applyPack(language,pack);savePack(language,pack);
    onProgress(Object.keys(pack).length,entryKeys.length);
   }
  }
  if(translator){
   const untranslated=entryKeys.filter(key=>!pack[key]);
   for(let offset=0;offset<untranslated.length;offset+=8){
    if(signal.aborted)throw new Error('Translation cancelled.');
    await Promise.all(untranslated.slice(offset,offset+8).map(async key=>{
     try {const value=await translator(entries[key]);if(validEntry(key,value))pack[key]=value;}catch{}
    }));
    applyPack(language,pack);savePack(language,pack);
    onProgress(Object.keys(pack).length,entryKeys.length);
   }
  }
  if(Object.keys(pack).length<entryKeys.length)throw new Error(`Some labels could not be translated (${Object.keys(pack).length}/${entryKeys.length}). Try again.`);
 })();
 return work;
}
