import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateExampleDto {
  @ApiProperty({
    example: 'ephemeral',
    description: 'The word to generate an example for',
  })
  @IsString()
  @IsNotEmpty()
  word: string;

  @ApiProperty({
    example: 'Lasting for a very short time.',
    description:
      'The exact definition or sense of the word to contextualize the example',
  })
  @IsString()
  @IsNotEmpty()
  definition: string;
}
