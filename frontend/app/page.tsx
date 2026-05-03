"use client";

import { useState, useMemo, useEffect } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getPosBadgeColor } from "@/lib/utils/dictionary";

import { SearchHeader } from "@/components/SearchHeader";
import { WordHeader } from "@/components/WordHeader";
import { DefinitionCard } from "@/components/DefinitionCard";
import { ExportBar } from "@/components/ExportBar";
import { useLexisAutomator } from "@/hooks/useLexisAutomator";

export default function LexisAutomatorUI() {
  const [collapsedPos, setCollapsedPos] = useState<Set<string>>(new Set());

  const toggleCollapse = (pos: string) => {
    setCollapsedPos((prev) => {
      const next = new Set(prev);
      if (next.has(pos)) next.delete(pos);
      else next.add(pos);
      return next;
    });
  };

  const {
    searchQuery,
    setSearchQuery,
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
    toggleSelection,
    handleSearch,
    handleGenerateExample,
    handleGenerateAllMissing,
    handleDownload,
    decks,
    decksLoading,
    selectedDeckId,
    setSelectedDeckId,
    isSaving,
    createDeck,
    handleSaveToDeck,
  } = useLexisAutomator();

  const groupedMeanings = useMemo(() => {
    if (!wordData) return new Map<string, Array<{ def: { definition: string; example?: string }; defId: string; mIdx: number; dIdx: number }>>();
    const map = new Map<string, Array<{ def: { definition: string; example?: string }; defId: string; mIdx: number; dIdx: number }>>();
    wordData.meanings.forEach((meaning, mIdx) => {
      const pos = meaning.partOfSpeech;
      if (!map.has(pos)) map.set(pos, []);
      meaning.definitions.forEach((def, dIdx) => {
        map.get(pos)!.push({ def, defId: `${pos}-${mIdx}-${dIdx}`, mIdx, dIdx });
      });
    });
    return map;
  }, [wordData]);

  useEffect(() => {
    setCollapsedPos(new Set());
  }, [wordData?.word]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-32">
      <SearchHeader
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={() => handleSearch()}
        isLoading={isLoading}
      />

      <main className="max-w-4xl mx-auto px-4 md:px-8 space-y-8">
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-6">
            <Skeleton className="h-12 w-48 rounded bg-stone-200" />
            <Skeleton className="h-6 w-32 rounded bg-stone-200" />
            <div className="space-y-4 pt-4">
              <Skeleton className="h-40 w-full rounded-xl bg-stone-200" />
              <Skeleton className="h-40 w-full rounded-xl bg-stone-200" />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !wordData && (
          <div className="text-center py-20 bg-stone-100/80 rounded-2xl border border-dashed border-stone-300">
            <BookOpen className="mx-auto h-12 w-12 text-stone-400 mb-4" />
            <h3 className="text-lg font-medium text-stone-500">No Word Selected</h3>
            <p className="text-stone-400">Search for a word above to see its definitions.</p>
          </div>
        )}

        {/* Results */}
        {!isLoading && wordData && (
          <>
            <WordHeader word={wordData.word} phonetics={wordData.phonetics} />

            <div className="space-y-8">
              {Array.from(groupedMeanings.entries()).map(([pos, items]) => {
                const isCollapsed = collapsedPos.has(pos);
                return (
                  <section key={pos}>
                    <button
                      className="flex items-center gap-3 mb-4 w-full text-left group"
                      onClick={() => toggleCollapse(pos)}
                    >
                      <Badge variant="outline" className={`text-sm px-3 py-1 shadow-none ${getPosBadgeColor(pos)}`}>
                        {pos}
                      </Badge>
                      <Separator className="flex-1 bg-stone-300" />
                      <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
                    </button>

                    {!isCollapsed && (
                      <div className="grid gap-4">
                        {items.map(({ def, defId, mIdx, dIdx }) => (
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
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
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
        templates={templates}
        isLoaded={isLoaded}
        selectedTemplateIds={selectedTemplateIds}
        onTemplateToggle={(id) => {
          setSelectedTemplateIds((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
          );
        }}
        isExporting={isExporting}
        isGeneratingAll={isGeneratingAll}
        onDownload={handleDownload}
        onGenerateAllMissing={handleGenerateAllMissing}
        decks={decks}
        decksLoading={decksLoading}
        selectedDeckId={selectedDeckId}
        onSelectDeck={setSelectedDeckId}
        onCreateDeck={async (name) => { await createDeck(name); }}
        isSaving={isSaving}
        onSaveToDeck={handleSaveToDeck}
      />
    </div>
  );
}
