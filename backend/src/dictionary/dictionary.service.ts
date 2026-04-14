import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DictionaryResponse } from '../types/dictionary-response.type';

@Injectable()
export class DictionaryService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  getApiUrl() {
    return this.configService.getOrThrow<string>('FREE_DICTIONARY_API_URL');
  }

  async getDefinition(word: string): Promise<DictionaryResponse> {
    const baseUrl = this.getApiUrl();
    const url = `${baseUrl}${encodeURIComponent(word)}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<DictionaryResponse>(url),
      );
      return response.data;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as any).response?.status === 404
      ) {
        throw new HttpException(
          `Word "${word}" not found`,
          HttpStatus.NOT_FOUND,
        );
      }
      throw new HttpException(
        'Error fetching word definition',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
