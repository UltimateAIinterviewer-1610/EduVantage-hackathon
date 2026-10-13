import { createId } from './id';
import { StudentProfile } from '../types';
import { cloudConfigured, persistLearnerData } from './cloud';
export const PROFILE_KEY='edu_student_profile';
export function readProfile(): StudentProfile | null {
 try {
  const raw=localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  const value=JSON.parse(raw);
  if (cloudConfigured && (Number(value?.age) < 3 || !Number.isInteger(Number(value?.age)) || String(value?.country || '').trim().toLowerCase() !== 'india')) return null;
  if(value && typeof value.name==='string' && typeof value.country==='string' && !value.id){value.id=createId();try{persistLearnerData(PROFILE_KEY,JSON.stringify(value));}catch{}}
  return value && typeof value.name==='string' && typeof value.country==='string' && value.name.trim() && value.country.trim()
   ? {id: typeof value.id==='string' && value.id ? value.id : undefined,name:value.name,age:String(value.age||''),className:String(value.className||''),institution:String(value.institution||''),address:String(value.address||''),city:String(value.city||''),state:String(value.state||''),country:value.country,language:value.language||'en'} : null;
 } catch {return null;}
}
export function saveProfile(profile: StudentProfile): boolean {
 try {persistLearnerData(PROFILE_KEY,JSON.stringify(profile));return true;} catch {return false;}
}
export function isSignedIn(): boolean {try{return sessionStorage.getItem('edu_signed_in')==='1';}catch{return false;}}
export function setSignedIn(value:boolean): void {try {if(value) sessionStorage.setItem('edu_signed_in','1');else sessionStorage.removeItem('edu_signed_in');}catch {}}
