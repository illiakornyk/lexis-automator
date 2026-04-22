"use client";

import React, { useState } from "react";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { LexisApi } from "@/lib/api";
import { DictionaryEntry, Meaning } from "@/lib/types";
import { getPosBadgeColor, parseDefId } from "@/lib/utils/dictionary";

import { SearchHeader } from "@/components/SearchHeader";
import { WordHeader } from "@/components/WordHeader";
import { DefinitionCard } from "@/components/DefinitionCard";
import { ExportBar } from "@/components/ExportBar";

export default function LexisAutomatorUI() {
  // --- Core state ---
  const [searchQuery, setSearchQuery] = useState("");
  const [wordData, setWordData] = useState<DictionaryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDefs, setSelectedDefs] = useState<string[]>([]);
  const [generatingExamples, setGeneratingExamples] = useState<Record<string, boolean>>({});

  // --- TTS settings ---
  const [accent, setAccent] = useState("US");
  const [gender, setGender] = useState("FEMALE");

  // --- Card type toggles ---
  const [includeRecognition, setIncludeRecognition] = useState(true);
  const [includeProduction, setIncludeProduction] = useState(false);
  const [includeCloze, setIncludeCloze] = useState(false);
  const [includeTypeIn, setIncludeTypeIn] = useState(false);

  // --- Async action state ---
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // ───────────────────────────── Handlers ─────────────────────────────

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
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch word definition.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateExample = async (defId: string, mIdx: number, dIdx: number, definitionStr: string) => {
    setGeneratingExamples((prev) => ({ ...prev, [defId]: true }));
    try {
      const res = await LexisApi.generateExample(wordData!.word, definitionStr);
      setWordData((prev) => {
        if (!prev) return prev;
        const newData = JSON.parse(JSON.stringify(prev)) as DictionaryEntry;
        newData.meanings[mIdx].definitions[dIdx].example = res.example;
        return newData;
      });
      toast.success("AI Example generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate example.");
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
        setWordData((prev) => {
          if (!prev) return prev;
          const newData = JSON.parse(JSON.stringify(prev)) as DictionaryEntry;
          newData.meanings[item.mIdx].definitions[item.dIdx].example = res.example;
          return newData;
        });
        successCount++;
      } catch (error: any) {
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

  const handleDownload = async () => {
    if (!wordData) return;

    if (!includeRecognition && !includeProduction && !includeCloze && !includeTypeIn) {
      toast.error("Please select at least one card type.");
      return;
    }

    const cards: Array<{ word: string; partOfSpeech: string; phonetic: string; definition: string; example: string }> = [];

    for (const defId of selectedDefs) {
      const { mIdx, dIdx } = parseDefId(defId);
      const meaning = wordData.meanings[mIdx];
      const def = meaning?.definitions[dIdx];
      if (!def) continue;

      if (!def.example) {
        toast.error(`Please generate an example for: "${def.definition.slice(0, 50)}..."`);
        return;
      }

      cards.push({
        word: wordData.word,
        partOfSpeech: meaning.partOfSpeech,
        phonetic: wordData.phonetics?.find((p) => p.text)?.text || "",
        definition: def.definition,
        example: def.example,
      });
    }

    setIsExporting(true);
    try {
      const blob = await LexisApi.exportAnki({
        deckName: `Lexis - ${wordData.word}`,
        cards,
        ttsSettings: { accent, gender },
        includeRecognition,
        includeProduction,
        includeCloze,
        includeTypeIn,
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

  // ───────────────────────────── Render ─────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      <SearchHeader
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        isLoading={isLoading}
      />

      <main className="max-w-4xl mx-auto px-4 md:px-8 space-y-8">
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-6">
            <Skeleton className="h-12 w-48 rounded" />
            <Skeleton className="h-6 w-32 rounded" />
            <div className="space-y-4 pt-4">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !wordData && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <BookOpen className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600">No Word Selected</h3>
            <p className="text-slate-500">Search for a word above to see its definitions.</p>
          </div>
        )}

        {/* Results */}
        {!isLoading && wordData && (
          <>
            <WordHeader word={wordData.word} phonetics={wordData.phonetics} />

            <div className="space-y-8">
              {wordData.meanings.map((meaning: Meaning, mIdx: number) => (
                <section key={`meaning-${mIdx}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="outline" className={`text-sm px-3 py-1 shadow-none ${getPosBadgeColor(meaning.partOfSpeech)}`}>
                      {meaning.partOfSpeech}
                    </Badge>
                    <Separator className="flex-1" />
                  </div>

                  <div className="grid gap-4">
                    {meaning.definitions.map((def, dIdx: number) => {
                      const defId = `${meaning.partOfSpeech}-${mIdx}-${dIdx}`;
                      return (
                        <DefinitionCard
                          key={defId}
                          defId={defId}
                          definition={def.definition}
                          example={def.example}
                          isSelected={selectedDefs.includes(defId)}
                          isGenerating={!!generatingExamples[defId]}
                          onToggleSelection={toggleSelection}
                          onGenerateExample={() => handleGenerateExample(defId, mIdx, dIdx, def.definition)}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </main>

      <ExportBar
        selectedCount={selectedDefs.length}
        missingExamplesCount={missingExamplesCount}
        accent={accent}
        gender={gender}
        onAccentChange={setAccent}
        onGenderChange={setGender}
        includeRecognition={includeRecognition}
        includeProduction={includeProduction}
        includeCloze={includeCloze}
        includeTypeIn={includeTypeIn}
        onRecognitionChange={setIncludeRecognition}
        onProductionChange={setIncludeProduction}
        onClozeChange={setIncludeCloze}
        onTypeInChange={setIncludeTypeIn}
        isExporting={isExporting}
        isGeneratingAll={isGeneratingAll}
        onDownload={handleDownload}
        onGenerateAllMissing={handleGenerateAllMissing}
      />
    </div>
  );
}
