import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { LlmProvider, GenerateExampleFn } from './ai.types';
import { EXAMPLE_SYSTEM_PROMPT } from './ai.prompts';

const OPENAI_COMPATIBLE_BASE_URLS: Partial<Record<LlmProvider, string>> = {
  [LlmProvider.OPENROUTER]: 'https://openrouter.ai/api/v1',
  [LlmProvider.GEMINI]:
    'https://generativelanguage.googleapis.com/v1beta/openai/',
};

function openaiAdapter(client: OpenAI, model: string): GenerateExampleFn {
  return async (word, definition) => {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: EXAMPLE_SYSTEM_PROMPT },
        { role: 'user', content: `Word: ${word}\nDefinition: ${definition}` },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });
    return response.choices[0]?.message?.content?.trim() ?? '';
  };
}

function anthropicAdapter(client: Anthropic, model: string): GenerateExampleFn {
  return async (word, definition) => {
    const response = await client.messages.create({
      model,
      max_tokens: 300,
      system: EXAMPLE_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `Word: ${word}\nDefinition: ${definition}` },
      ],
    });
    const block = response.content[0];
    return block?.type === 'text' ? block.text.trim() : '';
  };
}

export function createAdapter(
  provider: LlmProvider,
  apiKey: string,
  model: string,
  appUrl?: string,
): GenerateExampleFn {
  if (provider === LlmProvider.ANTHROPIC) {
    return anthropicAdapter(new Anthropic({ apiKey }), model);
  }

  const baseURL = OPENAI_COMPATIBLE_BASE_URLS[provider];
  const defaultHeaders =
    provider === LlmProvider.OPENROUTER
      ? {
          'HTTP-Referer': appUrl ?? 'http://localhost:3000',
          'X-Title': 'Lexis Automator',
        }
      : undefined;

  return openaiAdapter(new OpenAI({ apiKey, baseURL, defaultHeaders }), model);
}
