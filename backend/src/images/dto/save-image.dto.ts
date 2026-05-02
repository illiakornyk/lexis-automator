import { IsString, IsNotEmpty } from 'class-validator';

export class SaveImageDto {
  @IsString()
  @IsNotEmpty()
  cardId: string;

  @IsString()
  @IsNotEmpty()
  url: string;
}
