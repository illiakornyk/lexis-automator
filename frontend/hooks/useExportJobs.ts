"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { LexisApi, ExportJob } from "@/lib/api";
import { toast } from "sonner";

const POLL_INTERVAL = 4000;

export function useExportJobs() {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Poll while jobs are active
  useEffect(() => {
    if (hasActive) {
      pollRef.current = setInterval(fetchJobs, POLL_INTERVAL);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [hasActive, fetchJobs]);

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
        setJobs((prev) => [...created, ...prev]);
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
    try {
      await LexisApi.deleteExportJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove job");
    }
  }, []);

  return { jobs, isLoading, hasActive, enqueue, download, remove, fetchJobs };
}
