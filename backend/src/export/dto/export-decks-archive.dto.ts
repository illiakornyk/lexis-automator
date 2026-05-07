import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TtsSettingsDto } from './export-anki.dto';

export class ExportDecksArchiveDto {
  @ApiProperty({
    type: [String],
    example: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
    description: 'List of deck UUIDs to include in the archive',
  })
  @IsArray()
  @IsString({ each: true })
  deckIds: string[];

  @ApiProperty({
    type: [String],
    example: ['default-recognition', 'default-production'],
    description: 'List of template IDs applied to all decks',
  })
  @IsArray()
  @IsString({ each: true })
  templateIds: string[];

  @ApiProperty({ type: TtsSettingsDto })
  @ValidateNested()
  @Type(() => TtsSettingsDto)
  ttsSettings: TtsSettingsDto;
}
