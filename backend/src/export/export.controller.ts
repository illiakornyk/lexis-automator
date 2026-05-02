import { Controller, Post, Body, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { ExportAnkiDto } from './dto/export-anki.dto';
import { ExportDeckDto } from './dto/export-deck.dto';
import { ExportDecksArchiveDto } from './dto/export-decks-archive.dto';
import { SupabaseAuthGuard } from '../guards/supabase-auth.guard';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('anki')
  @UseGuards(SupabaseAuthGuard)
  async exportAnki(
    @Body() exportDto: ExportAnkiDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { fileStream, cleanup } = await this.exportService.generateApkg(exportDto);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${exportDto.deckName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'deck'}.apkg"`,
    });
    res.on('finish', () => cleanup());
    res.on('close', () => cleanup());
    return new StreamableFile(fileStream);
  }

  @Post('deck')
  @UseGuards(SupabaseAuthGuard)
  async exportDeck(
    @Body() dto: ExportDeckDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { fileStream, cleanup, deckName } = await this.exportService.exportDeck(dto);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${deckName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.apkg"`,
    });
    res.on('finish', () => cleanup());
    res.on('close', () => cleanup());
    return new StreamableFile(fileStream);
  }

  @Post('decks/archive')
  @UseGuards(SupabaseAuthGuard)
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
