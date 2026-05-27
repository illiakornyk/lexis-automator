"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { LexisApi } from "@/lib/api";
import type { DictionaryEntry } from "@/lib/types/dictionary";

function readSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeSession(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function useWordSearch() {
  const [searchQuery, setSearchQuery] = useState<string>(() =>
    readSession<string>('lexis:searchQuery', ''),
  );
  const [submittedQuery, setSubmittedQuery] = useState<string>(() =>
    readSession<string>('lexis:submittedQuery', ''),
  );
  const [wordData, setWordData] = useState<DictionaryEntry | null>(() =>
    readSession<DictionaryEntry | null>('lexis:wordData', null),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDefs, setSelectedDefs] = useState<string[]>(() =>
    readSession<string[]>('lexis:selectedDefs', []),
  );

  useEffect(() => {
    writeSession('lexis:searchQuery', searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    writeSession('lexis:submittedQuery', submittedQuery);
  }, [submittedQuery]);

  useEffect(() => {
    writeSession('lexis:wordData', wordData);
  }, [wordData]);

  useEffect(() => {
    writeSession('lexis:selectedDefs', selectedDefs);
  }, [selectedDefs]);

  const toggleSelection = (id: string) => {
    setSelectedDefs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedDefs([]);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setWordData(null);
    setSelectedDefs([]);
    setSubmittedQuery(searchQuery.trim());

    try {
      const data = await LexisApi.getDefinition(searchQuery.trim());
      if (data && data.length > 0) {
        setWordData(data[0]);
      } else {
        toast.error("No definitions found for this word.");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch word definition.");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    submittedQuery,
    wordData,
    setWordData,
    isLoading,
    selectedDefs,
    setSelectedDefs,
    toggleSelection,
    clearSelection,
    handleSearch,
  };
}
