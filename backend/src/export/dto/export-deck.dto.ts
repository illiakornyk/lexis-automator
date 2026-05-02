import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TtsSettingsDto } from './export-anki.dto';

export class ExportDeckDto {
  @IsString()
  deckId: string;

  @IsArray()
  @IsString({ each: true })
  templateIds: string[];

  @ValidateNested()
  @Type(() => TtsSettingsDto)
  ttsSettings: TtsSettingsDto;
}