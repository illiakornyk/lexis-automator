import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { GenerateExampleDto } from '@/dictionary/dto/generate-example.dto';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('example')
  @ApiOperation({ summary: 'Generate an example sentence for a word using AI' })
  @ApiBody({ type: GenerateExampleDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Example sentence generated successfully.',
    schema: { type: 'object', properties: { example: { type: 'string' } } },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to generate example.',
  })
  async generateExample(@Body() dto: GenerateExampleDto) {
    const sentence = await this.aiService.generateExample(
      dto.word,
      dto.definition,
      dto.apiKey,
      dto.provider,
    );
    return { example: sentence };
  }
}
