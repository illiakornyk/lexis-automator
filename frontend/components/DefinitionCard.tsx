"use client";

import React from "react";
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
    <Card className={`transition-all duration-200 ${isSelected ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/50" : "hover:border-slate-300"}`}>
      <CardHeader className="py-4">
        <div className="flex items-start gap-4">
          <Checkbox
            id={`check-${defId}`}
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(defId)}
            className="mt-1"
          />
          <div className="grid gap-1.5 flex-1">
            <label htmlFor={`check-${defId}`} className="text-lg font-medium leading-tight cursor-pointer">
              {definition}
            </label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-0 pb-4 ml-8">
        {example ? (
          <div className="bg-white border rounded-md p-3 text-sm text-slate-600 mb-3 italic shadow-sm">
            &quot;{example}&quot;
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
