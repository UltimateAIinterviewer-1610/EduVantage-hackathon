// Only structured identifiers are passed through. Provider messages may echo keys or prompts.
const safeType = (value: unknown): string | null => typeof value === 'string' && /^(?!sk[-_])[a-z][a-z0-9_.-]{1,63}$/i.test(value) ? value : null;
const safeRequestId = (value: unknown): string | null => typeof value === 'string' && /^(?:req|request|resp|chatcmpl)[-_][a-z0-9_-]{6,96}$/i.test(value) ? value : null;

export function providerDiagnostics(body: unknown, headers?: Pick<Headers, 'get'>): { type: string | null; requestId: string | null } {
  const value = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const error = value.error && typeof value.error === 'object' ? value.error as Record<string, unknown> : {};
  return {
    type: safeType(error.type) || safeType(error.code) || safeType(value.type),
    requestId: safeRequestId(headers?.get('x-request-id')) || safeRequestId(headers?.get('request-id')) || safeRequestId(error.request_id),
  };
}

export function diagnosticSuffix(diagnostic: { type: string | null; requestId: string | null }): string {
  return `${diagnostic.type ? ` Error type: ${diagnostic.type}.` : ''}${diagnostic.requestId ? ` Request ID: ${diagnostic.requestId}.` : ''}`;
}
