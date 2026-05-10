import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '@/supabase/supabase.service';
import { Database } from '@/types/database.types';
import { LlmProvider, DEFAULT_MODELS, GenerateExampleFn } from './ai.types';
import { createAdapter } from './ai.providers';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly serverAdapter: GenerateExampleFn;
  private readonly supabase: SupabaseClient<Database>;

  constructor(configService: ConfigService, supabaseService: SupabaseService) {
    const provider = configService.getOrThrow<LlmProvider>('LLM_PROVIDER');
    const apiKey = configService.getOrThrow<string>('LLM_API_KEY');
    const model =
      configService.get<string>('LLM_MODEL') ?? DEFAULT_MODELS[provider];
    const appUrl = configService.get<string>('APP_URL');
    this.serverAdapter = createAdapter(provider, apiKey, model, appUrl);
    this.supabase = supabaseService.client;
  }

  private async getUserAdapter(userId: string): Promise<GenerateExampleFn | null> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('ai_key_id, ai_provider')
      .eq('id', userId)
      .single();

    if (!profile?.ai_key_id) return null;

    const { data: decrypted, error } = await this.supabase
      .rpc('get_user_ai_key', { p_user_id: userId });

    if (error || !decrypted) return null;

    const provider = (profile.ai_provider as LlmProvider) ?? LlmProvider.OPENAI;
    return createAdapter(provider, decrypted, DEFAULT_MODELS[provider]);
  }

  async generateExample(
    word: string,
    definition: string,
    userId?: string,
  ): Promise<string> {
    let adapter = this.serverAdapter;

    if (userId) {
      const userAdapter = await this.getUserAdapter(userId);
      if (userAdapter) adapter = userAdapter;
    }

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
