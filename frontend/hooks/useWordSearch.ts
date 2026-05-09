"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LexisApi } from "@/lib/api";
import type { DictionaryEntry } from "@/lib/types/dictionary";

export function useWordSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [wordData, setWordData] = useState<DictionaryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDefs, setSelectedDefs] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelectedDefs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setWordData(null);
    setSelectedDefs([]);

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
    wordData,
    setWordData,
    isLoading,
    selectedDefs,
    setSelectedDefs,
    toggleSelection,
    handleSearch,
  };
}
