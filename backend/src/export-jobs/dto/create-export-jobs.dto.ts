import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, ArrayNotEmpty } from 'class-validator';
import { Accent, Gender } from '@/tts/dto/generate-tts.dto';

export class CreateExportJobsDto {
  @ApiProperty({
    type: [String],
    example: ['uuid-1', 'uuid-2'],
    description: 'IDs of the decks to export',
  })
  @IsArray()
  @ArrayNotEmpty()
  deckIds: string[];

  @ApiProperty({
    type: [String],
    example: ['template-uuid-1'],
    description: 'IDs of the card templates to use',
  })
  @IsArray()
  templateIds: string[];

  @ApiProperty({ enum: Accent, example: Accent.US, description: 'TTS accent' })
  @IsEnum(Accent)
  accent: Accent;

  @ApiProperty({ enum: Gender, example: Gender.FEMALE, description: 'TTS voice gender' })
  @IsEnum(Gender)
  gender: Gender;
}
