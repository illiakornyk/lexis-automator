"use client";

import { Download, Globe, Loader2, Sparkles, BookmarkPlus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeckCombobox } from "@/components/DeckCombobox";
import { useLexisAutomatorContext } from "@/contexts/LexisAutomatorContext";

export function ExportBar() {
  const {
    selectedDefs,
    missingExamplesCount,
    accent,
    setAccent,
    gender,
    setGender,
    templates,
    isLoaded,
    selectedTemplateIds,
    toggleTemplateId,
    isExporting,
    isGeneratingAll,
    handleDownload,
    handleGenerateAllMissing,
    decks,
    decksLoading,
    selectedDeckId,
    setSelectedDeckId,
    isSaving,
    createDeck,
    handleSaveToDeck,
  } = useLexisAutomatorContext();

  const selectedCount = selectedDefs.length;

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)]">
      <div className="max-w-4xl mx-auto px-6 py-4">

        <div className="flex items-center gap-2 mb-4">
          <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {selectedCount}
          </span>
          <span className="text-sm font-medium text-slate-700">
            definition{selectedCount !== 1 ? "s" : ""} selected
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 sm:divide-x sm:divide-slate-200">

          {/* Zone 1 — Save to Deck */}
          <div className="flex flex-col gap-2 sm:pr-6 sm:w-64 shrink-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Save to deck</p>
            <div className="flex items-center gap-2">
              <DeckCombobox
                decks={decks}
                selectedDeckId={selectedDeckId}
                onSelectDeck={setSelectedDeckId}
                onCreateDeck={async (name) => { await createDeck(name); }}
                isLoading={decksLoading}
              />
              <Button
                onClick={handleSaveToDeck}
                disabled={isSaving || !selectedDeckId}
                size="sm"
                variant="outline"
                className="shrink-0 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Zone 2 — Card Templates */}
          <div className="flex flex-col gap-2 sm:px-6 flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Card templates</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 items-start">
              {isLoaded ? (
                templates.length > 0 ? (
                  templates.map((t) => (
                    <label key={t.id} className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-600">
                      <Checkbox
                        checked={selectedTemplateIds.includes(t.id)}
                        onCheckedChange={() => toggleTemplateId(t.id)}
                      />
                      {t.name}
                    </label>
                  ))
                ) : (
                  <span className="text-slate-400 text-sm col-span-2">No templates</span>
                )
              ) : (
                <span className="text-slate-400 text-sm col-span-2">Loading…</span>
              )}
            </div>
          </div>

          {/* Zone 3 — Voice */}
          <div className="flex flex-col gap-2 sm:px-6 shrink-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Voice</p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <Select value={accent} onValueChange={setAccent}>
                  <SelectTrigger className="w-[110px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">American</SelectItem>
                    <SelectItem value="GB">British</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="w-[110px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Zone 4 — Export Actions */}
          <div className="flex flex-col gap-2 sm:pl-6 shrink-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Export</p>
            <div className="flex flex-col gap-2">
              {missingExamplesCount > 0 && (
                <Button
                  onClick={handleGenerateAllMissing}
                  disabled={isGeneratingAll || isExporting}
                  variant="outline"
                  className="h-10 border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  {isGeneratingAll ? (
                    <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Generating {missingExamplesCount}…</>
                  ) : (
                    <><Sparkles className="mr-1.5 h-4 w-4" />Generate {missingExamplesCount} missing</>
                  )}
                </Button>
              )}
              <Button
                onClick={handleDownload}
                disabled={isExporting || isGeneratingAll}
                className="h-10 bg-indigo-600 hover:bg-indigo-700"
              >
                {isExporting ? (
                  <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Queuing…</>
                ) : (
                  <><Download className="mr-1.5 h-4 w-4" />Export to Anki</>
                )}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
