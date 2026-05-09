import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExportJobsService } from './export-jobs.service';
import { CreateExportJobsDto } from './dto/create-export-jobs.dto';
import { SupabaseAuthGuard } from '@/guards/supabase-auth.guard';
import type { AuthenticatedRequest } from '@/types/authenticated-request.type';

@ApiTags('export-jobs')
@ApiBearerAuth()
@Controller('export-jobs')
@UseGuards(SupabaseAuthGuard)
export class ExportJobsController {
  constructor(private readonly exportJobsService: ExportJobsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create export jobs for one or more decks' })
  @ApiBody({ type: CreateExportJobsDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Jobs created and queued.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Too many completed exports or invalid input.',
  })
  createJobs(
    @Body() dto: CreateExportJobsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.exportJobsService.createJobs(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all export jobs for the current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of export jobs.' })
  getJobs(@Req() req: AuthenticatedRequest) {
    return this.exportJobsService.getJobs(req.user.sub);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get a signed download URL for a completed export' })
  @ApiParam({ name: 'id', description: 'Export job ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Signed download URL.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Job not found.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Export not ready.',
  })
  async getDownloadUrl(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const url = await this.exportJobsService.getDownloadUrl(id, req.user.sub);
    return { url };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel or delete an export job' })
  @ApiParam({ name: 'id', description: 'Export job ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Job removed.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Job not found.' })
  removeJob(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.exportJobsService.removeJob(id, req.user.sub);
  }
}
