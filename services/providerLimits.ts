import type { AIConnection } from './aiConnection.js';

export type LimitKind = 'short' | 'daily' | 'credits' | 'unknown';
export class ProviderLimitError extends Error {
  constructor(public kind: LimitKind, public retryAt: number | null, message: string) { super(message); this.name = 'ProviderLimitError'; }
}
const MAX_WAIT = 30 * 24 * 60 * 60 * 1000;
const prefix = 'edu_provider_wait_v1_';
const scope = (connection: Pick<AIConnection,'provider'|'model'|'baseUrl'>) =>
  prefix + encodeURIComponent(connection.provider === 'custom' ? [connection.provider,connection.model || '',connection.baseUrl || ''].join('|') : connection.provider === 'groq' ? [connection.provider,connection.model || ''].join('|') : connection.provider);

export function parseRetryAfter(value: string | null, now = Date.now()): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  const at = /^\d+(?:\.\d+)?$/.test(trimmed) ? now + Number(trimmed) * 1000 : Date.parse(trimmed);
  return Number.isFinite(at) && at > now && at - now <= MAX_WAIT ? Math.ceil(at) : null;
}
function retryFromDetails(details:string):number|null {
  try {
    const root=JSON.parse(details);
    const pending=[root];let visited=0;
    while(pending.length&&visited++<40){
      const value=pending.shift();if(!value||typeof value!=='object')continue;
      for(const [key,item] of Object.entries(value)){
        if(/^(?:retry_after|retryAfter)$/i.test(key)&&typeof item==='number')return parseRetryAfter(String(item));
        if(/^(?:retry_after|retryAfter|retryDelay)$/i.test(key)&&typeof item==='string'){
          const candidate=/^\d+(?:\.\d+)?s$/.test(item)?item.slice(0,-1):item;
          const at=parseRetryAfter(candidate);if(at)return at;
        }
        if(item&&typeof item==='object')pending.push(item);
      }
    }
  } catch {}
  return null;
}
export function classifyLimit(status: number, details = '', retryAt: number | null = null): LimitKind | null {
  if (status === 402 || ([400,403,429].includes(status) && /(?:insufficient[_ -]?quota|billing|payment.required|no.api.credits|credit.balance)/i.test(details))) return 'credits';
  if (status !== 429) return null;
  if (/(?:daily|per.day|per_day|day.limit|day.quota|quota.exceeded.per.day)/i.test(details)) return 'daily';
  if (retryAt || /^(?:short|temporary)$/i.test(details.trim()) || /(?:rate.limit|too.many.requests|requests.per.minute|tokens.per.minute|rpm|tpm)/i.test(details)) return 'short';
  return 'unknown';
}
export function limitMessage(kind: LimitKind, retryAt: number | null): string {
  const when = retryAt ? ` Retry after ${new Date(retryAt).toLocaleString()}.` : '';
  if (kind === 'credits') return 'This provider needs API credits or billing. Check its billing account before requesting more AI work.';
  if (kind === 'daily') return `This provider reports that its daily quota is exhausted. Check its usage dashboard for the reset time.${when}`;
  if (kind === 'short') return `This provider reports a temporary rate limit.${when || ' It did not provide a retry time; check its usage limits before trying again.'}`;
  return `This provider returned HTTP 429 (rate or quota limit), but did not reveal which limit was reached.${when || ' It did not provide a retry time.'}`;
}
export function readProviderWait(connection: Pick<AIConnection,'provider'|'model'|'baseUrl'>, now = Date.now()): {kind:LimitKind;retryAt:number}|null {
  try {
    const data = JSON.parse(localStorage.getItem(scope(connection)) || 'null');
    if (data && ['short','daily','unknown'].includes(data.kind) && Number.isFinite(data.retryAt) && data.retryAt > now && data.retryAt - now <= MAX_WAIT) return data;
    localStorage.removeItem(scope(connection));
  } catch {}
  return null;
}
export function providerLimit(connection: Pick<AIConnection,'provider'|'model'|'baseUrl'>, status: number, details = '', retryHeader: string | null = null): ProviderLimitError | null {
  const retryAt = parseRetryAfter(retryHeader) || retryFromDetails(details);
  const kind = classifyLimit(status, details, retryAt);
  if (!kind) return null;
  if (retryAt) try { localStorage.setItem(scope(connection), JSON.stringify({kind,retryAt})); } catch {}
  return new ProviderLimitError(kind, retryAt, `${connection.provider === 'groq' ? `Groq model ${connection.model || 'selected'}: ` : ''}${limitMessage(kind,retryAt)}`);
}
export function assertProviderReady(connection: Pick<AIConnection,'provider'|'model'|'baseUrl'>): void {
  const wait = readProviderWait(connection);
  if (wait) throw new ProviderLimitError(wait.kind,wait.retryAt,`${connection.provider === 'groq' ? `Groq model ${connection.model || 'selected'}: ` : ''}${limitMessage(wait.kind,wait.retryAt)}`);
}
export function asProviderLimit(error: unknown): ProviderLimitError | null {
  return error instanceof ProviderLimitError ? error : null;
}
