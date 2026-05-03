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
import { ExportJobsService } from './export-jobs.service';
import { CreateExportJobsDto } from './dto/create-export-jobs.dto';
import { SupabaseAuthGuard } from '../guards/supabase-auth.guard';

@Controller('export-jobs')
@UseGuards(SupabaseAuthGuard)
export class ExportJobsController {
  constructor(private readonly exportJobsService: ExportJobsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createJobs(@Body() dto: CreateExportJobsDto, @Req() req: any) {
    return this.exportJobsService.createJobs(req.user.sub, dto);
  }

  @Get()
  getJobs(@Req() req: any) {
    return this.exportJobsService.getJobs(req.user.sub);
  }

  @Get(':id/download')
  async getDownloadUrl(@Param('id') id: string, @Req() req: any) {
    const url = await this.exportJobsService.getDownloadUrl(id, req.user.sub);
    return { url };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeJob(@Param('id') id: string, @Req() req: any) {
    const job = await this.exportJobsService.getJob(id);
    if (!job) return;

    if (job.status === 'pending' || job.status === 'processing') {
      await this.exportJobsService.cancelJob(id, req.user.sub);
    } else {
      await this.exportJobsService.deleteJob(id, req.user.sub);
    }
  }
}
