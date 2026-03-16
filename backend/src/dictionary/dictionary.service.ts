import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DictionaryService {
  constructor(private configService: ConfigService) {}

  getApiUrl() {
    return this.configService.get<string>('FREE_DICTIONARY_API_URL');
  }


}
