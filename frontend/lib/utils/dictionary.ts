/**
 * Returns Tailwind classes for color-coding part-of-speech badges.
 */
export function getPosBadgeColor(pos: string, dark = false): string {
  if (dark) {
    switch (pos.toLowerCase()) {
      case "noun":       return "bg-blue-950 text-blue-300 border-blue-800";
      case "verb":       return "bg-emerald-950 text-emerald-300 border-emerald-800";
      case "adjective":  return "bg-amber-950 text-amber-300 border-amber-800";
      case "adverb":     return "bg-purple-950 text-purple-300 border-purple-800";
      default:           return "bg-zinc-800 text-zinc-300 border-zinc-600";
    }
  }
  switch (pos.toLowerCase()) {
    case "noun":       return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200";
    case "verb":       return "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200";
    case "adjective":  return "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200";
    case "adverb":     return "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200";
    default:           return "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200";
  }
}

/**
 * Parses a definition ID string (e.g., "noun-0-2") into its meaning and definition indices.
 */
export function parseDefId(defId: string): { mIdx: number; dIdx: number } {
  const parts = defId.split("-");
  return {
    mIdx: parseInt(parts[parts.length - 2]),
    dIdx: parseInt(parts[parts.length - 1]),
  };
}
