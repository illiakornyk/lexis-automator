import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class SaveImageDto {
  @ApiProperty({ example: 'a1b2c3d4-...', description: 'ID of the card to attach the image to' })
  @IsString()
  @IsNotEmpty()
  cardId: string;

  @ApiProperty({ example: 'https://pixabay.com/photo.jpg', description: 'Public URL of the image to download' })
  @IsUrl()
  @IsNotEmpty()
  url: string;
}
