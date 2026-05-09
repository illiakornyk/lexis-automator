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

import { EXPORT_JOBS_QUEUE, MAX_DONE_SLOTS, STUCK_JOB_TIMEOUT_MS } from './export-jobs.constants';

@Injectable()
export class ExportJobsService {
  private readonly logger = new Logger(ExportJobsService.name);
  private readonly supabase: SupabaseClient<Database>;

  constructor(
    @InjectQueue(EXPORT_JOBS_QUEUE) private readonly queue: Queue,
    supabaseService: SupabaseService,
  ) {
    this.supabase = supabaseService.client;
  }

  async createJobs(userId: string, dto: CreateExportJobsDto) {
    const { count } = await this.supabase
      .from('export_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'done');

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

    const rows = dto.deckIds
      .map((deckId) => {
        const deckName = deckMap.get(deckId);
        if (!deckName) return null;
        return {
          user_id: userId,
          deck_id: deckId,
          deck_name: deckName,
          status: 'pending',
          template_ids: dto.templateIds,
          accent: dto.accent,
          gender: dto.gender,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) return [];

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

    const failedToEnqueue = enqueueResults
      .map((r, i) => (r.status === 'rejected' ? { job: created[i], reason: r.reason } : null))
      .filter((x): x is { job: typeof created[number]; reason: unknown } => x !== null);

    if (failedToEnqueue.length > 0) {
      this.logger.error(
        `Failed to enqueue ${failedToEnqueue.length} of ${created.length} export jobs`,
      );
      const failedIds = failedToEnqueue.map((f) => f.job.id);
      await this.supabase
        .from('export_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to enqueue job in worker queue',
          completed_at: new Date().toISOString(),
        })
        .in('id', failedIds);
    }

    const failedIdSet = new Set(failedToEnqueue.map((f) => f.job.id));
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

  async getJob(jobId: string) {
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
    if (!['pending', 'processing'].includes(job.status)) {
      throw new BadRequestException(
        'Can only cancel pending or processing jobs',
      );
    }

    if (job.status === 'pending') {
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
      .update({ status: 'cancelled' })
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
    if (job.status !== 'done' || !job.file_path) {
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
        status: 'processing',
        started_at: new Date().toISOString(),
        attempts: attempt,
      })
      .eq('id', jobId)
      .in('status', ['pending', 'processing'])
      .select()
      .maybeSingle();
    return data;
  }

  async markDone(jobId: string, filePath: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('export_jobs')
      .update({
        status: 'done',
        file_path: filePath,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('status', 'processing')
      .select('id')
      .maybeSingle();
    return data !== null;
  }

  async markFailed(jobId: string, errorMessage: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('export_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('status', 'processing')
      .select('id')
      .maybeSingle();
    return data !== null;
  }

  async removeJob(jobId: string, userId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;

    if (job.status === 'pending' || job.status === 'processing') {
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

    const { data: expired } = await this.supabase
      .from('export_jobs')
      .select('id, file_path')
      .lt('expires_at', now);

    const expiredRows = expired ?? [];

    const filePaths = expiredRows
      .map((j) => j.file_path)
      .filter((p): p is string => p !== null);

    if (filePaths.length > 0) {
      await this.supabase.storage.from('exports').remove(filePaths);
    }

    if (expiredRows.length > 0) {
      await this.supabase
        .from('export_jobs')
        .delete()
        .in('id', expiredRows.map((j) => j.id));
      this.logger.log(`Deleted ${expiredRows.length} expired export jobs`);
    }

    const stuckThreshold = new Date(Date.now() - STUCK_JOB_TIMEOUT_MS).toISOString();
    const { data: stuck } = await this.supabase
      .from('export_jobs')
      .update({
        status: 'failed',
        error_message: 'Job timed out — worker did not finish in the expected time',
        completed_at: new Date().toISOString(),
      })
      .eq('status', 'processing')
      .lt('started_at', stuckThreshold)
      .select('id');

    if (stuck && stuck.length > 0) {
      this.logger.warn(`Marked ${stuck.length} stuck job(s) as failed`);
    }
  }
}
