import { ImagesService } from '@/images/images.service';
import { TtsService } from '@/tts/tts.service';
import { Database } from '@/types/database.types';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '@/supabase/supabase.service';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import {
  ExportAnkiDto,
  TtsSettingsDto,
} from './dto/export-anki.dto';
import { resolveAndCompileTemplates, type CompiledTemplate } from './utils/anki-compiler';
import type {
  MappedCard,
  AnkiPayload,
  DeckExportResult,
} from './export.types';

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
    const pythonPayload: AnkiPayload = {
      deck_name: deckName,
      deck_uuid: uuidv4(),
      output_dir: tempDir,
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

  private async buildDeckExport(
    deckId: string,
    userId: string,
    templateIds: string[],
    ttsSettings: TtsSettingsDto,
  ): Promise<DeckExportResult> {
    const { data: deck, error: deckError } = await this.supabase
      .from('decks')
      .select('name')
      .eq('id', deckId)
      .eq('user_id', userId)
      .single();

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
    return this.buildDeckExport(deckId, userId, templateIds, ttsSettings);
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
}
