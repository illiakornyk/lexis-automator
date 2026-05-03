"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LexisApi } from "@/lib/api";
import { DictionaryEntry } from "@/lib/types";
import { parseDefId } from "@/lib/utils/dictionary";
import { useTemplates } from "./useTemplates";
import { useProfile } from "./useProfile";
import { compileToAnkiHtml } from "@/lib/utils/ankiCompiler";
import { useDecks } from "./useDecks";
import { useSaveToDecks, CardToSave } from "./useSaveToDecks";

export function useLexisAutomator() {
  // --- Core state ---
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [wordData, setWordData] = useState<DictionaryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDefs, setSelectedDefs] = useState<string[]>([]);
  const [generatingExamples, setGeneratingExamples] = useState<Record<string, boolean>>({});

  // --- TTS settings ---
  const { profile, isLoading: profileLoading } = useProfile();
  const [accent, setAccent] = useState("US");
  const [gender, setGender] = useState("FEMALE");
  const [hasInitializedProfile, setHasInitializedProfile] = useState(false);

  useEffect(() => {
    if (!profileLoading && !hasInitializedProfile) {
      setAccent(profile.default_tts_accent);
      setGender(profile.default_tts_gender);
      setHasInitializedProfile(true);
    }
  }, [profile, profileLoading, hasInitializedProfile]);

  // --- Card type toggles ---
  const { templates, isLoaded } = useTemplates();
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(['default-recognition']);

  // Handle default selection when templates load
  useEffect(() => {
    if (isLoaded && selectedTemplateIds.length === 0 && templates.length > 0) {
      setSelectedTemplateIds([templates[0].id]);
    }
  }, [isLoaded, templates, selectedTemplateIds]);

  // --- Deck state ---
  const { decks, isLoading: decksLoading, createDeck, incrementCardCount } = useDecks();
  const { saveCards } = useSaveToDecks();
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- Async action state ---
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // ───────────────────────────── Helpers ─────────────────────────────

  const toastGenerateError = (error: any) => {
    const msg: string = error?.message ?? "";
    if (msg.includes("401") || /api key/i.test(msg)) {
      toast.error("Invalid API key", {
        description: "Your OpenAI API key is incorrect or missing. Update it in Settings.",
      });
    } else {
      toast.error(msg || "Failed to generate example.");
    }
  };

  /** Immutably updates a single example within the wordData tree. */
  const updateExample = (mIdx: number, dIdx: number, example: string) => {
    setWordData((prev) => {
      if (!prev) return prev;
      const newData = JSON.parse(JSON.stringify(prev)) as DictionaryEntry;
      newData.meanings[mIdx].definitions[dIdx].example = example;
      return newData;
    });
  };

  // ───────────────────────────── Handlers ─────────────────────────────

  const toggleSelection = (id: string) => {
    setSelectedDefs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedDefs([]);

  const handleSearch = async () => {
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
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch word definition.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateExample = async (
    defId: string,
    mIdx: number,
    dIdx: number,
    definitionStr: string,
  ) => {
    setGeneratingExamples((prev) => ({ ...prev, [defId]: true }));
    try {
      const res = await LexisApi.generateExample(wordData!.word, definitionStr, profile.openai_api_key);
      updateExample(mIdx, dIdx, res.example);
      toast.success("AI Example generated successfully!");
    } catch (error: any) {
      toastGenerateError(error);
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
        const res = await LexisApi.generateExample(wordData.word, item.definition, profile.openai_api_key);
        updateExample(item.mIdx, item.dIdx, res.example);
        successCount++;
      } catch (error: any) {
        toastGenerateError(error);
      } finally {
        setGeneratingExamples((prev) => ({ ...prev, [item.defId]: false }));
      }
    }

    setIsGeneratingAll(false);
    if (successCount > 0) {
      toast.success(`Generated ${successCount} example${successCount > 1 ? "s" : ""} successfully!`);
    }
  };

  const handleSaveToDeck = async () => {
    if (!wordData || !selectedDeckId) return;
    const deck = decks.find((d) => d.id === selectedDeckId);
    if (!deck) return;

    const cards: CardToSave[] = [];
    for (const defId of selectedDefs) {
      const { mIdx, dIdx } = parseDefId(defId);
      const meaning = wordData.meanings[mIdx];
      const def = meaning?.definitions[dIdx];
      if (!def) continue;
      cards.push({
        word: wordData.word,
        partOfSpeech: meaning.partOfSpeech,
        phonetic: wordData.phonetics?.find((p) => p.text)?.text || "",
        definition: def.definition,
        example: def.example || "",
      });
    }

    setIsSaving(true);
    const success = await saveCards(selectedDeckId, deck.cardCount, cards);
    if (success) incrementCardCount(selectedDeckId, cards.length);
    setIsSaving(false);
  };

  const handleQueueExport = async (enqueue: (payload: { deckIds: string[]; templateIds: string[]; accent: string; gender: string }) => Promise<any>) => {
    if (!wordData || !selectedDeckId || selectedTemplateIds.length === 0) return;
    const deck = decks.find((d) => d.id === selectedDeckId);
    if (!deck) return;

    const cards: CardToSave[] = [];
    for (const defId of selectedDefs) {
      const { mIdx, dIdx } = parseDefId(defId);
      const meaning = wordData.meanings[mIdx];
      const def = meaning?.definitions[dIdx];
      if (!def) continue;
      cards.push({
        word: wordData.word,
        partOfSpeech: meaning.partOfSpeech,
        phonetic: wordData.phonetics?.find((p) => p.text)?.text || "",
        definition: def.definition,
        example: def.example || "",
      });
    }

    setIsSaving(true);
    try {
      await saveCards(selectedDeckId, deck.cardCount, cards);
      await enqueue({ deckIds: [selectedDeckId], templateIds: selectedTemplateIds, accent, gender });
      toast.success("Added to export queue!");
    } catch {
      toast.error("Failed to queue export.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!wordData) return;

    if (selectedTemplateIds.length === 0) {
      toast.error("Please select at least one card template.");
      return;
    }

    const activeTemplates = templates.filter((t) => selectedTemplateIds.includes(t.id));
    const compiledTemplates = activeTemplates.map(compileToAnkiHtml);

    const cards: Array<{
      word: string;
      partOfSpeech: string;
      phonetic: string;
      definition: string;
      example: string;
    }> = [];

    for (const defId of selectedDefs) {
      const { mIdx, dIdx } = parseDefId(defId);
      const meaning = wordData.meanings[mIdx];
      const def = meaning?.definitions[dIdx];
      if (!def) continue;

      cards.push({
        word: wordData.word,
        partOfSpeech: meaning.partOfSpeech,
        phonetic: wordData.phonetics?.find((p) => p.text)?.text || "",
        definition: def.definition,
        example: def.example || "",
      });
    }

    setIsExporting(true);
    try {
      const blob = await LexisApi.exportAnki({
        deckName: `Lexis - ${wordData.word}`,
        cards,
        ttsSettings: { accent, gender },
        templates: compiledTemplates,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lexis_${wordData.word}.apkg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Anki deck downloaded successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to export Anki deck.");
    } finally {
      setIsExporting(false);
    }
  };

  // ───────────────────────────── Derived state ─────────────────────────────

  const missingExamplesCount = wordData
    ? selectedDefs.filter((defId) => {
        const { mIdx, dIdx } = parseDefId(defId);
        const def = wordData.meanings[mIdx]?.definitions[dIdx];
        return def && !def.example;
      }).length
    : 0;

  return {
    // State
    searchQuery,
    setSearchQuery,
    submittedQuery,
    wordData,
    isLoading,
    selectedDefs,
    generatingExamples,
    accent,
    setAccent,
    gender,
    setGender,
    templates,
    isLoaded,
    selectedTemplateIds,
    setSelectedTemplateIds,
    isExporting,
    isGeneratingAll,
    missingExamplesCount,

    // Deck state
    decks,
    decksLoading,
    selectedDeckId,
    setSelectedDeckId,
    isSaving,
    createDeck,

    // Handlers
    toggleSelection,
    clearSelection,
    handleQueueExport,
    handleSearch,
    handleGenerateExample,
    handleGenerateAllMissing,
    handleDownload,
    handleSaveToDeck,
  };
}
