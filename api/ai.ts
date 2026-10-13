import { PROVIDERS, TEXT_MODEL, isSupportedProvider, isGroqTeachingModel } from '../services/providerCatalog.js';
import { chatPayload, chatHeaders, chatText, providerError } from '../services/providerProtocol.js';
import { authenticated, bodyObject, respond } from '../server/auth.js';
import type { ApiRequest, ApiResponse } from '../server/auth.js';
import { providerLimit } from '../services/providerLimits.js';
import { providerDiagnostics, diagnosticSuffix } from '../services/providerDiagnostics.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return respond(res, 405, 'Method not allowed.');
  try {
    if (!await authenticated(req)) return respond(res, 401, 'Sign in again.');
    const body = bodyObject(req);
    if (!body || JSON.stringify(body).length > 100000) return respond(res, 413, 'The request is too large.');
    const { provider, key, model } = body;
    if (!isSupportedProvider(provider)) return respond(res, 400, 'Unsupported provider.');
    if (body.baseUrl !== undefined || body.url !== undefined) return respond(res, 400, 'Client-supplied provider URLs are not accepted.');
    if (typeof key !== 'string' || key.length < 8 || key.length > 512 || typeof model !== 'string' || !/^[\w.:/-]{1,100}$/.test(model)) return respond(res, 400, 'Invalid provider settings.');
    if (provider === 'groq' && !isGroqTeachingModel(model)) return respond(res, 400, 'Unsupported Groq teaching model. Choose a listed model in AI Provider.');
    const requestedTokens = Number(body.maxTokens);
    const maxTokens = Number.isFinite(requestedTokens) ? Math.max(1, Math.min(Math.floor(requestedTokens), 4096)) : 1200;
    let target: string, payload: unknown, headers: Record<string, string>;
    if (provider === 'gemini') {
      if (model !== TEXT_MODEL || typeof body.prompt !== 'string' || body.prompt.length > 80000) return respond(res, 400, 'Invalid Gemini request.');
      target = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      headers = { 'Content-Type': 'application/json', 'x-goog-api-key': key };
      payload = { contents: [{ parts: [{ text: body.prompt }] }], generationConfig: { responseMimeType: body.json ? 'application/json' : 'text/plain', maxOutputTokens: maxTokens } };
    } else {
      if (!Array.isArray(body.messages) || body.messages.length > 30 || body.messages.some((item: any) => !item || !['system', 'user', 'assistant'].includes(item.role) || typeof item.content !== 'string' || item.content.length > 16000)) return respond(res, 400, 'Invalid messages.');
      target = PROVIDERS[provider].endpoint;
      headers = chatHeaders(provider, key);
      payload = chatPayload(provider, model, body.messages, maxTokens);
    }
    const upstream = await fetch(target, { method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(25000), redirect: 'error' });
    if (!upstream.ok) {
      let details = ''; try { details = (await upstream.text()).slice(0,4000); } catch {}
      let errorBody: unknown = null; try { errorBody = JSON.parse(details); } catch {}
      const diagnostic = providerDiagnostics(errorBody, upstream.headers);
      const limit=providerLimit({provider,model},upstream.status,details,upstream.headers?.get?.('Retry-After') || null);
      const retryAt=limit?.retryAt||null;
      const kind=limit?.kind||null;
      res.setHeader('X-Edu-Upstream-Status',String(upstream.status));
      if (diagnostic.type) res.setHeader('X-Edu-Upstream-Type', diagnostic.type);
      if (diagnostic.requestId) res.setHeader('X-Edu-Upstream-Request-Id', diagnostic.requestId);
      if (kind) {
        res.setHeader('X-Edu-Limit-Kind',kind);
        if (retryAt) res.setHeader('Retry-After',new Date(retryAt).toUTCString());
      }
      return respond(res, upstream.status === 401 || upstream.status === 403 ? 403 : [400, 402, 404, 410, 422, 429].includes(upstream.status) ? upstream.status : 502, (limit?.message || providerError(upstream.status,provider,model)) + diagnosticSuffix(diagnostic));
    }
    let value: any; try { value = await upstream.json(); } catch { res.setHeader('X-Edu-Upstream-Status', String(upstream.status)); return respond(res, 502, 'The provider returned an unreadable response. No request was resent.'); }
    if (value?.error || value?.status === 'failed') {
      res.setHeader('X-Edu-Upstream-Status', String(upstream.status));
      const diagnostic = providerDiagnostics(value, upstream.headers);
      return respond(res, 502, `The provider reported a failed request despite HTTP 200. No request was resent.${diagnosticSuffix(diagnostic)}`);
    }
    const output = provider === 'gemini' ? value?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('') : chatText(provider, value);
    if (typeof output !== 'string' || !output.trim()) { res.setHeader('X-Edu-Upstream-Status', String(upstream.status)); return respond(res, 502, 'The provider returned no teaching text. No request was resent.'); }
    res.status(200).json({ text: output.trim() });
  } catch { respond(res, 503, 'EduVantage could not reach the provider from its server. Check server connectivity and try again when you choose; no request was resent.'); }
}
