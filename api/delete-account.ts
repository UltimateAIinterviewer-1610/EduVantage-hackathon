import { authenticatedUser, bodyObject, respond } from '../server/auth.js';
import type { ApiRequest, ApiResponse } from '../server/auth.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return respond(res, 405, 'Method not allowed.');
  try {
    const user = await authenticatedUser(req);
    if (!user) return respond(res, 401, 'Sign in again.');
    const body = bodyObject(req);
    if (body?.confirmation !== 'DELETE' || typeof body.password !== 'string' || !body.password || !user.email) return respond(res, 400, 'Enter DELETE and your current password to confirm.');
    const base = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!base || !anon || !serviceKey) return respond(res, 503, 'Account deletion is not configured. Contact support.');
    const verified = await fetch(`${base}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password: body.password }), signal: AbortSignal.timeout(8000) });
    if (!verified.ok) return respond(res, 403, 'Current password was not accepted.');
    const credentials = await verified.json();
    if (credentials?.user?.id !== user.id) return respond(res, 403, 'Account verification failed.');
    const result = await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, { method: 'DELETE', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, signal: AbortSignal.timeout(10000) });
    if (!result.ok) return respond(res, 502, 'Account deletion could not be completed. Try again or contact support.');
    res.status(200).json({ deleted: true });
  } catch { respond(res, 503, 'Account deletion is temporarily unavailable.'); }
}
