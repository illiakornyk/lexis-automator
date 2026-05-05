"use client";

import { Loader2, Sparkles, BookmarkPlus, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomTemplate } from "@/hooks/useTemplates";
import { DeckCombobox } from "@/components/DeckCombobox";
import { Deck } from "@/lib/types/deck";

interface ExportBarProps {
  selectedCount: number;
  missingExamplesCount: number;
  accent: string;
  gender: string;
  onAccentChange: (value: string) => void;
  onGenderChange: (value: string) => void;
  templates: CustomTemplate[];
  isLoaded: boolean;
  selectedTemplateIds: string[];
  onTemplateToggle: (id: string) => void;
  isExporting: boolean;
  isGeneratingAll: boolean;
  onDownload: () => void;
  onGenerateAllMissing: () => void;
  decks: Deck[];
  decksLoading: boolean;
  selectedDeckId: string | null;
  onSelectDeck: (id: string) => void;
  onCreateDeck: (name: string) => Promise<string | null>;
  isSaving: boolean;
  onSaveToDeck: () => void;
}

export function ExportBar({
  selectedCount,
  missingExamplesCount,
  accent,
  gender,
  onAccentChange,
  onGenderChange,
  templates,
  isLoaded,
  selectedTemplateIds,
  onTemplateToggle,
  isExporting,
  isGeneratingAll,
  onDownload,
  onGenerateAllMissing,
  decks,
  decksLoading,
  selectedDeckId,
  onSelectDeck,
  onCreateDeck,
  isSaving,
  onSaveToDeck,
}: ExportBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-stone-50 border-t border-stone-200 shadow-[0_-4px_24px_-8px_rgba(120,100,60,0.12)]">
      <div className="max-w-4xl mx-auto px-6 py-4">

        {/* Status row */}
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {selectedCount}
          </span>
          <span className="text-sm font-medium text-stone-700">
            definition{selectedCount !== 1 ? "s" : ""} selected
          </span>
        </div>

        {/* Three-zone row */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 sm:divide-x sm:divide-stone-200">

          {/* Zone 1 — Save to Deck */}
          <div className="flex flex-col gap-2 sm:pr-6 sm:w-56 shrink-0">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
              Save to deck
            </p>
            <div className="flex items-center gap-2">
              <DeckCombobox
                decks={decks}
                selectedDeckId={selectedDeckId}
                onSelectDeck={onSelectDeck}
                onCreateDeck={onCreateDeck}
                isLoading={decksLoading}
              />
              <Button
                onClick={onSaveToDeck}
                disabled={isSaving || !selectedDeckId}
                size="sm"
                variant="outline"
                className="shrink-0 border-stone-300 text-stone-600 hover:bg-stone-100"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BookmarkPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Zone 2 — Card types */}
          <div className="flex flex-col gap-2 sm:px-6 shrink-0">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
              Card types
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {isLoaded ? (
                templates.map((t) => (
                  <label key={t.id} className="flex items-center gap-1.5 cursor-pointer text-sm text-stone-600 select-none">
                    <Checkbox
                      checked={selectedTemplateIds.includes(t.id)}
                      onCheckedChange={() => onTemplateToggle(t.id)}
                      className="border-stone-400 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                    {t.name}
                  </label>
                ))
              ) : (
                <span className="text-stone-400 text-sm">Loading…</span>
              )}
            </div>
          </div>

          {/* Zone 3 — Voice + Export */}
          <div className="flex flex-col gap-2 sm:pl-6 sm:min-w-[340px] flex-1">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
              Voice and examples
            </p>
            <div className="flex items-center gap-1.5">
              <Select value={accent} onValueChange={onAccentChange}>
                <SelectTrigger className="flex-1 h-9 text-sm border-stone-300 bg-white text-stone-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">🇺🇸 American</SelectItem>
                  <SelectItem value="GB">🇬🇧 British</SelectItem>
                </SelectContent>
              </Select>
              <Select value={gender} onValueChange={onGenderChange}>
                <SelectTrigger className="flex-1 h-9 text-sm border-stone-300 bg-white text-stone-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FEMALE">♀ Female</SelectItem>
                  <SelectItem value="MALE">♂ Male</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            {missingExamplesCount > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-xs text-stone-400">
                  AI-generate missing example sentences for selected cards
                </p>
                <Button
                  onClick={onGenerateAllMissing}
                  disabled={isGeneratingAll || isExporting}
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  {isGeneratingAll ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating {missingExamplesCount}…</>
                  ) : (
                    <><Sparkles className="mr-1.5 h-3.5 w-3.5" />Generate {missingExamplesCount} missing</>
                  )}
                </Button>
              </div>
            )}
            <Button
              onClick={onDownload}
              disabled={isExporting || isGeneratingAll || selectedTemplateIds.length === 0 || !selectedDeckId}
              className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-white font-medium"
              title={!selectedDeckId ? "Select a deck first" : undefined}
            >
              {isExporting ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Exporting…</>
              ) : (
                <><ListPlus className="mr-1.5 h-4 w-4" />Export to Anki</>
              )}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
