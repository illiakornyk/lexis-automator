import {
  Controller,
  Post,
  Body,
  Res,
  StreamableFile,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ExportService } from './export.service';
import { ExportAnkiDto } from './dto/export-anki.dto';
import { SupabaseAuthGuard } from '@/guards/supabase-auth.guard';

function toSafeFilename(name: string, fallback = 'deck'): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || fallback;
}

function onceCleanup(cleanup: () => Promise<void>): () => void {
  let called = false;
  return () => {
    if (!called) {
      called = true;
      void cleanup();
    }
  };
}

@ApiTags('export')
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('anki')
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: 'Generate an APKG file from raw card data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Returns an .apkg file stream' })
  async exportAnki(
    @Body() exportDto: ExportAnkiDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { fileStream, cleanup } =
      await this.exportService.generateApkg(exportDto);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${toSafeFilename(exportDto.deckName)}.apkg"`,
    });
    res.on('close', onceCleanup(cleanup));
    return new StreamableFile(fileStream);
  }
}
