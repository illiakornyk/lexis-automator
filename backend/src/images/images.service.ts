import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { SupabaseService } from '@/supabase/supabase.service';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import type { ImageSearchResult, PixabaySearchResponse } from './images.types';

const MAX_IMAGE_BYTES = 1 * 1024 * 1024;
const HD_WIDTH = 1280;
const HD_HEIGHT = 720;
const BUCKET = 'card-images';

async function toWebp(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .resize(HD_WIDTH, HD_HEIGHT, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);
  private readonly supabase: SupabaseClient<Database>;
  private readonly pixabayKey: string;

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService,
    supabaseService: SupabaseService,
  ) {
    this.supabase = supabaseService.client;
    this.pixabayKey = configService.getOrThrow('PIXABAY_API_KEY');
  }

  async searchImages(query: string, page = 1): Promise<ImageSearchResult[]> {
    const url = `https://pixabay.com/api/?key=${this.pixabayKey}&q=${encodeURIComponent(query)}&image_type=photo&safesearch=true&per_page=20&page=${page}`;
    const resp = await firstValueFrom(
      this.httpService.get<PixabaySearchResponse>(url),
    );
    return resp.data.hits.map((h) => ({
      id: String(h.id),
      previewUrl: h.previewURL,
      webformatUrl: h.webformatURL,
    }));
  }

  async saveFromUrl(
    cardId: string,
    userId: string,
    url: string,
  ): Promise<string> {
    let buffer: Buffer;

    try {
      const resp = await firstValueFrom(
        this.httpService.get<ArrayBuffer>(url, { responseType: 'arraybuffer' }),
      );
      buffer = Buffer.from(resp.data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Image download failed for ${url}: ${message}`);
      throw new BadRequestException('Failed to download image from URL');
    }

    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Image exceeds 1 MB limit');
    }

    return this.storeBuffer(cardId, userId, buffer);
  }

  async saveFromUpload(
    cardId: string,
    userId: string,
    buffer: Buffer,
  ): Promise<string> {
    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Image exceeds 1 MB limit');
    }
    return this.storeBuffer(cardId, userId, buffer);
  }

  private async storeBuffer(
    cardId: string,
    userId: string,
    buffer: Buffer,
  ): Promise<string> {
    const webpBuffer = await toWebp(buffer);
    const storagePath = `${userId}/${cardId}.webp`;

    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(storagePath, webpBuffer, { contentType: 'image/webp', upsert: true });

    if (error) {
      throw new BadRequestException(`Storage upload failed: ${error.message}`);
    }

    const { error: updateError } = await this.supabase
      .from('saved_cards')
      .update({ image_path: storagePath })
      .eq('id', cardId);

    if (updateError) {
      this.logger.error(
        `Failed to update saved_cards.image_path for card ${cardId}`,
        updateError,
      );
      const { error: removeError } = await this.supabase.storage
        .from(BUCKET)
        .remove([storagePath]);
      if (removeError) {
        this.logger.error(
          `Failed to clean up orphaned upload at ${storagePath}: ${removeError.message}`,
        );
      }
      throw new BadRequestException('Failed to attach image to card');
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

  async createSignedUrl(
    storagePath: string,
    expiresIn = 3600,
  ): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, expiresIn);
    if (error || !data)
      throw new BadRequestException('Failed to create signed URL');
    return data.signedUrl;
  }

  async downloadToFile(storagePath: string, destDir: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .download(storagePath);
    if (error || !data)
      throw new Error(`Failed to download image: ${storagePath}`);

    const buffer = Buffer.from(await data.arrayBuffer());
    const ext = path.extname(storagePath) || '.jpg';
    const filename = `image_${path.basename(storagePath, ext)}${ext}`;
    const destPath = path.join(destDir, filename);

    await fs.writeFile(destPath, buffer);
    return destPath;
  }
}
