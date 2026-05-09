import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { SupabaseService } from '@/supabase/supabase.service';
import { CreateExportJobsDto } from './dto/create-export-jobs.dto';

import {
  EXPORT_JOBS_QUEUE,
  MAX_DONE_SLOTS,
  STUCK_JOB_TIMEOUT_MS,
} from './export-jobs.constants';
import { JOB_STATUS, type ExportJobPayload } from './export-jobs.types';

@Injectable()
export class ExportJobsService {
  private readonly logger = new Logger(ExportJobsService.name);
  private readonly supabase: SupabaseClient<Database>;

  constructor(
    @InjectQueue(EXPORT_JOBS_QUEUE)
    private readonly queue: Queue<ExportJobPayload>,
    supabaseService: SupabaseService,
  ) {
    this.supabase = supabaseService.client;
  }

  async createJobs(userId: string, dto: CreateExportJobsDto) {
    const { count } = await this.supabase
      .from('export_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', JOB_STATUS.DONE);

    if ((count ?? 0) >= MAX_DONE_SLOTS) {
      throw new BadRequestException(
        `You have ${MAX_DONE_SLOTS} completed exports. Delete one to free a slot.`,
      );
    }

    const { data: decks } = await this.supabase
      .from('decks')
      .select('id, name')
      .in('id', dto.deckIds)
      .eq('user_id', userId);

    const deckMap = new Map((decks ?? []).map((d) => [d.id, d.name]));

    const invalidIds = dto.deckIds.filter((id) => !deckMap.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Deck IDs not found or not owned by user: ${invalidIds.join(', ')}`,
      );
    }

    const rows = dto.deckIds.map((deckId) => ({
      user_id: userId,
      deck_id: deckId,
      deck_name: deckMap.get(deckId)!,
      status: JOB_STATUS.PENDING,
      template_ids: dto.templateIds,
      accent: dto.accent,
      gender: dto.gender,
    }));

    const { data: created, error } = await this.supabase
      .from('export_jobs')
      .insert(rows)
      .select();

    if (error || !created) {
      this.logger.error(`Failed to create export jobs: ${error?.message}`);
      throw new BadRequestException('Failed to create export jobs');
    }

    const enqueueResults = await Promise.allSettled(
      created.map((job) =>
        this.queue.add(
          'process',
          { jobId: job.id },
          { attempts: 3, backoff: { type: 'exponential', delay: 10000 } },
        ),
      ),
    );

    const failedJobs: typeof created = [];
    enqueueResults.forEach((r, i) => {
      if (r.status === 'rejected') {
        const reason =
          r.reason instanceof Error ? r.reason.message : String(r.reason);
        this.logger.warn(`Failed to enqueue job ${created[i].id}: ${reason}`);
        failedJobs.push(created[i]);
      }
    });

    if (failedJobs.length > 0) {
      this.logger.error(
        `Failed to enqueue ${failedJobs.length} of ${created.length} export jobs`,
      );
      await this.supabase
        .from('export_jobs')
        .update({
          status: JOB_STATUS.FAILED,
          error_message: 'Failed to enqueue job in worker queue',
          completed_at: new Date().toISOString(),
        })
        .in(
          'id',
          failedJobs.map((j) => j.id),
        );
    }

    const failedIdSet = new Set(failedJobs.map((j) => j.id));
    return created.filter((job) => !failedIdSet.has(job.id));
  }

  async getJobs(userId: string) {
    const { data } = await this.supabase
      .from('export_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return data ?? [];
  }

  async getJobForUser(jobId: string, userId: string) {
    const { data } = await this.supabase
      .from('export_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();
    return data;
  }

  // No user_id filter — for processor use only, where user_id is read from the row.
  async getJobForProcessor(jobId: string) {
    const { data } = await this.supabase
      .from('export_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    return data;
  }

  async cancelJob(jobId: string, userId: string) {
    const { data: job } = await this.supabase
      .from('export_jobs')
      .select('status')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (!job) throw new NotFoundException('Job not found');
    if (
      job.status !== JOB_STATUS.PENDING &&
      job.status !== JOB_STATUS.PROCESSING
    ) {
      throw new BadRequestException(
        'Can only cancel pending or processing jobs',
      );
    }

    if (job.status === JOB_STATUS.PENDING) {
      const waiting = await this.queue.getJobs(['waiting', 'delayed']);
      for (const bJob of waiting) {
        if (bJob.data.jobId === jobId) {
          await bJob.remove();
          break;
        }
      }
    }

    await this.supabase
      .from('export_jobs')
      .update({ status: JOB_STATUS.CANCELLED })
      .eq('id', jobId)
      .eq('user_id', userId);
  }

  async deleteJob(jobId: string, userId: string) {
    const { data: job } = await this.supabase
      .from('export_jobs')
      .select('file_path, status')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (!job) throw new NotFoundException('Job not found');

    if (job.file_path) {
      await this.supabase.storage.from('exports').remove([job.file_path]);
    }

    await this.supabase.from('export_jobs').delete().eq('id', jobId);
  }

  async getDownloadUrl(jobId: string, userId: string): Promise<string> {
    const { data: job } = await this.supabase
      .from('export_jobs')
      .select('file_path, status')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (!job) throw new NotFoundException('Job not found');
    if (job.status !== JOB_STATUS.DONE || !job.file_path) {
      throw new BadRequestException('Export is not ready for download');
    }

    const { data } = await this.supabase.storage
      .from('exports')
      .createSignedUrl(job.file_path, 3600);

    if (!data?.signedUrl) throw new Error('Failed to generate download URL');
    return data.signedUrl;
  }

  async markProcessing(jobId: string, attempt: number) {
    const { data } = await this.supabase
      .from('export_jobs')
      .update({
        status: JOB_STATUS.PROCESSING,
        started_at: new Date().toISOString(),
        attempts: attempt,
      })
      .eq('id', jobId)
      .in('status', [JOB_STATUS.PENDING, JOB_STATUS.PROCESSING])
      .select()
      .maybeSingle();
    return data;
  }

  async markDone(jobId: string, filePath: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('export_jobs')
      .update({
        status: JOB_STATUS.DONE,
        file_path: filePath,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('status', JOB_STATUS.PROCESSING)
      .select('id')
      .maybeSingle();
    return data !== null;
  }

  async markFailed(jobId: string, errorMessage: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('export_jobs')
      .update({
        status: JOB_STATUS.FAILED,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('status', JOB_STATUS.PROCESSING)
      .select('id')
      .maybeSingle();
    return data !== null;
  }

  async removeJob(jobId: string, userId: string): Promise<void> {
    const job = await this.getJobForUser(jobId, userId);
    if (!job) return;

    if (
      job.status === JOB_STATUS.PENDING ||
      job.status === JOB_STATUS.PROCESSING
    ) {
      await this.cancelJob(jobId, userId);
    } else {
      await this.deleteJob(jobId, userId);
    }
  }

  async uploadToStorage(
    userId: string,
    jobId: string,
    buffer: Buffer,
  ): Promise<string> {
    const filePath = `exports/${userId}/${jobId}.apkg`;
    const { error } = await this.supabase.storage
      .from('exports')
      .upload(filePath, buffer, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return filePath;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpired() {
    this.logger.log('Running export jobs cleanup...');

    const now = new Date().toISOString();

    const { data: expired, error: expiredError } = await this.supabase
      .from('export_jobs')
      .select('id, file_path')
      .lt('expires_at', now);

    if (expiredError) {
      this.logger.error(
        `Failed to fetch expired jobs: ${expiredError.message}`,
      );
      return;
    }

    const expiredRows = expired ?? [];

    const filePaths = expiredRows
      .map((j) => j.file_path)
      .filter((p): p is string => p !== null);

    if (filePaths.length > 0) {
      const { error: storageError } = await this.supabase.storage
        .from('exports')
        .remove(filePaths);
      if (storageError) {
        this.logger.error(
          `Failed to remove expired storage files: ${storageError.message}`,
        );
      }
    }

    if (expiredRows.length > 0) {
      const { error: deleteError } = await this.supabase
        .from('export_jobs')
        .delete()
        .in(
          'id',
          expiredRows.map((j) => j.id),
        );
      if (deleteError) {
        this.logger.error(
          `Failed to delete expired job rows: ${deleteError.message}`,
        );
      } else {
        this.logger.log(`Deleted ${expiredRows.length} expired export jobs`);
      }
    }

    const stuckThreshold = new Date(
      Date.now() - STUCK_JOB_TIMEOUT_MS,
    ).toISOString();
    const { data: stuck, error: stuckError } = await this.supabase
      .from('export_jobs')
      .update({
        status: JOB_STATUS.FAILED,
        error_message:
          'Job timed out — worker did not finish in the expected time',
        completed_at: new Date().toISOString(),
      })
      .eq('status', JOB_STATUS.PROCESSING)
      .lt('started_at', stuckThreshold)
      .select('id');

    if (stuckError) {
      this.logger.error(
        `Failed to mark stuck jobs as failed: ${stuckError.message}`,
      );
    } else if (stuck && stuck.length > 0) {
      this.logger.warn(`Marked ${stuck.length} stuck job(s) as failed`);
    }
  }
}
