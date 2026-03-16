import { Controller, Get, Param, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DictionaryService } from './dictionary.service';
import { DictionaryEntry } from './classes/dictionary-entry.class';

@ApiTags('dictionary')
@Controller('dictionary')
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  @Get(':word')
  @ApiOperation({ summary: 'Get word definition' })
  @ApiParam({ name: 'word', description: 'The word to look up', example: 'hello' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The word definition has been successfully retrieved.',
    type: [DictionaryEntry],
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Word not found.' })
  async getDefinition(@Param('word') word: string) {
    return this.dictionaryService.getDefinition(word);
  }
}
