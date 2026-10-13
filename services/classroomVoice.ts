export function classroomVoiceLocale(language:string):string {
  return language==='en-hi'?'en-IN':language;
}

export function matchingClassroomVoices(voices:SpeechSynthesisVoice[],language:string):SpeechSynthesisVoice[] {
  const locale=classroomVoiceLocale(language).toLowerCase();
  const base=locale.split('-')[0];
  const matching=voices.filter(voice=>voice.lang.toLowerCase().split('-')[0]===base);
  return matching.length?matching:voices;
}

export function preferredClassroomVoice(voices:SpeechSynthesisVoice[],language:string,voiceURI?:string):SpeechSynthesisVoice|undefined {
  if(voiceURI){const selected=voices.find(voice=>voice.voiceURI===voiceURI);if(selected)return selected;}
  const locale=classroomVoiceLocale(language).toLowerCase();
  return [...matchingClassroomVoices(voices,language)].sort((a,b)=>score(b)-score(a))[0];
  function score(voice:SpeechSynthesisVoice):number {
    const name=voice.name.toLowerCase();
    const lang=voice.lang.toLowerCase();
    return (lang===locale?100:0)+(lang.split('-')[0]===locale.split('-')[0]?40:0)+(/natural|neural|enhanced|premium/.test(name)?30:0)+(voice.default?5:0);
  }
}
