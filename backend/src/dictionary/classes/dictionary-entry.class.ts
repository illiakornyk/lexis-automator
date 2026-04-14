import { ApiProperty } from '@nestjs/swagger';

export class License {
  @ApiProperty({ example: 'CC BY-SA 3.0' })
  name: string;

  @ApiProperty({ example: 'https://creativecommons.org/licenses/by-sa/3.0' })
  url: string;
}

export class Phonetic {
  @ApiProperty({ required: false, example: '/həˈloʊ/' })
  text?: string;

  @ApiProperty({
    example:
      'https://api.dictionaryapi.dev/media/pronunciations/en/hello-au.mp3',
  })
  audio: string;

  @ApiProperty({ required: false })
  sourceUrl?: string;

  @ApiProperty({ type: License, required: false })
  license?: License;
}

export class Definition {
  @ApiProperty({ example: 'Used as a greeting when meeting someone.' })
  definition: string;

  @ApiProperty({ type: [String] })
  synonyms: string[];

  @ApiProperty({ type: [String] })
  antonyms: string[];

  @ApiProperty({ required: false, example: 'Hello, everyone.' })
  example?: string;
}

export class Meaning {
  @ApiProperty({ example: 'interjection' })
  partOfSpeech: string;

  @ApiProperty({ type: [Definition] })
  definitions: Definition[];

  @ApiProperty({ type: [String] })
  synonyms: string[];

  @ApiProperty({ type: [String] })
  antonyms: string[];
}

export class DictionaryEntry {
  @ApiProperty({ example: 'hello' })
  word: string;

  @ApiProperty({ required: false, example: '/həˈloʊ/' })
  phonetic?: string;

  @ApiProperty({ type: [Phonetic] })
  phonetics: Phonetic[];

  @ApiProperty({ type: [Meaning] })
  meanings: Meaning[];

  @ApiProperty({ type: License })
  license: License;

  @ApiProperty({ type: [String] })
  sourceUrls: string[];
}
