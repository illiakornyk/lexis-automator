import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ExportAnkiDto } from './dto/export-anki.dto';
import { TtsService } from '../tts/tts.service';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly ttsService: TtsService,
  ) {}

  async generateApkg(exportDto: ExportAnkiDto) {
    const uuid = uuidv4();
    const tempDir = path.join(process.cwd(), 'temp', `export-${uuid}`);
    
    // 1. Create temporary directory for shared volume
    await fs.mkdir(tempDir, { recursive: true });

    try {
      const pythonPayload: any = {
        deck_name: exportDto.deckName,
        deck_uuid: uuid,
        templates: exportDto.templates,
        cards: [],
      };

      // 2. Generate Audio for each card
      for (let i = 0; i < exportDto.cards.length; i++) {
        const card = exportDto.cards[i];

        // Use the example for TTS; fall back to the word itself if example is empty
        const ttsText = card.example?.trim() || card.word;
        let filepath: string | null = null;

        try {
          const audioBase64 = await this.ttsService.generateAudio(
            ttsText,
            exportDto.ttsSettings.accent,
            exportDto.ttsSettings.gender,
          );

          const filename = `${card.word}_${i}.webm`.replace(/[^a-z0-9_.]/gi, '_');
          filepath = path.join(tempDir, filename);

          const audioBuffer = Buffer.from(audioBase64, 'base64');
          await fs.writeFile(filepath, audioBuffer);
        } catch (err) {
          this.logger.warn(`TTS failed for card "${card.word}", skipping audio.`);
          filepath = null;
        }

        // Add to payload
        pythonPayload.cards.push({
          word: card.word,
          partOfSpeech: card.partOfSpeech,
          phonetic: card.phonetic,
          definition: card.definition,
          example: card.example || '',
          audio_path: filepath,
        });
      }

      // 3. Make HTTP request to Python Microservice
      this.logger.log(`Requesting APKG generation from Python service for deck: ${uuid}`);
      const pythonServiceUrl = process.env.ANKI_EXPORTER_URL || 'http://127.0.0.1:8000';
      
      const response = await firstValueFrom(
        this.httpService.post(`${pythonServiceUrl}/generate`, pythonPayload)
      );

      const apkgPath = response.data.file_path;
      this.logger.log(`Received APKG path: ${apkgPath}`);

      // 4. Create ReadStream for the controller
      const fileStream = createReadStream(apkgPath);

      // 5. Cleanup function
      const cleanup = () => {
        fs.rm(tempDir, { recursive: true, force: true }).catch((err) => {
          this.logger.error(`Failed to clean up temp dir ${tempDir}:`, err);
        });
      };

      return { fileStream, cleanup };

    } catch (error) {
      // In case of error before stream creation, cleanup immediately
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      this.logger.error('Failed to generate APKG:', error);
      throw error;
    }
  }
}
