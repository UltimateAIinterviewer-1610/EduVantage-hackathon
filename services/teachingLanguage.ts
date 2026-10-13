export function teachingLanguageStyle(language: string): string {
  return language === 'en-hi'
    ? 'For Hinglish, use simple Hindi sentences in Roman script with English technical terms where useful. Keep narration, board labels, and questions in the same style; do not alternate between separate English and Hindi sections.'
    : 'Keep narration, board labels, and questions in the selected teaching language.';
}
