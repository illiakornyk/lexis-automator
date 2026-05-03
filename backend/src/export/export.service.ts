import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ExportAnkiDto, CardDataDto, TtsSettingsDto } from './dto/export-anki.dto';
import { ExportDeckDto } from './dto/export-deck.dto';
import { ExportDecksArchiveDto } from './dto/export-decks-archive.dto';
import { CompiledTemplate, resolveAndCompileTemplates } from './utils/anki-compiler';
import { TtsService } from '../tts/tts.service';
import { ImagesService } from '../images/images.service';
import { Accent, Gender } from '../tts/dto/generate-tts.dto';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import { PassThrough } from 'stream';
import * as archiver from 'archiver';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly httpService: HttpService,
    private readonly ttsService: TtsService,
    private readonly imagesService: ImagesService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  private async buildApkgFile(
    deckName: string,
    cards: (CardDataDto & { imagePath?: string | null })[],
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
          ttsSettings.accent as Accent,
          ttsSettings.gender as Gender,
        );
        const filename = `${card.word}_${i}.webm`.replace(/[^a-z0-9_.]/gi, '_');
        audioPath = path.join(tempDir, filename);
        await fs.writeFile(audioPath, Buffer.from(audioBase64, 'base64'));
      } catch {
        this.logger.warn(`TTS failed for card "${card.word}", skipping audio.`);
      }

      if (card.imagePath) {
        try {
          imagePath = await this.imagesService.downloadToFile(card.imagePath, tempDir);
        } catch {
          this.logger.warn(`Image download failed for card "${card.word}", skipping image.`);
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

    const pythonServiceUrl = process.env.ANKI_EXPORTER_URL || 'http://127.0.0.1:8000';
    this.logger.log(`Requesting APKG generation for deck: ${deckName}`);
    const response = await firstValueFrom(
      this.httpService.post(`${pythonServiceUrl}/generate`, pythonPayload),
    );
    return response.data.file_path;
  }

  async buildApkgForJob(
    deckId: string,
    userId: string,
    templateIds: string[],
    ttsSettings: TtsSettingsDto,
  ): Promise<{ apkgPath: string; deckName: string; cleanup: () => Promise<void> }> {
    const { data: deck } = await this.supabase
      .from('decks')
      .select('name')
      .eq('id', deckId)
      .eq('user_id', userId)
      .single();

    if (!deck) throw new Error(`Deck ${deckId} not found`);

    const { data: rawCards } = await this.supabase
      .from('saved_cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: true });

    if (!rawCards || rawCards.length === 0)
      throw new Error(`Deck "${deck.name}" has no cards`);

    const cards = rawCards.map((c) => ({
      word: c.word,
      partOfSpeech: c.part_of_speech,
      phonetic: c.phonetic || '',
      definition: c.definition,
      example: c.example || '',
      imagePath: c.image_path ?? null,
    }));

    const templates = await resolveAndCompileTemplates(templateIds, this.supabase);

    const tempDir = path.join(process.cwd(), 'temp', `job-${uuidv4()}`);
    await fs.mkdir(tempDir, { recursive: true });
    const cleanup = () => fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

    const apkgPath = await this.buildApkgFile(deck.name, cards, ttsSettings, templates, tempDir);
    return { apkgPath, deckName: deck.name, cleanup };
  }

  async generateApkg(exportDto: ExportAnkiDto) {
    const tempDir = path.join(process.cwd(), 'temp', `export-${uuidv4()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      const apkgPath = await this.buildApkgFile(
        exportDto.deckName,
        exportDto.cards,
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
    const { data: deck, error: deckError } = await this.supabase
      .from('decks')
      .select('name')
      .eq('id', dto.deckId)
      .single();

    if (deckError || !deck) throw new BadRequestException('Deck not found');

    const { data: rawCards, error: cardsError } = await this.supabase
      .from('saved_cards')
      .select('*')
      .eq('deck_id', dto.deckId)
      .order('created_at', { ascending: true });

    if (cardsError) throw new BadRequestException('Failed to fetch cards');
    if (!rawCards || rawCards.length === 0)
      throw new BadRequestException('Deck has no cards');

    const cards = rawCards.map((c) => ({
      word: c.word,
      partOfSpeech: c.part_of_speech,
      phonetic: c.phonetic || '',
      definition: c.definition,
      example: c.example || '',
      imagePath: c.image_path ?? null,
    }));

    const templates = await resolveAndCompileTemplates(dto.templateIds, this.supabase);

    const tempDir = path.join(process.cwd(), 'temp', `export-${uuidv4()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      const apkgPath = await this.buildApkgFile(
        deck.name,
        cards,
        dto.ttsSettings,
        templates,
        tempDir,
      );
      const fileStream = createReadStream(apkgPath);
      const cleanup = () =>
        fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      return { fileStream, cleanup, deckName: deck.name };
    } catch (error) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      this.logger.error(`Failed to build APKG for deck "${dto.deckId}":`, error);
      throw error;
    }
  }

  async exportDecksArchive(dto: ExportDecksArchiveDto) {
    const tempDirs: string[] = [];
    const cleanup = () =>
      Promise.all(
        tempDirs.map((d) => fs.rm(d, { recursive: true, force: true }).catch(() => {})),
      );

    try {
      const templates = await resolveAndCompileTemplates(dto.templateIds, this.supabase);
      const apkgEntries: Array<{ filePath: string; archiveName: string }> = [];

      for (const deckId of dto.deckIds) {
        const { data: deck } = await this.supabase
          .from('decks')
          .select('name')
          .eq('id', deckId)
          .single();
        if (!deck) continue;

        const { data: rawCards } = await this.supabase
          .from('saved_cards')
          .select('*')
          .eq('deck_id', deckId)
          .order('created_at', { ascending: true });
        if (!rawCards || rawCards.length === 0) continue;

        const cards = rawCards.map((c) => ({
          word: c.word,
          partOfSpeech: c.part_of_speech,
          phonetic: c.phonetic || '',
          definition: c.definition,
          example: c.example || '',
          imagePath: c.image_path ?? null,
        }));

        const tempDir = path.join(process.cwd(), 'temp', `export-${uuidv4()}`);
        await fs.mkdir(tempDir, { recursive: true });
        tempDirs.push(tempDir);

        const apkgPath = await this.buildApkgFile(
          deck.name,
          cards,
          dto.ttsSettings,
          templates,
          tempDir,
        );
        apkgEntries.push({
          filePath: apkgPath,
          archiveName: `${deck.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.apkg`,
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

      archive.on('end', () => { void cleanup(); });
      archive.on('error', (err) => {
        void cleanup();
        passThrough.destroy(err);
      });
      archive.finalize();

      return { stream: passThrough };
    } catch (error) {
      await cleanup();
      this.logger.error('Failed to generate decks archive:', error);
      throw error;
    }
  }
}