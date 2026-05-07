"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface DefinitionCardProps {
  defId: string;
  definition: string;
  example?: string;
  isSelected: boolean;
  isGenerating: boolean;
  onToggleSelection: (id: string) => void;
  onGenerateExample: () => void;
}

export function DefinitionCard({
  defId,
  definition,
  example,
  isSelected,
  isGenerating,
  onToggleSelection,
  onGenerateExample,
}: DefinitionCardProps) {
  return (
    <Card
      className={`transition-all duration-200 cursor-pointer ${
        isSelected
          ? "border-amber-500 ring-1 ring-amber-500 bg-amber-50"
          : "bg-white border-stone-200 hover:border-stone-400"
      }`}
      onClick={() => onToggleSelection(defId)}
    >
      <CardHeader className="py-4">
        <div className="flex items-start gap-4">
          <Checkbox
            id={`check-${defId}`}
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(defId)}
            className="mt-1 h-5 w-5 border-stone-400 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="grid gap-1.5 flex-1">
            <div className="text-base font-medium leading-snug text-stone-900">
              {definition}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-0 pb-4 ml-8" onClick={(e) => e.stopPropagation()}>
        {example ? (
          <div className="bg-stone-100 border border-stone-200 rounded-md p-3 text-sm text-stone-600 mb-3 italic">
            &quot;{example}&quot;
          </div>
        ) : (
          <div className="bg-stone-100/60 border border-stone-200 rounded-md p-3 text-sm text-stone-300 mb-3 italic select-none">
            No dictionary example
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant={example ? "outline" : "default"}
            size="sm"
            className={`h-8 ${
              example
                ? "border-stone-300 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
                : "bg-amber-500 hover:bg-amber-400 text-white font-medium"
            }`}
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
