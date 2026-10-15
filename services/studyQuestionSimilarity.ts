const tokens = (prompt: string) => new Set(prompt.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || []);

/** Conservative word-overlap guard, not a semantic equivalence model. */
export function similarStudyQuestion(left: string, right: string): boolean {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return false;
  if (a.size === b.size && [...a].every(token => b.has(token))) return true;
  if (Math.min(a.size, b.size) < 5) return false;
  const shared = [...a].filter(token => b.has(token)).length;
  return shared / new Set([...a, ...b]).size >= 0.85 && shared / Math.min(a.size, b.size) >= 0.9;
}
