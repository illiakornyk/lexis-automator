import { Controller, Get, Post, Param, Body, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { DictionaryService } from './dictionary.service';
import { DictionaryEntry } from './classes/dictionary-entry.class';
import { AiService } from '../ai/ai.service';
import { GenerateExampleDto } from './dto/generate-example.dto';

@ApiTags('dictionary')
@Controller('dictionary')
export class DictionaryController {
  constructor(
    private readonly dictionaryService: DictionaryService,
    private readonly aiService: AiService,
  ) {}

  @Get(':word')
  @ApiOperation({ summary: 'Get word definition' })
  @ApiParam({
    name: 'word',
    description: 'The word to look up',
    example: 'hello',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The word definition has been successfully retrieved.',
    type: [DictionaryEntry],
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Word not found.' })
  async getDefinition(@Param('word') word: string) {
    return this.dictionaryService.getDefinition(word);
  }

  @Post('example')
  @ApiOperation({ summary: 'Generate an example sentence using AI' })
  @ApiBody({ type: GenerateExampleDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The example sentence has been successfully generated.',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to generate example.',
  })
  async generateExample(@Body() dto: GenerateExampleDto) {
    const sentence = await this.aiService.generateExample(
      dto.word,
      dto.definition,
    );
    return { example: sentence };
  }
}
