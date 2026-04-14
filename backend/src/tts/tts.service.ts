import { spawn } from 'child_process';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { Accent, Gender } from './dto/generate-tts.dto';

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private client: TextToSpeechClient;

  constructor() {
    // If GOOGLE_APPLICATION_CREDENTIALS is set in env, the client automatically picks it up
    try {
      this.client = new TextToSpeechClient();
    } catch (e) {
      this.logger.error('Failed to initialize Google TTS Client. Ensure GOOGLE_APPLICATION_CREDENTIALS is set.', e);
    }
  }

  private getVoiceName(accent: Accent, gender: Gender): string {
    if (accent === Accent.US) {
      return gender === Gender.FEMALE ? 'en-US-Journey-F' : 'en-US-Journey-D';
    } else {
      return gender === Gender.FEMALE ? 'en-GB-Journey-F' : 'en-GB-Journey-D';
    }
  }

  private convertWavToWebm(wavBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn('ffmpeg', [
        '-i', 'pipe:0',      // Read from stdin
        '-f', 'webm',        // Output format
        '-c:a', 'libopus',   // Codec (native for webm)
        '-b:a', '32k',       // Bitrate: 32k is cost/size efficient for speech
        'pipe:1'             // Write to stdout
      ]);

      const webmChunks: Buffer[] = [];
      let errorData = '';

      ffmpegProcess.stdout.on('data', (chunk) => {
        webmChunks.push(chunk);
      });

      ffmpegProcess.stderr.on('data', (chunk) => {
        errorData += chunk.toString();
      });

      ffmpegProcess.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`ffmpeg exited with code ${code}. Error: ${errorData}`);
          return reject(new Error('ffmpeg conversion failed'));
        }
        resolve(Buffer.concat(webmChunks));
      });

      ffmpegProcess.stdin.on('error', (err) => {
        this.logger.error(`ffmpeg stdin error: ${err.message}`);
      });

      ffmpegProcess.stdin.write(wavBuffer);
      ffmpegProcess.stdin.end();
    });
  }

  async generateAudio(text: string, accent: Accent = Accent.US, gender: Gender = Gender.FEMALE): Promise<string> {
    const voiceName = this.getVoiceName(accent, gender);
    const languageCode = accent === Accent.US ? 'en-US' : 'en-GB';

    const request = {
      input: { text: text },
      voice: { languageCode: languageCode, name: voiceName },
      // Request native WAVE (LINEAR16) to avoid double compression
      audioConfig: { audioEncoding: 'LINEAR16' as const },
    };

    try {
      const [response] = await this.client.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new InternalServerErrorException('Google TTS returned empty audio payload');
      }

      // Convert the raw WAV payload directly into WEBM (Opus) via ffmpeg
      const wavBuffer = Buffer.from(response.audioContent);
      const webmBuffer = await this.convertWavToWebm(wavBuffer);

      return webmBuffer.toString('base64');
    } catch (error) {
      this.logger.error('Google Cloud TTS generation failed', error);
      throw new InternalServerErrorException('Failed to generate audio');
    }
  }
}
