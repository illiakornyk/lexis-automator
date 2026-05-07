import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TtsSettingsDto } from './export-anki.dto';

export class ExportDeckDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Deck UUID' })
  @IsString()
  deckId: string;

  @ApiProperty({
    type: [String],
    example: ['default-recognition', 'default-production'],
    description: 'List of template IDs (built-in or custom UUID)',
  })
  @IsArray()
  @IsString({ each: true })
  templateIds: string[];

  @ApiProperty({ type: TtsSettingsDto })
  @ValidateNested()
  @Type(() => TtsSettingsDto)
  ttsSettings: TtsSettingsDto;
}
