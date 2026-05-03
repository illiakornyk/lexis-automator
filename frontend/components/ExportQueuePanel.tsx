"use client";

import { useState } from "react";
import {
  Download,
  Loader2,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronUp,
  PackageOpen,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportJob } from "@/lib/api";
import { useExportJobsContext } from "@/contexts/ExportJobsContext";
import { cn } from "@/lib/utils";

function StatusIcon({ status }: { status: ExportJob["status"] }) {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4 text-slate-400" />;
    case "processing":
      return <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />;
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "cancelled":
      return <XCircle className="h-4 w-4 text-slate-400" />;
  }
}

function StatusLabel({ status }: { status: ExportJob["status"] }) {
  const map: Record<ExportJob["status"], string> = {
    pending: "Queued",
    processing: "Processing…",
    done: "Ready",
    failed: "Failed",
    cancelled: "Cancelled",
  };
  const colors: Record<ExportJob["status"], string> = {
    pending: "text-slate-500",
    processing: "text-indigo-600",
    done: "text-emerald-600",
    failed: "text-red-600",
    cancelled: "text-slate-400",
  };
  return <span className={cn("text-xs font-medium", colors[status])}>{map[status]}</span>;
}

function JobRow({
  job,
  onDownload,
  onRemove,
}: {
  job: ExportJob;
  onDownload: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-slate-50 transition-colors">
      <StatusIcon status={job.status} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{job.deck_name}</p>
        <StatusLabel status={job.status} />
        {job.status === "failed" && job.error_message && (
          <p className="text-xs text-red-500 truncate mt-0.5">{job.error_message}</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {job.status === "done" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            onClick={() => onDownload(job.id, job.deck_name)}
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        )}
        {(job.status === "done" ||
          job.status === "failed" ||
          job.status === "cancelled") && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-slate-400 hover:text-red-500"
            onClick={() => onRemove(job.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        {(job.status === "pending" || job.status === "processing") && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-slate-400 hover:text-red-500"
            onClick={() => onRemove(job.id)}
            title="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ExportQueuePanel() {
  const { jobs, hasActive, download, remove } = useExportJobsContext();
  const [open, setOpen] = useState(false);

  // Auto-open when new active jobs appear
  const activeCount = jobs.filter(
    (j) => j.status === "pending" || j.status === "processing",
  ).length;
  const doneCount = jobs.filter((j) => j.status === "done").length;

  if (jobs.length === 0) return null;

  const badgeCount = activeCount || doneCount;

  return (
    <div className="fixed bottom-20 right-6 z-50 w-80 shadow-xl rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header — always visible */}
      <button
        className="w-full flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <PackageOpen className="h-4 w-4 shrink-0" />
        <span className="text-sm font-semibold flex-1 text-left">Export Queue</span>
        {badgeCount > 0 && (
          <span className="bg-white text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">
            {badgeCount}
          </span>
        )}
        {hasActive && (
          <RefreshCw className="h-3.5 w-3.5 animate-spin opacity-70" />
        )}
        <ChevronUp
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            open ? "" : "rotate-180",
          )}
        />
      </button>

      {/* Job list */}
      {open && (
        <div className="max-h-72 overflow-y-auto">
          {jobs.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              onDownload={download}
              onRemove={remove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

