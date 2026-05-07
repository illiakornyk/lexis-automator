export enum LlmProvider {
  OPENROUTER = 'openrouter',
  OPENAI = 'openai',
  GEMINI = 'gemini',
  ANTHROPIC = 'anthropic',
}

export const DEFAULT_MODELS: Record<LlmProvider, string> = {
  [LlmProvider.OPENROUTER]: 'openai/gpt-4o-mini',
  [LlmProvider.OPENAI]: 'gpt-4o-mini',
  [LlmProvider.GEMINI]: 'gemini-2.0-flash',
  [LlmProvider.ANTHROPIC]: 'claude-haiku-4-5-20251001',
};

export type GenerateExampleFn = (word: string, definition: string) => Promise<string>;
