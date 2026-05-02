import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TtsSettingsDto } from './export-anki.dto';

export class ExportDecksArchiveDto {
  @IsArray()
  @IsString({ each: true })
  deckIds: string[];

  @IsArray()
  @IsString({ each: true })
  templateIds: string[];

  @ValidateNested()
  @Type(() => TtsSettingsDto)
  ttsSettings: TtsSettingsDto;
}