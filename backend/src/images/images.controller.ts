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
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { ImagesService } from './images.service';
import { SaveImageDto } from './dto/save-image.dto';
import { SupabaseAuthGuard } from '@/guards/supabase-auth.guard';
import type { AuthenticatedRequest } from '@/types/authenticated-request.type';

@ApiTags('images')
@ApiBearerAuth()
@Controller('images')
@UseGuards(SupabaseAuthGuard)
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search images on Pixabay' })
  @ApiQuery({ name: 'q', description: 'Search query', example: 'cat' })
  @ApiQuery({
    name: 'page',
    description: 'Page number',
    required: false,
    example: 1,
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Image search results.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Query is required.',
  })
  search(
    @Query('q') q: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    if (!q?.trim()) throw new BadRequestException('Query is required');
    return this.imagesService.searchImages(q.trim(), page);
  }

  @Post('save-from-url')
  @ApiOperation({ summary: 'Download and store an image from a URL' })
  @ApiBody({ type: SaveImageDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Image saved successfully.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Failed to download image.',
  })
  saveFromUrl(@Body() dto: SaveImageDto, @Req() req: AuthenticatedRequest) {
    return this.imagesService
      .saveFromUrl(dto.cardId, req.user.sub, dto.url)
      .then((imagePath) => ({ imagePath }));
  }

  @Post('upload/:cardId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an image file for a card' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'cardId', description: 'The card to attach the image to' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Image uploaded successfully.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No file uploaded.',
  })
  async upload(
    @Param('cardId') cardId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const imagePath = await this.imagesService.saveFromUpload(
      cardId,
      req.user.sub,
      file.buffer,
    );
    return { imagePath };
  }

  @Delete(':cardId')
  @ApiOperation({ summary: 'Remove the image attached to a card' })
  @ApiParam({
    name: 'cardId',
    description: 'The card whose image should be removed',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Image removed successfully.',
  })
  remove(@Param('cardId') cardId: string) {
    return this.imagesService.removeImage(cardId).then(() => ({ ok: true }));
  }

  @Get('signed-url')
  @ApiOperation({ summary: 'Generate a signed URL for a stored image' })
  @ApiQuery({
    name: 'path',
    description: 'Storage path of the image',
    example: 'user-id/card-id.jpg',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Signed URL generated.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'path is required.',
  })
  signedUrl(@Query('path') storagePath: string) {
    if (!storagePath) throw new BadRequestException('path is required');
    return this.imagesService
      .createSignedUrl(storagePath)
      .then((url) => ({ url }));
  }
}
