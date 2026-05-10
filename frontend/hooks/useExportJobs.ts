"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { LexisApi, ExportJob } from "@/lib/api";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import type { Tables } from "@/lib/types/database.types";

type ExportJobRow = Tables<"export_jobs">;

function rowToJob(row: ExportJobRow): ExportJob {
  return {
    id: row.id,
    deck_id: row.deck_id,
    deck_name: row.deck_name,
    status: row.status as ExportJob["status"],
    error_message: row.error_message,
    attempts: row.attempts,
    created_at: row.created_at,
    started_at: row.started_at,
    completed_at: row.completed_at,
    expires_at: row.expires_at,
  };
}

export function useExportJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const hasActive = jobs.some(
    (j) => j.status === "pending" || j.status === "processing",
  );

  const fetchJobs = useCallback(async () => {
    try {
      const data = await LexisApi.getExportJobs();
      setJobs(data);
    } catch {
      // silently fail — user may not be logged in yet
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("export-jobs-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "export_jobs",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newJob = rowToJob(payload.new as ExportJobRow);
            setJobs((prev) =>
              prev.some((j) => j.id === newJob.id) ? prev : [newJob, ...prev],
            );
          } else if (payload.eventType === "UPDATE") {
            const updated = rowToJob(payload.new as ExportJobRow);
            setJobs((prev) =>
              prev.map((j) => (j.id === updated.id ? updated : j)),
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as Partial<ExportJobRow>).id;
            if (deletedId) {
              setJobs((prev) => prev.filter((j) => j.id !== deletedId));
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const enqueue = useCallback(
    async (payload: {
      deckIds: string[];
      templateIds: string[];
      accent: string;
      gender: string;
    }) => {
      setIsLoading(true);
      try {
        const created = await LexisApi.createExportJobs(payload);
        return created;
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to queue export");
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const download = useCallback(async (jobId: string, deckName: string) => {
    try {
      const url = await LexisApi.getExportJobDownloadUrl(jobId);
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${deckName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.apkg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to get download link");
    }
  }, []);

  const remove = useCallback(async (jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    try {
      await LexisApi.deleteExportJob(jobId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove job");
      fetchJobs();
    }
  }, [fetchJobs]);

  return { jobs, isLoading, hasActive, enqueue, download, remove, fetchJobs };
}
