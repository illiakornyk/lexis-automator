"use client";

import { useState, useEffect } from "react";
import type React from "react";
import { toast } from "sonner";
import { LexisApi } from "@/lib/api";
import type { DictionaryEntry } from "@/lib/types/dictionary";
import { parseDefId } from "@/lib/utils/dictionary";

interface Props {
  wordData: DictionaryEntry | null;
  setWordData: React.Dispatch<React.SetStateAction<DictionaryEntry | null>>;
  selectedDefs: string[];
}

export function useExampleGeneration({ wordData, setWordData, selectedDefs }: Props) {
  const [generatingExamples, setGeneratingExamples] = useState<Record<string, boolean>>({});
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [aiGeneratedIds, setAiGeneratedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!wordData) setAiGeneratedIds(new Set());
  }, [wordData]);

  const updateExample = (mIdx: number, dIdx: number, example: string) => {
    setWordData((prev) => {
      if (!prev) return prev;
      const newData = JSON.parse(JSON.stringify(prev)) as DictionaryEntry;
      newData.meanings[mIdx].definitions[dIdx].example = example;
      return newData;
    });
  };

  const handleGenerateExample = async (
    defId: string,
    mIdx: number,
    dIdx: number,
    definitionStr: string,
  ) => {
    setGeneratingExamples((prev) => ({ ...prev, [defId]: true }));
    try {
      const res = await LexisApi.generateExample(wordData!.word, definitionStr);
      updateExample(mIdx, dIdx, res.example);
      setAiGeneratedIds((prev) => new Set([...prev, defId]));
      toast.success("AI Example generated successfully!");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to generate example.");
    } finally {
      setGeneratingExamples((prev) => ({ ...prev, [defId]: false }));
    }
  };

  const handleGenerateAllMissing = async () => {
    if (!wordData) return;

    const missing: Array<{ defId: string; mIdx: number; dIdx: number; definition: string }> = [];
    for (const defId of selectedDefs) {
      const { mIdx, dIdx } = parseDefId(defId);
      const def = wordData.meanings[mIdx]?.definitions[dIdx];
      if (def && !def.example) {
        missing.push({ defId, mIdx, dIdx, definition: def.definition });
      }
    }

    if (missing.length === 0) {
      toast.info("All selected definitions already have examples!");
      return;
    }

    setIsGeneratingAll(true);
    let successCount = 0;

    for (const item of missing) {
      setGeneratingExamples((prev) => ({ ...prev, [item.defId]: true }));
      try {
        const res = await LexisApi.generateExample(wordData.word, item.definition);
        updateExample(item.mIdx, item.dIdx, res.example);
        setAiGeneratedIds((prev) => new Set([...prev, item.defId]));
        successCount++;
      } catch {
        toast.error(`Failed to generate example for: "${item.definition.slice(0, 40)}..."`);
      } finally {
        setGeneratingExamples((prev) => ({ ...prev, [item.defId]: false }));
      }
    }

    setIsGeneratingAll(false);
    if (successCount > 0) {
      toast.success(`Generated ${successCount} example${successCount > 1 ? "s" : ""} successfully!`);
    }
  };

  const missingExamplesCount = wordData
    ? selectedDefs.filter((defId) => {
        const { mIdx, dIdx } = parseDefId(defId);
        const def = wordData.meanings[mIdx]?.definitions[dIdx];
        return def && !def.example;
      }).length
    : 0;

  return {
    generatingExamples,
    isGeneratingAll,
    aiGeneratedIds,
    missingExamplesCount,
    handleGenerateExample,
    handleGenerateAllMissing,
  };
}
