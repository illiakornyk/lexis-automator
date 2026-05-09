import type { CardDataDto } from './dto/export-anki.dto';
import type { CompiledTemplate } from './utils/anki-compiler';

export interface MappedCard extends CardDataDto {
  imagePath?: string | null;
}

export interface AnkiCardPayload {
  word: string;
  partOfSpeech: string;
  phonetic: string;
  definition: string;
  example: string;
  audio_path: string | null;
  image_path: string | null;
}

export interface AnkiPayload {
  deck_name: string;
  deck_uuid: string;
  output_dir: string;
  templates: CompiledTemplate[];
  cards: AnkiCardPayload[];
}

export interface DeckExportResult {
  apkgPath: string;
  deckName: string;
  cleanup: () => Promise<void>;
}
