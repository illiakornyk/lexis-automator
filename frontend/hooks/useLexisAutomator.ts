"use client";

import { useWordSearch } from "./useWordSearch";
import { useExampleGeneration } from "./useExampleGeneration";
import { useCardSave } from "./useCardSave";
import { useCardExport } from "./useCardExport";

export function useLexisAutomator() {
  const search = useWordSearch();

  const examples = useExampleGeneration({
    wordData: search.wordData,
    setWordData: search.setWordData,
    selectedDefs: search.selectedDefs,
  });

  const save = useCardSave({
    wordData: search.wordData,
    selectedDefs: search.selectedDefs,
    aiGeneratedIds: examples.aiGeneratedIds,
  });

  const cardExport = useCardExport({
    wordData: search.wordData,
    selectedDefs: search.selectedDefs,
  });

  return {
    ...search,
    ...examples,
    ...save,
    ...cardExport,
  };
}
