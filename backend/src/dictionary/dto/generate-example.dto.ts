import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GenerateExampleDto {
  @ApiProperty({
    example: 'hello',
    description: 'The word to generate an example for',
  })
  @IsString()
  @IsNotEmpty()
  word: string;

  @ApiProperty({
    example: 'Used as a greeting when meeting someone.',
    description:
      'The exact definition or sense of the word to contextualize the example',
  })
  @IsString()
  @IsNotEmpty()
  definition: string;

  @ApiProperty({
    example: 'sk-...',
    description: 'Optional OpenAI API key to use instead of the server default',
    required: false,
  })
  @IsOptional()
  @IsString()
  apiKey?: string;
}
