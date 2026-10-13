import { authenticated, bodyObject, respond } from '../server/auth.js';
import type { ApiRequest, ApiResponse } from '../server/auth.js';
import { providerError } from '../services/providerProtocol.js';
import { limitMessage, providerLimit } from '../services/providerLimits.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return respond(res, 405, 'Method not allowed.');
  try {
    if (!await authenticated(req)) return respond(res, 401, 'Sign in again.');
    const body = bodyObject(req);
    const key = body?.key;
    if (typeof key !== 'string' || key.length < 8 || key.length > 512) return respond(res, 400, 'Enter a valid Gemini key.');
    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ uses: 1, expireTime: new Date(Date.now() + 30 * 60_000).toISOString(), newSessionExpireTime: new Date(Date.now() + 60_000).toISOString() }),
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) {
      let details='';try{details=(await upstream.text()).slice(0,4000);}catch{}
      const limit=providerLimit({provider:'gemini'},upstream.status,details,upstream.headers?.get?.('Retry-After') || null);
      const retryAt=limit?.retryAt||null;
      const kind=limit?.kind||null;
      if(kind){res.setHeader('X-Edu-Limit-Kind',kind);if(retryAt)res.setHeader('Retry-After',new Date(retryAt).toUTCString());}
      return respond(res,upstream.status===402||upstream.status===429?upstream.status:502,kind?limitMessage(kind,retryAt):providerError(upstream.status));
    }
    const token = await upstream.json();
    if (typeof token?.name !== 'string') return respond(res, 502, 'Gemini returned an invalid live session token.');
    res.status(200).json({ token: token.name });
  } catch { respond(res, 503, 'Live session token service is unavailable. Try again.'); }
}
