"use client";

import React from "react";
import { Download, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ExportBarProps {
  selectedCount: number;
  missingExamplesCount: number;

  // TTS settings
  accent: string;
  gender: string;
  onAccentChange: (value: string) => void;
  onGenderChange: (value: string) => void;

  // Card type toggles
  includeRecognition: boolean;
  includeProduction: boolean;
  includeCloze: boolean;
  includeTypeIn: boolean;
  onRecognitionChange: (value: boolean) => void;
  onProductionChange: (value: boolean) => void;
  onClozeChange: (value: boolean) => void;
  onTypeInChange: (value: boolean) => void;

  // Actions
  isExporting: boolean;
  isGeneratingAll: boolean;
  onDownload: () => void;
  onGenerateAllMissing: () => void;
}

export function ExportBar({
  selectedCount,
  missingExamplesCount,
  accent,
  gender,
  onAccentChange,
  onGenderChange,
  includeRecognition,
  includeProduction,
  includeCloze,
  includeTypeIn,
  onRecognitionChange,
  onProductionChange,
  onClozeChange,
  onTypeInChange,
  isExporting,
  isGeneratingAll,
  onDownload,
  onGenerateAllMissing,
}: ExportBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50">
      <div className="max-w-4xl mx-auto flex flex-col gap-3">
        {/* Top row: Selected count + TTS Settings */}
        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
          <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-bold shrink-0">
            {selectedCount} Selected
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline">TTS:</span>
          <Select value={accent} onValueChange={onAccentChange}>
            <SelectTrigger className="w-[110px] h-9">
              <SelectValue placeholder="Accent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="US">American</SelectItem>
              <SelectItem value="GB">British</SelectItem>
            </SelectContent>
          </Select>
          <Select value={gender} onValueChange={onGenderChange}>
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="MALE">Male</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bottom row: Card type toggles + Action buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-slate-500 font-medium">Card Types:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox checked={includeRecognition} onCheckedChange={(v) => onRecognitionChange(!!v)} />
              <span className="text-slate-700">Recognition</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox checked={includeProduction} onCheckedChange={(v) => onProductionChange(!!v)} />
              <span className="text-slate-700">Production</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox checked={includeCloze} onCheckedChange={(v) => onClozeChange(!!v)} />
              <span className="text-slate-700">Cloze</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox checked={includeTypeIn} onCheckedChange={(v) => onTypeInChange(!!v)} />
              <span className="text-slate-700">Type-In</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {missingExamplesCount > 0 && (
              <Button
                onClick={onGenerateAllMissing}
                disabled={isGeneratingAll || isExporting}
                variant="outline"
                className="flex-1 md:flex-none h-10 px-4 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                {isGeneratingAll ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating {missingExamplesCount}...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Generate {missingExamplesCount} Missing Example{missingExamplesCount > 1 ? "s" : ""}</>
                )}
              </Button>
            )}

            <Button
              onClick={onDownload}
              disabled={isExporting || isGeneratingAll}
              className="flex-1 md:flex-none h-10 px-8 bg-indigo-600 hover:bg-indigo-700 shadow-md"
            >
              {isExporting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Download Anki Deck</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
