import type { AIProvider } from './providerCatalog.js';
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export function chatPayload(provider: AIProvider, model: string, messages: ChatMessage[], maxTokens: number): Record<string, unknown> {
  const system = messages.filter(message => message.role === 'system').map(message => message.content).join('\n');
  const turns = messages.filter(message => message.role !== 'system');
  if (provider === 'anthropic') return { model, max_tokens: maxTokens, ...(system ? { system } : {}), messages: turns };
  if (provider === 'perplexity') return { model, ...(system ? { instructions: system } : {}), input: turns, max_output_tokens: maxTokens, stream: false, store: false };
  return {
    model, messages, stream: false,
    // Keep arbitrary custom endpoints' existing wire contract unchanged.
    ...(provider === 'custom' ? {} : provider === 'groq' || provider === 'openai' ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }),
    ...(provider === 'deepseek' && model === 'deepseek-flash' ? { thinking: { type: 'disabled' } } : {}),
  };
}
export function chatHeaders(provider: AIProvider, key: string, browser = false): Record<string, string> {
  return provider === 'anthropic'
    ? { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', ...(browser ? { 'anthropic-dangerous-direct-browser-access': 'true' } : {}) }
    : { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
}
function textParts(parts: unknown, type: string): string {
  return Array.isArray(parts) ? parts.filter(part => part?.type === type && typeof part.text === 'string').map(part => part.text).join('\n') : '';
}
export function chatText(provider: AIProvider, data: any): string {
  // Some providers send API errors in a successful HTTP response.
  if (data?.error || data?.status === 'failed') return '';
  if (provider === 'anthropic') return textParts(data?.content, 'text');
  if (provider === 'perplexity') return Array.isArray(data?.output)
    ? data.output.filter((item: any) => item?.type === 'message' && item.role === 'assistant').map((item: any) => textParts(item.content, 'output_text')).join('\n') : '';
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : textParts(content, 'text');
}
// Never echo upstream error bodies: they can contain keys, prompts, or URLs.
export function providerError(status: number, provider?: AIProvider, model?: string): string {
  if (provider === 'groq') {
    const selected = `Groq model ${model || 'selected'}`;
    if (status === 401) return `${selected}: Groq rejected the API key. Check the key in your Groq account.`;
    if (status === 403) return `${selected}: Groq denied model access. Check your account's model permissions and plan.`;
    if (status === 402) return `${selected}: API credits or billing are required. Check your Groq billing account.`;
    if (status === 404 || status === 410) return `${selected} is unavailable to this account or no longer offered. Choose and test another listed model deliberately.`;
    if (status === 400 || status === 422) return `${selected}: Groq rejected this request. Check model access and request compatibility; another model is not guaranteed to resolve it.`;
    if (status === 498) return `${selected}: Groq reports that its service tier is at capacity. Wait and test again when you choose.`;
    if (status >= 500) return `${selected}: Groq returned HTTP ${status}; its service may be temporarily unavailable. Try again later, or deliberately test another model. No request was resent.`;
  }
  const name = provider === 'custom' ? 'Custom provider' : provider || 'AI provider';
  if (status === 401) return `${name} rejected the API key. Check that it is valid for this API.`;
  if (status === 403) return `${name} denied access. Check the key's permissions and access to ${model || 'this model'}.`;
  if (status === 402) return 'This provider needs API credits. Check your API billing balance; a chat subscription may not include API usage.';
  if (status === 429) return 'Provider rate limit or quota reached. Check API credits and usage limits, then try again later.';
  if ([400, 404, 410, 422].includes(status)) return 'The provider could not use this model or request. Check model availability and account access. For a saved custom connection, check its model ID and endpoint; for a supported provider, update the app if its default has retired.';
  if (status >= 500) return `${name} returned HTTP ${status}. Its service may be temporarily unavailable; the request was not resent.`;
  return `The provider returned HTTP ${status}. Check its availability and account access.`;
}
