import { Controller, Post, Body, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { TtsService } from './tts.service';
import { GenerateTtsDto } from './dto/generate-tts.dto';
import { SupabaseAuthGuard } from '@/guards/supabase-auth.guard';

@ApiTags('tts')
@ApiBearerAuth()
@Controller('tts')
@UseGuards(SupabaseAuthGuard)
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate WEBM (Opus) audio using Text-to-Speech' })
  @ApiBody({ type: GenerateTtsDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description:
      'The audio has been successfully generated as a base64 string.',
    schema: {
      type: 'object',
      properties: {
        audioBase64: {
          type: 'string',
          example: 'GkXfo59ChoEBQveBAULygQRC84EIQoKEd2Vib...',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to generate audio.',
  })
  async generateAudio(@Body() dto: GenerateTtsDto) {
    const audioBase64 = await this.ttsService.generateAudio(
      dto.text,
      dto.accent,
      dto.gender,
    );
    return { audioBase64 };
  }
}
