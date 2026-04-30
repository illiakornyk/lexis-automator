import { Controller, Post, Body, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { ExportAnkiDto } from './dto/export-anki.dto';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('anki')
  async exportAnki(
    @Body() exportDto: ExportAnkiDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { fileStream, cleanup } = await this.exportService.generateApkg(exportDto);

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${exportDto.deckName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'deck'}.apkg"`,
    });

    // When the stream finishes sending or is closed prematurely, run cleanup
    res.on('finish', () => cleanup());
    res.on('close', () => cleanup());

    return new StreamableFile(fileStream);
  }
}
