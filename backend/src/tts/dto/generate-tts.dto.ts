import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum Accent {
  US = 'US',
  GB = 'GB',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export class GenerateTtsDto {
  @ApiProperty({ description: 'The text to convert to speech', example: 'Hello world' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ enum: Accent, default: Accent.US, required: false })
  @IsOptional()
  @IsEnum(Accent)
  accent?: Accent;

  @ApiProperty({ enum: Gender, default: Gender.FEMALE, required: false })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}
