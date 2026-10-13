import type { AIProvider } from '../services/aiConnection';
// Explicit expectations checked against official documentation, not derived from the implementation.
export const chatProviders: { provider: AIProvider; model: string; endpoint: string }[] = [
  { provider: 'openai', model: 'gpt-4o-mini', endpoint: 'https://api.openai.com/v1/chat/completions' },
  { provider: 'anthropic', model: 'claude-haiku-4-5', endpoint: 'https://api.anthropic.com/v1/messages' },
  { provider: 'groq', model: 'openai/gpt-oss-20b', endpoint: 'https://api.groq.com/openai/v1/chat/completions' },
  { provider: 'openrouter', model: 'openai/gpt-4o-mini', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
  { provider: 'deepseek', model: 'deepseek-flash', endpoint: 'https://api.deepseek.com/chat/completions' },
  { provider: 'mistral', model: 'mistral-small-latest', endpoint: 'https://api.mistral.ai/v1/chat/completions' },
  { provider: 'together', model: 'Qwen/Qwen3.5-9B', endpoint: 'https://api.together.ai/v1/chat/completions' },
  { provider: 'perplexity', model: 'perplexity/sonar', endpoint: 'https://api.perplexity.ai/v1/agent' },
];
export function providerReply(provider: AIProvider, text: string) {
  if (provider === 'gemini') return { candidates: [{ content: { parts: [{ text }] } }] };
  if (provider === 'anthropic') return { content: [{ type: 'text', text }] };
  if (provider === 'perplexity') return { status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] }] };
  return { choices: [{ message: { content: text } }] };
}
