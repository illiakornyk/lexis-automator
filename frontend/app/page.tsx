"use client";

import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Meaning } from "@/lib/types";
import { getPosBadgeColor } from "@/lib/utils/dictionary";

import { SearchHeader } from "@/components/SearchHeader";
import { WordHeader } from "@/components/WordHeader";
import { DefinitionCard } from "@/components/DefinitionCard";
import { ExportBar } from "@/components/ExportBar";
import { useLexisAutomator } from "@/hooks/useLexisAutomator";

export default function LexisAutomatorUI() {
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
    includeRecognition,
    setIncludeRecognition,
    includeProduction,
    setIncludeProduction,
    includeCloze,
    setIncludeCloze,
    includeTypeIn,
    setIncludeTypeIn,
    isExporting,
    isGeneratingAll,
    missingExamplesCount,
    toggleSelection,
    handleSearch,
    handleGenerateExample,
    handleGenerateAllMissing,
    handleDownload,
  } = useLexisAutomator();

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
