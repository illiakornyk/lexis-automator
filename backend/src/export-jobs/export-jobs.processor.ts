import { Processor, WorkerHost } from '@nestjs/bullmq';

function toUserFriendlyError(raw: string): string {
  if (/ECONNREFUSED/i.test(raw)) return 'Export service is unavailable. Please try again later.';
  if (/ETIMEDOUT|ESOCKETTIMEDOUT|timeout/i.test(raw)) return 'Export timed out. The deck may be too large — try again or reduce the number of cards.';
  if (/ENOTFOUND|getaddrinfo/i.test(raw)) return 'Could not reach the export service. Check your network configuration.';
  if (/socket hang up/i.test(raw)) return 'Connection to export service was lost. Please try again.';
  if (/5\d\d/.test(raw)) return 'Export service returned an error. Please try again later.';
  return 'Export failed due to an unexpected error. Please try again.';
}
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as fs from 'fs/promises';
import { ExportJobsService } from './export-jobs.service';
import { EXPORT_JOBS_QUEUE } from './export-jobs.constants';
import type { ExportJobPayload } from './export-jobs.types';
import { ExportService } from '@/export/export.service';
import { Accent, Gender } from '@/tts/dto/generate-tts.dto';

@Processor(EXPORT_JOBS_QUEUE, { concurrency: 2 })
export class ExportJobsProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportJobsProcessor.name);

  constructor(
    private readonly exportJobsService: ExportJobsService,
    private readonly exportService: ExportService,
  ) {
    super();
  }

  async process(job: Job<ExportJobPayload>): Promise<void> {
    const { jobId } = job.data;
    this.logger.log(
      `Processing export job ${jobId} (attempt ${job.attemptsMade + 1})`,
    );

    const exportJob = await this.exportJobsService.markProcessing(
      jobId,
      job.attemptsMade + 1,
    );

    if (!exportJob) {
      this.logger.log(
        `Job ${jobId} is no longer pending/processing (cancelled, done, or failed). Skipping.`,
      );
      return;
    }

    if (!exportJob.deck_id) {
      await this.exportJobsService.markFailed(jobId, 'Job has no deck_id');
      return;
    }

    let cleanup: (() => Promise<void>) | null = null;

    try {
      const result = await this.exportService.buildApkgForJob(
        exportJob.deck_id,
        exportJob.user_id,
        exportJob.template_ids,
        {
          accent: exportJob.accent as Accent,
          gender: exportJob.gender as Gender,
        },
      );
      cleanup = result.cleanup;

      // Check cancellation after the long-running build
      const current = await this.exportJobsService.getJobForProcessor(jobId);
      if (current?.status === 'cancelled') {
        this.logger.log(
          `Job ${jobId} was cancelled after build, discarding output.`,
        );
        return;
      }

      const buffer = await fs.readFile(result.apkgPath);
      const storagePath = await this.exportJobsService.uploadToStorage(
        exportJob.user_id,
        jobId,
        buffer,
      );

      const marked = await this.exportJobsService.markDone(jobId, storagePath);
      if (marked) {
        this.logger.log(`Job ${jobId} done → ${storagePath}`);
      } else {
        this.logger.log(
          `Job ${jobId} was cancelled before completion; uploaded file kept at ${storagePath}.`,
        );
      }
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : 'Unknown error';
      const message = toUserFriendlyError(rawMessage);
      const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1) - 1;
      if (isLastAttempt) {
        const marked = await this.exportJobsService.markFailed(jobId, message);
        if (marked) {
          this.logger.error(`Job ${jobId} permanently failed: ${message}`, err instanceof Error ? err.stack : undefined);
        } else {
          this.logger.log(
            `Job ${jobId} failed but was already cancelled or completed; not overwriting status.`,
          );
        }
      } else {
        this.logger.warn(
          `Job ${jobId} failed (attempt ${job.attemptsMade + 1}): ${message}`,
        );
      }
      throw err;
    } finally {
      if (cleanup) await cleanup();
    }
  }
}
