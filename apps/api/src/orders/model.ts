import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';

// Injection token: tests replace the real model with a fake one through it
export const LLM = Symbol('LLM');

export function createModel(): LanguageModel {
  const modelId = process.env.LLM_MODEL;
  if (!modelId) {
    throw new Error('LLM_MODEL is not set. Add it to .env (e.g. openai/gpt-4.1-mini).');
  }
  const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
  // require_parameters: only route to providers that support structured output
  return openrouter.chat(modelId, { provider: { require_parameters: true } });
}