import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImagesService } from './images.service';
import { SaveImageDto } from './dto/save-image.dto';
import { SupabaseAuthGuard } from '@/guards/supabase-auth.guard';

@Controller('images')
@UseGuards(SupabaseAuthGuard)
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Get('search')
  search(
    @Query('q') q: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    if (!q?.trim()) throw new BadRequestException('Query is required');
    return this.imagesService.searchImages(q.trim(), page);
  }

  @Post('save-from-url')
  saveFromUrl(@Body() dto: SaveImageDto, @Req() req: any) {
    const userId: string = req.user.sub;
    return this.imagesService
      .saveFromUrl(dto.cardId, userId, dto.url)
      .then((imagePath) => ({ imagePath }));
  }

  @Post('upload/:cardId')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('cardId') cardId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const userId: string = req.user.sub;
    const imagePath = await this.imagesService.saveFromUpload(
      cardId,
      userId,
      file.buffer,
      file.mimetype,
    );
    return { imagePath };
  }

  @Delete(':cardId')
  remove(@Param('cardId') cardId: string) {
    return this.imagesService.removeImage(cardId).then(() => ({ ok: true }));
  }

  @Get('signed-url')
  signedUrl(@Query('path') storagePath: string) {
    if (!storagePath) throw new BadRequestException('path is required');
    return this.imagesService
      .createSignedUrl(storagePath)
      .then((url) => ({ url }));
  }
}
