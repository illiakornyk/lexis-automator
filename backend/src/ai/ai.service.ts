import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.getOrThrow<string>('OPENROUTER_API_KEY'),
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Lexis Automator',
      },
    });

    this.model =
      this.configService.get<string>('OPENROUTER_MODEL') ||
      'openai/gpt-4o-mini';
  }

  async generateExample(word: string, definition: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are an English teacher generating example sentences for a dictionary app. ' +
              'Given a word and its specific definition, create a single, clear, and natural example sentence ' +
              "demonstrating the word's usage in that exact sense. " +
              'Return ONLY the sentence, without any quotes, explanations, or introductory text. ' +
              'The sentence MUST contain the requested word or a form of it.',
          },
          {
            role: 'user',
            content: `Word: ${word}\nDefinition: ${definition}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 60,
      });

      const result = response.choices[0]?.message?.content?.trim() || '';

      if (!result) {
        this.logger.error(
          'Empty response from LLM. Raw response: ' + JSON.stringify(response),
        );
        throw new InternalServerErrorException('Empty response from LLM');
      }

      return result;
    } catch (error) {
      this.logger.error('AI generation failed', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Failed to generate example sentence: ${errorMessage}`,
      );
    }
  }
}
