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
import { LexisAutomatorProvider, useLexisAutomatorContext } from "@/contexts/LexisAutomatorContext";

function LexisAutomatorUI() {
  const [collapsedPos, setCollapsedPos] = useState<Set<string>>(new Set());

  const {
    searchQuery,
    setSearchQuery,
    wordData,
    isLoading,
    selectedDefs,
    generatingExamples,
    aiGeneratedIds,
    toggleSelection,
    handleSearch,
    handleGenerateExample,
  } = useLexisAutomatorContext();

  const toggleCollapse = (pos: string) => {
    setCollapsedPos((prev) => {
      const next = new Set(prev);
      if (next.has(pos)) next.delete(pos);
      else next.add(pos);
      return next;
    });
  };

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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      <SearchHeader
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        isLoading={isLoading}
      />

      <main className="max-w-4xl mx-auto px-4 md:px-8 space-y-8">
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

        {!isLoading && !wordData && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <BookOpen className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600">No Word Selected</h3>
            <p className="text-slate-500">Search for a word above to see its definitions.</p>
          </div>
        )}

        {!isLoading && wordData && (
          <>
            <WordHeader word={wordData.word} phonetics={wordData.phonetics} />
            <p className="text-xs text-slate-400 -mt-6">
              Source:{" "}
              <a
                href={`https://en.wiktionary.org/wiki/${encodeURIComponent(wordData.word)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-slate-600 transition-colors"
              >
                Wiktionary
              </a>
            </p>

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
                      <Separator className="flex-1" />
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
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
                            isAiGenerated={aiGeneratedIds.has(defId)}
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

      <ExportBar />
    </div>
  );
}

export default function LexisAutomatorPage() {
  return (
    <LexisAutomatorProvider>
      <LexisAutomatorUI />
    </LexisAutomatorProvider>
  );
}
