"use client";

import { createContext, useContext, ReactNode } from "react";
import { useExportJobs } from "@/hooks/useExportJobs";

type ExportJobsContextType = ReturnType<typeof useExportJobs>;

const ExportJobsContext = createContext<ExportJobsContextType | null>(null);

export function ExportJobsProvider({ children }: { children: ReactNode }) {
  const value = useExportJobs();
  return (
    <ExportJobsContext.Provider value={value}>
      {children}
    </ExportJobsContext.Provider>
  );
}

export function useExportJobsContext(): ExportJobsContextType {
  const ctx = useContext(ExportJobsContext);
  if (!ctx) throw new Error("useExportJobsContext must be used inside ExportJobsProvider");
  return ctx;
}
