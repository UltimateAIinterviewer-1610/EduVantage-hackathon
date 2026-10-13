export interface ApiRequest { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown }
export interface ApiResponse { status: (code: number) => ApiResponse; setHeader: (name: string, value: string) => ApiResponse; json: (body: unknown) => void }
export function respond(res: ApiResponse, code: number, message: string) { res.status(code).json({ error: message }); }
export async function authenticatedUser(req: ApiRequest): Promise<{ id: string; email?: string } | null> {
  const base = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const authorization = req.headers.authorization;
  const bearer = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!base || !anon || !bearer?.startsWith('Bearer ')) return null;
  const result = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anon, Authorization: bearer }, signal: AbortSignal.timeout(8000) });
  if (!result.ok) return null;
  const user = await result.json();
  return typeof user?.id === 'string' ? { id: user.id, email: typeof user.email === 'string' ? user.email : undefined } : null;
}
export async function authenticated(req: ApiRequest): Promise<boolean> { return Boolean(await authenticatedUser(req)); }
export function bodyObject(req: ApiRequest): Record<string, unknown> | null {
  try {
    const value = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}
