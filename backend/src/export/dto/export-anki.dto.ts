import { IsString, IsArray, ValidateNested, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { Accent, Gender } from '../../tts/dto/generate-tts.dto';

export class CardDataDto {
  @IsString()
  word: string;

  @IsString()
  partOfSpeech: string;

  @IsString()
  phonetic: string;

  @IsString()
  definition: string;

  @IsString()
  example: string;
}

export class TtsSettingsDto {
  @IsEnum(Accent)
  accent: Accent;

  @IsEnum(Gender)
  gender: Gender;
}

export class CustomTemplateDto {
  @IsString()
  name: string;

  @IsBoolean()
  is_cloze: boolean;

  @IsString()
  qfmt: string;

  @IsString()
  afmt: string;
}

export class ExportAnkiDto {
  @IsString()
  deckName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CardDataDto)
  cards: CardDataDto[];

  @ValidateNested()
  @Type(() => TtsSettingsDto)
  ttsSettings: TtsSettingsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomTemplateDto)
  templates: CustomTemplateDto[];
}
