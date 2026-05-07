import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExportJobsController } from './export-jobs.controller';
import { ExportJobsService } from './export-jobs.service';
import { EXPORT_JOBS_QUEUE } from './export-jobs.constants';
import { ExportJobsProcessor } from './export-jobs.processor';
import { ExportModule } from '@/export/export.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: EXPORT_JOBS_QUEUE }),
    ExportModule,
  ],
  controllers: [ExportJobsController],
  providers: [ExportJobsService, ExportJobsProcessor],
})
export class ExportJobsModule {}
