import { ApiProperty } from '@nestjs/swagger';

export class GenerateExampleDto {
  @ApiProperty({
    example: 'hello',
    description: 'The word to generate an example for',
  })
  word: string;

  @ApiProperty({
    example: 'Used as a greeting when meeting someone.',
    description:
      'The exact definition or sense of the word to contextualize the example',
  })
  definition: string;

  @ApiProperty({
    example: 'sk-...',
    description: 'Optional OpenAI API key to use instead of the server default',
    required: false,
  })
  apiKey?: string;
}
