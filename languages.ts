import { LANGUAGES } from './constants';
import { LanguageCode, LanguageOption } from './types';

const extras: LanguageOption[] = [
 {code:'ur',label:'Urdu',nativeLabel:'اردو'}, {code:'id',label:'Indonesian',nativeLabel:'Bahasa Indonesia'},
 {code:'ms',label:'Malay',nativeLabel:'Bahasa Melayu'}, {code:'th',label:'Thai',nativeLabel:'ไทย'},
 {code:'vi',label:'Vietnamese',nativeLabel:'Tiếng Việt'}, {code:'tr',label:'Turkish',nativeLabel:'Türkçe'},
 {code:'fa',label:'Persian',nativeLabel:'فارسی'}, {code:'sw',label:'Swahili',nativeLabel:'Kiswahili'},
 {code:'nl',label:'Dutch',nativeLabel:'Nederlands'}, {code:'pl',label:'Polish',nativeLabel:'Polski'},
 {code:'uk',label:'Ukrainian',nativeLabel:'Українська'}, {code:'ne',label:'Nepali',nativeLabel:'नेपाली'},
 {code:'si',label:'Sinhala',nativeLabel:'සිංහල'}, {code:'fil',label:'Filipino',nativeLabel:'Filipino'},
];
export const ALL_LANGUAGES = [...LANGUAGES, ...extras];
const byCountry: Record<string, LanguageCode[]> = {
 india:['hi','en-hi','ta','te','kn','ml','mr','bn','gu','pa','or','as','sa'],
 pakistan:['ur','pa'],bangladesh:['bn'],nepal:['ne','hi'],sri_lanka:['si','ta'],
 united_states:[],united_kingdom:[],canada:['fr'],australia:[],new_zealand:[],
 spain:['es'],mexico:['es'],argentina:['es'],colombia:['es'],peru:['es'],
 france:['fr'],germany:['de'],austria:['de'],switzerland:['de','fr','it'],
 brazil:['pt'],portugal:['pt'],italy:['it'],russia:['ru'],ukraine:['uk'],poland:['pl'],netherlands:['nl'],
 china:['zh'],taiwan:['zh'],japan:['ja'],south_korea:['ko'],indonesia:['id'],malaysia:['ms','zh','ta'],
 thailand:['th'],vietnam:['vi'],philippines:['fil'],turkey:['tr'],iran:['fa'],
 united_arab_emirates:['ar'],saudi_arabia:['ar'],egypt:['ar'],morocco:['ar','fr'],
 kenya:['sw'],tanzania:['sw'],south_africa:['sw'],
};
export const COUNTRY_SUGGESTIONS = Object.keys(byCountry).map(k=>k.replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase()));
export function suggestedLanguages(country: string): LanguageCode[] {
 const key=country.trim().toLowerCase().replace(/[^a-z]+/g,'_').replace(/^_|_$/g,'');
 return ['en',...(byCountry[key] || [])];
}
export function orderedLanguages(country: string): LanguageOption[] {
 const preferred=suggestedLanguages(country);
 return [...ALL_LANGUAGES].sort((a,b)=>{
  const ai=preferred.indexOf(a.code),bi=preferred.indexOf(b.code);
  return (ai<0?100:ai)-(bi<0?100:bi);
 });
}
