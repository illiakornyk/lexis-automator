"use client";

import { Loader2, Pencil, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ExampleActions({
  isGenerating,
  onRegenerate,
  onEdit,
  onClear,
}: {
  isGenerating: boolean;
  onRegenerate: () => void;
  onEdit: () => void;
  onClear: () => void;
}) {
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
            disabled={isGenerating}
            onClick={onRegenerate}
          >
            {isGenerating
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />
            }
          </Button>
        </TooltipTrigger>
        <TooltipContent>Generate a new example sentence</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
            disabled={isGenerating}
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Write your own example</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
            disabled={isGenerating}
            onClick={onClear}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Clear this example</TooltipContent>
      </Tooltip>
    </>
  );
}
