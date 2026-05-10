"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DefinitionCardProps {
  defId: string;
  definition: string;
  example?: string;
  isSelected: boolean;
  isGenerating: boolean;
  isAiGenerated: boolean;
  onToggleSelection: (id: string) => void;
  onGenerateExample: () => void;
}

export function DefinitionCard({
  defId,
  definition,
  example,
  isSelected,
  isGenerating,
  isAiGenerated,
  onToggleSelection,
  onGenerateExample,
}: DefinitionCardProps) {
  return (
    <Card
      className={`transition-all duration-200 cursor-pointer ${isSelected ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/50" : "hover:border-slate-300"}`}
      onClick={() => onToggleSelection(defId)}
    >
      <CardHeader className="py-4">
        <div className="flex items-start gap-4">
          <Checkbox
            id={`check-${defId}`}
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(defId)}
            className="mt-1 h-5 w-5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="grid gap-1.5 flex-1">
            <div className="text-lg font-medium leading-tight">
              {definition}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-0 pb-4 ml-8" onClick={(e) => e.stopPropagation()}>
        {example ? (
          <div className="bg-white border rounded-md p-3 text-sm text-slate-600 mb-3 italic shadow-sm">
            &quot;{example}&quot;
            {isAiGenerated && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-2 not-italic text-[10px] font-medium text-violet-500 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5 align-middle cursor-default">
                    ✦ AI
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  This example was generated with AI
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ) : (
          <div className="bg-slate-100 border border-slate-200 border-dashed rounded-md p-3 text-sm text-slate-500 mb-3">
            No example sentence found in dictionary.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant={example ? "outline" : "default"}
            size="sm"
            className={`h-8 shadow-sm ${example ? "text-slate-600" : "bg-indigo-600 hover:bg-indigo-700"}`}
            onClick={onGenerateExample}
            disabled={isGenerating}
          >
            <RefreshCw className={`mr-2 h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
            {example ? "Regenerate Example" : "AI Generate Example"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
