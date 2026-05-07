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
import { ExportDeckDto } from './dto/export-deck.dto';
import { ExportDecksArchiveDto } from './dto/export-decks-archive.dto';
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

  @Post('deck')
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: 'Export a saved deck by ID as an APKG file' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Returns an .apkg file stream' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Deck not found or has no cards' })
  async exportDeck(
    @Body() dto: ExportDeckDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { fileStream, cleanup, deckName } =
      await this.exportService.exportDeck(dto);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${toSafeFilename(deckName)}.apkg"`,
    });
    res.on('close', onceCleanup(cleanup));
    return new StreamableFile(fileStream);
  }

  @Post('decks/archive')
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({
    summary: 'Export multiple decks as a ZIP archive of APKG files',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns a .zip stream containing one .apkg per deck',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No valid decks found for the given IDs',
  })
  async exportDecksArchive(
    @Body() dto: ExportDecksArchiveDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream } = await this.exportService.exportDecksArchive(dto);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="lexis_decks.zip"',
    });
    return new StreamableFile(stream);
  }
}
