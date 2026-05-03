"use client";

import { Download, Loader2, Sparkles, BookmarkPlus } from "lucide-react";
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
  onCreateDeck: (name: string) => Promise<void>;
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)]">
      <div className="max-w-4xl mx-auto px-6 py-4">

        {/* Status row */}
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {selectedCount}
          </span>
          <span className="text-sm font-medium text-slate-700">
            definition{selectedCount !== 1 ? "s" : ""} selected
          </span>
        </div>

        {/* Two-zone row */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 sm:divide-x sm:divide-slate-200">

          {/* Zone 1 — Save to Deck */}
          <div className="flex flex-col gap-2 sm:pr-6 sm:w-64 shrink-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
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
                className="shrink-0 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BookmarkPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Zone 2 — Export .apkg */}
          <div className="flex flex-col gap-3 sm:pl-6 flex-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Export as Anki deck
            </p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {/* Templates */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {isLoaded ? (
                  templates.map((t) => (
                    <label key={t.id} className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-600">
                      <Checkbox
                        checked={selectedTemplateIds.includes(t.id)}
                        onCheckedChange={() => onTemplateToggle(t.id)}
                      />
                      {t.name}
                    </label>
                  ))
                ) : (
                  <span className="text-slate-400 text-sm">Loading…</span>
                )}
              </div>

              {/* TTS */}
              <div className="flex items-center gap-1.5">
                <Select value={accent} onValueChange={onAccentChange}>
                  <SelectTrigger className="w-[100px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">American</SelectItem>
                    <SelectItem value="GB">British</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={gender} onValueChange={onGenderChange}>
                  <SelectTrigger className="w-[90px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {missingExamplesCount > 0 && (
                <Button
                  onClick={onGenerateAllMissing}
                  disabled={isGeneratingAll || isExporting}
                  variant="outline"
                  size="sm"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  {isGeneratingAll ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating {missingExamplesCount}…</>
                  ) : (
                    <><Sparkles className="mr-1.5 h-3.5 w-3.5" />Generate {missingExamplesCount} missing</>
                  )}
                </Button>
              )}
              <Button
                onClick={onDownload}
                disabled={isExporting || isGeneratingAll}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 ml-auto"
              >
                {isExporting ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating…</>
                ) : (
                  <><Download className="mr-1.5 h-3.5 w-3.5" />Download .apkg</>
                )}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
