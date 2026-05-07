import { ImagesService } from '@/images/images.service';
import { TtsService } from '@/tts/tts.service';
import { Database } from '@/types/database.types';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '@/supabase/supabase.service';
import * as archiver from 'archiver';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { firstValueFrom } from 'rxjs';
import { PassThrough } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import {
	CardDataDto,
	ExportAnkiDto,
	TtsSettingsDto,
} from './dto/export-anki.dto';
import { ExportDeckDto } from './dto/export-deck.dto';
import { ExportDecksArchiveDto } from './dto/export-decks-archive.dto';
import {
	CompiledTemplate,
	resolveAndCompileTemplates,
} from './utils/anki-compiler';

interface MappedCard extends CardDataDto {
  imagePath: string | null;
}

interface DeckExportResult {
  apkgPath: string;
  deckName: string;
  cleanup: () => Promise<void>;
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private readonly supabase: SupabaseClient<Database>;

  constructor(
    private readonly httpService: HttpService,
    private readonly ttsService: TtsService,
    private readonly imagesService: ImagesService,
    supabaseService: SupabaseService,
  ) {
    this.supabase = supabaseService.client;
  }

  private mapRawCard(
    c: Database['public']['Tables']['saved_cards']['Row'],
  ): MappedCard {
    return {
      word: c.word,
      partOfSpeech: c.part_of_speech,
      phonetic: c.phonetic || '',
      definition: c.definition,
      example: c.example || '',
      imagePath: c.image_path ?? null,
    };
  }

  private async buildApkgFile(
    deckName: string,
    cards: MappedCard[],
    ttsSettings: TtsSettingsDto,
    templates: CompiledTemplate[],
    tempDir: string,
  ): Promise<string> {
    const pythonPayload: any = {
      deck_name: deckName,
      deck_uuid: uuidv4(),
      templates,
      cards: [],
    };

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const ttsText = card.example?.trim() || card.word;
      let audioPath: string | null = null;
      let imagePath: string | null = null;

      try {
        const audioBase64 = await this.ttsService.generateAudio(
          ttsText,
          ttsSettings.accent,
          ttsSettings.gender,
        );
        const filename = `${card.word}_${i}.webm`.replace(/[^a-z0-9_.]/gi, '_');
        audioPath = path.join(tempDir, filename);
        await fs.writeFile(audioPath, Buffer.from(audioBase64, 'base64'));
      } catch {
        this.logger.warn(`TTS failed for card "${card.word}", skipping audio.`);
      }

      if (card.imagePath) {
        try {
          imagePath = await this.imagesService.downloadToFile(
            card.imagePath,
            tempDir,
          );
        } catch {
          this.logger.warn(
            `Image download failed for card "${card.word}", skipping image.`,
          );
        }
      }

      pythonPayload.cards.push({
        word: card.word,
        partOfSpeech: card.partOfSpeech,
        phonetic: card.phonetic,
        definition: card.definition,
        example: card.example || '',
        audio_path: audioPath,
        image_path: imagePath,
      });
    }

    const pythonServiceUrl =
      process.env.ANKI_EXPORTER_URL || 'http://127.0.0.1:8000';
    this.logger.log(`Requesting APKG generation for deck: ${deckName}`);
    const response = await firstValueFrom(
      this.httpService.post(`${pythonServiceUrl}/generate`, pythonPayload),
    );
    return response.data.file_path;
  }

  /**
   * Shared core: fetch deck + cards, compile templates, build apkg, return cleanup handle.
   * Pass userId to enforce ownership (required for background jobs).
   */
  private async buildDeckExport(
    deckId: string,
    templateIds: string[],
    ttsSettings: TtsSettingsDto,
    userId?: string,
  ): Promise<DeckExportResult> {
    let deckQuery = this.supabase.from('decks').select('name').eq('id', deckId);
    if (userId) deckQuery = deckQuery.eq('user_id', userId);
    const { data: deck, error: deckError } = await deckQuery.single();

    if (deckError || !deck) throw new Error(`Deck ${deckId} not found`);

    const { data: rawCards } = await this.supabase
      .from('saved_cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: true });

    if (!rawCards?.length) throw new Error(`Deck "${deck.name}" has no cards`);

    const cards = rawCards.map((c) => this.mapRawCard(c));
    const templates = await resolveAndCompileTemplates(
      templateIds,
      this.supabase,
    );

    const tempDir = path.join(process.cwd(), 'temp', `export-${uuidv4()}`);
    await fs.mkdir(tempDir, { recursive: true });
    const cleanup = () =>
      fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

    const apkgPath = await this.buildApkgFile(
      deck.name,
      cards,
      ttsSettings,
      templates,
      tempDir,
    );
    return { apkgPath, deckName: deck.name, cleanup };
  }

  async buildApkgForJob(
    deckId: string,
    userId: string,
    templateIds: string[],
    ttsSettings: TtsSettingsDto,
  ): Promise<DeckExportResult> {
    return this.buildDeckExport(deckId, templateIds, ttsSettings, userId);
  }

  async generateApkg(exportDto: ExportAnkiDto) {
    const tempDir = path.join(process.cwd(), 'temp', `export-${uuidv4()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      const apkgPath = await this.buildApkgFile(
        exportDto.deckName,
        exportDto.cards as MappedCard[],
        exportDto.ttsSettings,
        exportDto.templates,
        tempDir,
      );
      const fileStream = createReadStream(apkgPath);
      const cleanup = () =>
        fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      return { fileStream, cleanup };
    } catch (error) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      this.logger.error('Failed to generate APKG:', error);
      throw error;
    }
  }

  async exportDeck(dto: ExportDeckDto) {
    try {
      const { apkgPath, deckName, cleanup } = await this.buildDeckExport(
        dto.deckId,
        dto.templateIds,
        dto.ttsSettings,
      );
      return { fileStream: createReadStream(apkgPath), cleanup, deckName };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Failed to export deck');
    }
  }

  async exportDecksArchive(dto: ExportDecksArchiveDto) {
    const cleanups: Array<() => Promise<void>> = [];
    const runAllCleanups = () =>
      Promise.all(cleanups.map((fn) => fn())).then(() => {});

    try {
      const templates = await resolveAndCompileTemplates(
        dto.templateIds,
        this.supabase,
      );

      // Batch fetch all decks in one query
      const { data: decks } = await this.supabase
        .from('decks')
        .select('id, name')
        .in('id', dto.deckIds);

      const deckMap = new Map((decks ?? []).map((d) => [d.id, d.name]));

      const apkgEntries: Array<{ filePath: string; archiveName: string }> = [];

      for (const deckId of dto.deckIds) {
        const deckName = deckMap.get(deckId);
        if (!deckName) continue;

        const { data: rawCards } = await this.supabase
          .from('saved_cards')
          .select('*')
          .eq('deck_id', deckId)
          .order('created_at', { ascending: true });

        if (!rawCards?.length) continue;

        const cards = rawCards.map((c) => this.mapRawCard(c));

        const tempDir = path.join(process.cwd(), 'temp', `export-${uuidv4()}`);
        await fs.mkdir(tempDir, { recursive: true });
        cleanups.push(() =>
          fs.rm(tempDir, { recursive: true, force: true }).catch(() => {}),
        );

        const apkgPath = await this.buildApkgFile(
          deckName,
          cards,
          dto.ttsSettings,
          templates,
          tempDir,
        );
        apkgEntries.push({
          filePath: apkgPath,
          archiveName: `${deckName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.apkg`,
        });
      }

      if (apkgEntries.length === 0)
        throw new BadRequestException('No valid decks to export');

      const archive = archiver.create('zip', { zlib: { level: 6 } });
      const passThrough = new PassThrough();
      archive.pipe(passThrough);

      for (const entry of apkgEntries) {
        archive.file(entry.filePath, { name: entry.archiveName });
      }

      archive.on('end', () => {
        void runAllCleanups();
      });
      archive.on('error', (err) => {
        void runAllCleanups();
        passThrough.destroy(err);
      });
      archive.finalize();

      return { stream: passThrough };
    } catch (error) {
      await runAllCleanups();
      this.logger.error('Failed to generate decks archive:', error);
      throw error;
    }
  }
}
