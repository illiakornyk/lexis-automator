import { Controller, Get, Param, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { DictionaryService } from './dictionary.service';
import { DictionaryEntry } from './classes/dictionary-entry.class';
import { SupabaseAuthGuard } from '@/guards/supabase-auth.guard';

@ApiTags('dictionary')
@ApiBearerAuth()
@Controller('dictionary')
@UseGuards(SupabaseAuthGuard)
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  @Get(':word')
  @ApiOperation({ summary: 'Get word definition' })
  @ApiParam({ name: 'word', description: 'The word to look up', example: 'hello' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Word definition retrieved successfully.',
    type: [DictionaryEntry],
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Word not found.' })
  async getDefinition(@Param('word') word: string) {
    return this.dictionaryService.getDefinition(word);
  }
}
