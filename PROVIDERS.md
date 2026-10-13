# AI provider endpoint references

Defaults checked against official provider documentation on 2026-10-12. The app keeps these destinations in `services/providerCatalog.ts`; the authenticated API route selects from that fixed list and does not accept a client URL.

| Provider | Endpoint and default model | Official reference |
| --- | --- | --- |
| Google Gemini | Live: `gemini-3.8-live`; text: `gemini-3.8-flash` via Gemini API | [Models](https://ai.google.dev/gemini-api/docs/models) |
| OpenAI | `https://api.openai.com/v1/chat/completions`, `gpt-4o-mini` | [GPT-4o mini](https://developers.openai.com/api/docs/models/gpt-4o-mini) |
| Anthropic | `https://api.anthropic.com/v1/messages`, `claude-haiku-4-5` | [Messages](https://platform.claude.com/docs/en/api/messages/create) |
| Groq | `https://api.groq.com/openai/v1/chat/completions`, `openai/gpt-oss-20b` | [API reference](https://console.groq.com/docs/api-reference), [models](https://console.groq.com/docs/models) |
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions`, `openai/gpt-4o-mini` | [Quickstart](https://openrouter.ai/docs/quickstart), [model](https://openrouter.ai/openai/gpt-4o-mini) |
| DeepSeek | `https://api.deepseek.com/chat/completions`, `deepseek-flash` | [Chat completions](https://api-docs.deepseek.com/api/create-chat-completion/) |
| Mistral | `https://api.mistral.ai/v1/chat/completions`, `mistral-small-latest` | [Chat API](https://docs.mistral.ai/api) |
| Together AI | `https://api.together.ai/v1/chat/completions`, `Qwen/Qwen3.5-9B` | [Chat API](https://docs.together.ai/reference/chat-completions), [serverless models](https://docs.together.ai/docs/serverless/models) |
| Perplexity | `https://api.perplexity.ai/v1/agent`, `perplexity/sonar` | [Agent API](https://docs.perplexity.ai/docs/agent-api/quickstart), [model list](https://docs.perplexity.ai/docs/agent-api/models), [Sonar migration](https://docs.perplexity.ai/docs/agent-api/migrate-from-sonar/overview) |

Perplexity's older Sonar Chat Completions support ended in September 2026. New Perplexity connections use the Agent API. Existing custom endpoint settings remain unchanged. Browser-local calls can fail if a provider does not allow browser cross-origin requests; the authenticated route can use these supported fixed endpoints. A real provider key and account credit are needed to verify live access. Mocked tests cover request construction, response parsing, and failure handling without billing any provider.

Groq teaching choices were checked against the [official model list](https://console.groq.com/docs/models) and [deprecation notices](https://console.groq.com/docs/deprecations) on 2026-10-12: `openai/gpt-oss-20b` and `openai/gpt-oss-120b` are production chat models; `qwen/qwen3.8-27b` is a preview chat model; `llama-3.1-8b-instant` and `llama-3.3-70b-versatile` require Enterprise access after public-tier deprecation. Their exact IDs are the Groq teaching allowlist in `services/providerCatalog.ts`, enforced again by `/api/ai`. Audio transcription, speech, and safety classifiers are excluded. Model availability, account permissions, rate limits, and billing are controlled by Groq; selecting another model does not guarantee recovery from a service or account error.

Connection testing now sends one short text request to the selected teaching model (Gemini uses its text model). It does not test the separate Gemini Live audio channel. Groq's [Chat API reference](https://console.groq.com/docs/api-reference) recommends `max_completion_tokens`; its 500 response cannot be attributed to an incorrect model ID from the available evidence. The app reports a safe upstream error type and request ID where present, without relaying upstream messages that may contain keys or learner prompts. No provider was verified live without a learner key.
