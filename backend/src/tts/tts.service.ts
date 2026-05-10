import { spawn } from 'child_process';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '@/supabase/supabase.service';
import { Database } from '@/types/database.types';
import { Accent, Gender } from './dto/generate-tts.dto';
import { resolveVoice } from './tts.types';

function convertWavToWebm(wavBuffer: Buffer, logger: Logger): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i',
      'pipe:0',
      '-f',
      'webm',
      '-c:a',
      'libopus',
      '-b:a',
      '32k',
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

    ffmpeg.stdin.on('error', (err) =>
      logger.error(`ffmpeg stdin error: ${err.message}`),
    );
    ffmpeg.stdin.write(wavBuffer);
    ffmpeg.stdin.end();
  });
}

async function synthesizeWithApiKey(
  text: string,
  voiceName: string,
  languageCode: string,
  apiKey: string,
): Promise<Buffer> {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
  const body = JSON.stringify({
    input: { text },
    voice: { languageCode, name: voiceName },
    audioConfig: { audioEncoding: 'LINEAR16' },
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(
      `Google TTS REST error ${res.status}: ${err?.error?.message ?? res.statusText}`,
    );
  }

  const data = await res.json() as { audioContent?: string };
  if (!data.audioContent) throw new Error('Google TTS returned empty audioContent');
  return Buffer.from(data.audioContent, 'base64');
}

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly client: TextToSpeechClient;
  private readonly supabase: SupabaseClient<Database>;

  constructor(supabaseService: SupabaseService) {
    try {
      this.client = new TextToSpeechClient();
    } catch (e) {
      throw new Error(
        `Failed to initialize Google TTS client — check GOOGLE_APPLICATION_CREDENTIALS. Cause: ${(e as Error).message}`,
      );
    }
    this.supabase = supabaseService.client;
  }

  async getUserTtsKey(userId: string): Promise<string | null> {
    const { data, error } = await this.supabase.rpc('get_user_google_tts_key', {
      p_user_id: userId,
    });
    if (error || !data) return null;
    return data;
  }

  async generateAudio(
    text: string,
    accent: Accent = Accent.US,
    gender: Gender = Gender.FEMALE,
    userApiKey?: string,
  ): Promise<string> {
    const { name, languageCode } = resolveVoice(accent, gender);

    try {
      let wavBuffer: Buffer;

      if (userApiKey) {
        wavBuffer = await synthesizeWithApiKey(text, name, languageCode, userApiKey);
      } else {
        const [response] = await this.client.synthesizeSpeech({
          input: { text },
          voice: { languageCode, name },
          audioConfig: { audioEncoding: 'LINEAR16' },
        });

        if (!response.audioContent) {
          throw new InternalServerErrorException(
            'Google TTS returned empty audio payload',
          );
        }
        wavBuffer = Buffer.from(response.audioContent);
      }

      const webmBuffer = await convertWavToWebm(wavBuffer, this.logger);
      return webmBuffer.toString('base64');
    } catch (error) {
      this.logger.error('Google Cloud TTS generation failed', error);
      throw new InternalServerErrorException('Failed to generate audio');
    }
  }
}
