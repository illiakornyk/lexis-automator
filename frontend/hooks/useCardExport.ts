"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LexisApi } from "@/lib/api";
import type { DictionaryEntry } from "@/lib/types/dictionary";
import { parseDefId } from "@/lib/utils/dictionary";
import { useTemplates } from "./useTemplates";
import { useProfile } from "./useProfile";
import { compileToAnkiHtml } from "@/lib/utils/ankiCompiler";

interface Props {
  wordData: DictionaryEntry | null;
  selectedDefs: string[];
}

export function useCardExport({ wordData, selectedDefs }: Props) {
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

  const { templates, isLoaded } = useTemplates();
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(["default-recognition"]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (isLoaded && selectedTemplateIds.length === 0 && templates.length > 0) {
      setSelectedTemplateIds([templates[0].id]);
    }
  }, [isLoaded, templates, selectedTemplateIds]);

  const toggleTemplateId = (id: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to export Anki deck.");
    } finally {
      setIsExporting(false);
    }
  };

  return {
    templates,
    isLoaded,
    selectedTemplateIds,
    setSelectedTemplateIds,
    toggleTemplateId,
    accent,
    setAccent,
    gender,
    setGender,
    isExporting,
    handleDownload,
  };
}
