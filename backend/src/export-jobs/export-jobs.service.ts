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

    const created: Database['public']['Tables']['export_jobs']['Row'][] = [];

    for (const deckId of dto.deckIds) {
      const deckName = deckMap.get(deckId);
      if (!deckName) continue;

      const { data: job, error } = await this.supabase
        .from('export_jobs')
        .insert({
          user_id: userId,
          deck_id: deckId,
          deck_name: deckName,
          status: 'pending',
          template_ids: dto.templateIds,
          accent: dto.accent,
          gender: dto.gender,
        })
        .select()
        .single();

      if (error || !job) {
        this.logger.error(
          `Failed to create job for deck ${deckId}: ${error?.message}`,
        );
        continue;
      }

      await this.queue.add(
        'process',
        { jobId: job.id },
        { attempts: 3, backoff: { type: 'exponential', delay: 10000 } },
      );

      created.push(job);
    }

    return created;
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
      .select()
      .single();
    return data;
  }

  async markDone(jobId: string, filePath: string) {
    await this.supabase
      .from('export_jobs')
      .update({
        status: 'done',
        file_path: filePath,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  async markFailed(jobId: string, errorMessage: string) {
    await this.supabase
      .from('export_jobs')
      .update({ status: 'failed', error_message: errorMessage })
      .eq('id', jobId);
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
    await this.supabase
      .from('export_jobs')
      .update({ status: 'pending', started_at: null })
      .eq('status', 'processing')
      .lt('started_at', stuckThreshold);
  }
}
