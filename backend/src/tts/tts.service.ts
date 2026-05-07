import { spawn } from 'child_process';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { Accent, Gender } from './dto/generate-tts.dto';
import { resolveVoice } from './tts.types';

function convertWavToWebm(wavBuffer: Buffer, logger: Logger): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', 'pipe:0',
      '-f', 'webm',
      '-c:a', 'libopus',
      '-b:a', '32k',
      'pipe:1',
    ]);

    const chunks: Buffer[] = [];
    let stderr = '';

    ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        logger.error(`ffmpeg exited with code ${code}: ${stderr}`);
        return reject(new Error('ffmpeg conversion failed'));
      }
      resolve(Buffer.concat(chunks));
    });

    ffmpeg.stdin.on('error', (err) => logger.error(`ffmpeg stdin error: ${err.message}`));
    ffmpeg.stdin.write(wavBuffer);
    ffmpeg.stdin.end();
  });
}

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly client: TextToSpeechClient;

  constructor() {
    try {
      this.client = new TextToSpeechClient();
    } catch (e) {
      throw new Error(
        `Failed to initialize Google TTS client — check GOOGLE_APPLICATION_CREDENTIALS. Cause: ${(e as Error).message}`,
      );
    }
  }

  async generateAudio(
    text: string,
    accent: Accent = Accent.US,
    gender: Gender = Gender.FEMALE,
  ): Promise<string> {
    const { name, languageCode } = resolveVoice(accent, gender);

    try {
      const [response] = await this.client.synthesizeSpeech({
        input: { text },
        voice: { languageCode, name },
        audioConfig: { audioEncoding: 'LINEAR16' },
      });

      if (!response.audioContent) {
        throw new InternalServerErrorException('Google TTS returned empty audio payload');
      }

      const webmBuffer = await convertWavToWebm(Buffer.from(response.audioContent), this.logger);
      return webmBuffer.toString('base64');
    } catch (error) {
      this.logger.error('Google Cloud TTS generation failed', error);
      throw new InternalServerErrorException('Failed to generate audio');
    }
  }
}
