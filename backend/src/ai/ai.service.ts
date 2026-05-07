import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmProvider, DEFAULT_MODELS, GenerateExampleFn } from './ai.types';
import { createAdapter } from './ai.providers';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly adapter: GenerateExampleFn;

  constructor(configService: ConfigService) {
    const provider = configService.getOrThrow<LlmProvider>('LLM_PROVIDER');
    const apiKey = configService.getOrThrow<string>('LLM_API_KEY');
    const model = configService.get<string>('LLM_MODEL') ?? DEFAULT_MODELS[provider];
    this.adapter = createAdapter(provider, apiKey, model);
  }

  async generateExample(
    word: string,
    definition: string,
    apiKey?: string,
    provider?: LlmProvider,
  ): Promise<string> {
    const resolvedProvider = provider ?? LlmProvider.OPENAI;
    const adapter = apiKey
      ? createAdapter(resolvedProvider, apiKey, DEFAULT_MODELS[resolvedProvider])
      : this.adapter;

    try {
      const result = await adapter(word, definition);

      if (!result) {
        this.logger.error(`Empty LLM response for word "${word}"`);
        throw new InternalServerErrorException('Empty response from LLM');
      }

      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('AI generation failed', error);
      throw new InternalServerErrorException(
        `Failed to generate example sentence: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
