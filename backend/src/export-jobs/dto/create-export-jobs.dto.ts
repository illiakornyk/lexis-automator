import { IsArray, IsString, ArrayNotEmpty, IsIn } from 'class-validator';

export class CreateExportJobsDto {
  @IsArray()
  @ArrayNotEmpty()
  deckIds: string[];

  @IsArray()
  templateIds: string[];

  @IsString()
  @IsIn(['US', 'GB'])
  accent: string;

  @IsString()
  @IsIn(['FEMALE', 'MALE'])
  gender: string;
}
