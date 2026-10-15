/** Return the exact source span for a provider quote, tolerating PDF whitespace and punctuation changes. */
export function matchingStudyEvidence(source: string, quote: string): string | null {
  const positions: number[] = [];
  let canonical = '';
  for (let index = 0; index < source.length; index++) {
    const folded = source[index].normalize('NFKC').toLocaleLowerCase();
    for (const char of folded) if (/[\p{L}\p{N}]/u.test(char)) { canonical += char; positions.push(index); }
  }
  const needle = [...quote.normalize('NFKC').toLocaleLowerCase()].filter(char => /[\p{L}\p{N}]/u.test(char)).join('');
  if (needle.length < 12) return null;
  const start = canonical.indexOf(needle);
  if (start < 0) return null;
  return source.slice(positions[start], positions[start + needle.length - 1] + 1);
}
