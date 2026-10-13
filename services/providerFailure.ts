import { providerError } from './providerProtocol';
import { ProviderLimitError, providerLimit } from './providerLimits';
import type { AIConnection } from './aiConnection';

/** Map known provider limits to learner guidance without exposing provider payloads. */
export function providerFailure(error: unknown, fallback: string, connection?: AIConnection): string {
  if (error instanceof ProviderLimitError) return error.message;
  const value = error as { status?: number; code?: number | string; message?: string; error?: { message?: string } } | null;
  const status = Number(value?.status ?? value?.code);
  const message = String(value?.message ?? value?.error?.message ?? '');
  if (connection) {
    const retry = (value as any)?.retryAfter ?? (value as any)?.headers?.get?.('retry-after') ?? null;
    const mapped = providerLimit(connection,status,message,retry);
    if (mapped) return mapped.message;
  }
  if (status === 402 || /billing|payment required|insufficient (?:credit|balance)/i.test(message)) return providerError(402);
  if (status === 429 || /quota|rate.?limit|resource.exhausted|too many requests/i.test(message)) return providerError(429);
  return message || fallback;
}
