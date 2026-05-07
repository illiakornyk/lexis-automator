import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { LlmProvider } from '@/ai/ai.types';

export class GenerateExampleDto {
  @ApiProperty({ example: 'ephemeral', description: 'The word to generate an example for' })
  @IsString()
  @IsNotEmpty()
  word: string;

  @ApiProperty({
    example: 'Lasting for a very short time.',
    description: 'The exact definition or sense of the word to contextualize the example',
  })
  @IsString()
  @IsNotEmpty()
  definition: string;

  @ApiPropertyOptional({
    example: 'sk-...',
    description: 'Your own API key — uses the server default when omitted',
  })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({
    enum: LlmProvider,
    example: LlmProvider.OPENAI,
    description: 'Provider for the supplied apiKey. Defaults to openai when apiKey is set.',
  })
  @IsOptional()
  @IsEnum(LlmProvider)
  provider?: LlmProvider;
}
