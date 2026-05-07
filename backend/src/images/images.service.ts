import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { firstValueFrom } from 'rxjs';
import * as path from 'path';

const MAX_IMAGE_BYTES = 1 * 1024 * 1024;
const BUCKET = 'card-images';

function extFromContentType(ct: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
  };
  const base = ct.split(';')[0].trim().toLowerCase();
  return map[base] || 'jpg';
}

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);
  private readonly supabase: SupabaseClient<Database>;
  private readonly pixabayKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.supabase = createClient<Database>(
      this.configService.getOrThrow('SUPABASE_URL'),
      this.configService.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
    this.pixabayKey = this.configService.getOrThrow('PIXABAY_API_KEY');
  }

  async searchImages(query: string, page = 1) {
    const url = `https://pixabay.com/api/?key=${this.pixabayKey}&q=${encodeURIComponent(query)}&image_type=photo&safesearch=true&per_page=20&page=${page}`;
    const resp = await firstValueFrom(this.httpService.get(url));
    return (resp.data.hits as any[]).map((h) => ({
      id: String(h.id),
      previewUrl: h.previewURL as string,
      webformatUrl: h.webformatURL as string,
    }));
  }

  async saveFromUrl(cardId: string, userId: string, url: string): Promise<string> {
    let buffer: Buffer;
    let contentType: string;

    try {
      const resp = await firstValueFrom(
        this.httpService.get<ArrayBuffer>(url, { responseType: 'arraybuffer' }),
      );
      buffer = Buffer.from(resp.data);
      contentType = (resp.headers['content-type'] as string) || 'image/jpeg';
    } catch (e) {
      throw new BadRequestException('Failed to download image from URL');
    }

    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Image exceeds 1 MB limit');
    }

    return this.storeBuffer(cardId, userId, buffer, contentType);
  }

  async saveFromUpload(cardId: string, userId: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Image exceeds 1 MB limit');
    }
    return this.storeBuffer(cardId, userId, buffer, mimeType);
  }

  private async storeBuffer(
    cardId: string,
    userId: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const ext = extFromContentType(contentType);
    const storagePath = `${userId}/${cardId}.${ext}`;

    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (error) {
      throw new BadRequestException(`Storage upload failed: ${error.message}`);
    }

    const { error: updateError } = await this.supabase
      .from('saved_cards')
      .update({ image_path: storagePath })
      .eq('id', cardId);

    if (updateError) {
      this.logger.error('Failed to update saved_cards.image_path', updateError);
    }

    return storagePath;
  }

  async removeImage(cardId: string): Promise<void> {
    const { data } = await this.supabase
      .from('saved_cards')
      .select('image_path')
      .eq('id', cardId)
      .single();

    if (data?.image_path) {
      await this.supabase.storage.from(BUCKET).remove([data.image_path]);
    }

    await this.supabase
      .from('saved_cards')
      .update({ image_path: null })
      .eq('id', cardId);
  }

  async createSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, expiresIn);
    if (error || !data) throw new BadRequestException('Failed to create signed URL');
    return data.signedUrl;
  }

  async downloadToFile(storagePath: string, destDir: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .download(storagePath);
    if (error || !data) throw new Error(`Failed to download image: ${storagePath}`);

    const buffer = Buffer.from(await data.arrayBuffer());
    const ext = path.extname(storagePath) || '.jpg';
    const filename = `image_${path.basename(storagePath, ext)}${ext}`;
    const destPath = path.join(destDir, filename);

    const { writeFile } = await import('fs/promises');
    await writeFile(destPath, buffer);
    return destPath;
  }
}
