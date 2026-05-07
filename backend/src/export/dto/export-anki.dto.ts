import { IsString, IsArray, ValidateNested, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Accent, Gender } from '../../tts/dto/generate-tts.dto';

export class CardDataDto {
  @ApiProperty({ example: 'ephemeral' })
  @IsString()
  word: string;

  @ApiProperty({ example: 'adjective' })
  @IsString()
  partOfSpeech: string;

  @ApiProperty({ example: '/ɪˈfem.ər.əl/' })
  @IsString()
  phonetic: string;

  @ApiProperty({ example: 'Lasting for a very short time.' })
  @IsString()
  definition: string;

  @ApiProperty({ example: 'Fame is ephemeral.' })
  @IsString()
  example: string;
}

export class TtsSettingsDto {
  @ApiProperty({ enum: Accent, example: Accent.US })
  @IsEnum(Accent)
  accent: Accent;

  @ApiProperty({ enum: Gender, example: Gender.FEMALE })
  @IsEnum(Gender)
  gender: Gender;
}

export class CustomTemplateDto {
  @ApiProperty({ example: 'Recognition' })
  @IsString()
  name: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  is_cloze: boolean;

  @ApiProperty({ example: '{{Word}}' })
  @IsString()
  qfmt: string;

  @ApiProperty({ example: '{{Word}}<br>{{Definition}}' })
  @IsString()
  afmt: string;
}

export class ExportAnkiDto {
  @ApiProperty({ example: 'My Vocabulary Deck' })
  @IsString()
  deckName: string;

  @ApiProperty({ type: [CardDataDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CardDataDto)
  cards: CardDataDto[];

  @ApiProperty({ type: TtsSettingsDto })
  @ValidateNested()
  @Type(() => TtsSettingsDto)
  ttsSettings: TtsSettingsDto;

  @ApiProperty({ type: [CustomTemplateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomTemplateDto)
  templates: CustomTemplateDto[];
}
