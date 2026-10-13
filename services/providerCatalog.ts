// Fixed destinations shared by the browser and authenticated API. Never derive a
// server destination from saved settings or request URLs. Sources: PROVIDERS.md.
export const LIVE_MODEL = 'gemini-3.8-live';
export const TEXT_MODEL = 'gemini-3.8-flash';
// Groq's general chat models checked against https://console.groq.com/docs/models
// and https://console.groq.com/docs/deprecations on 2026-10-12.
export const GROQ_TEACHING_MODELS = [
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B · production' },
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B · production' },
  { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B · preview' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B · Enterprise access' },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B · Enterprise access' },
] as const;
export const isGroqTeachingModel = (model: string): boolean => GROQ_TEACHING_MODELS.some(item => item.id === model);
export const PROVIDERS = {
  gemini: { label: 'Google Gemini Live', model: LIVE_MODEL, endpoint: 'https://generativelanguage.googleapis.com/v1beta' },
  openai: { label: 'OpenAI', model: 'gpt-4o-mini', endpoint: 'https://api.openai.com/v1/chat/completions' },
  anthropic: { label: 'Anthropic Claude', model: 'claude-haiku-4-5', endpoint: 'https://api.anthropic.com/v1/messages' },
  groq: { label: 'Groq', model: 'openai/gpt-oss-20b', endpoint: 'https://api.groq.com/openai/v1/chat/completions' },
  openrouter: { label: 'OpenRouter', model: 'openai/gpt-4o-mini', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
  deepseek: { label: 'DeepSeek', model: 'deepseek-flash', endpoint: 'https://api.deepseek.com/chat/completions' },
  mistral: { label: 'Mistral', model: 'mistral-small-latest', endpoint: 'https://api.mistral.ai/v1/chat/completions' },
  together: { label: 'Together AI', model: 'Qwen/Qwen3.5-9B', endpoint: 'https://api.together.ai/v1/chat/completions' },
  perplexity: { label: 'Perplexity', model: 'perplexity/sonar', endpoint: 'https://api.perplexity.ai/v1/agent' },
} as const;
export type SupportedProvider = keyof typeof PROVIDERS;
export type AIProvider = SupportedProvider | 'custom';
export const MORE_PROVIDERS: SupportedProvider[] = ['groq', 'openrouter', 'deepseek', 'mistral', 'together', 'perplexity'];
export function isSupportedProvider(value: unknown): value is SupportedProvider {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PROVIDERS, value);
}
export function defaultModel(provider: AIProvider): string { return provider === 'custom' ? '' : PROVIDERS[provider].model; }
export function providerLabel(provider: AIProvider): string { return provider === 'custom' ? 'Other/custom provider' : PROVIDERS[provider].label; }
