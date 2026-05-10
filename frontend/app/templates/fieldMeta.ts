import type { FieldType } from "@/lib/types/template";

export const FIELD_EMOJI: Record<FieldType, string> = {
  Word:        "🔤",
  PartOfSpeech:"🏷️",
  Phonetic:    "🗣️",
  Definition:  "📖",
  Example:     "💬",
  Audio:       "🔊",
  Image:       "🖼️",
  TypeIn:      "⌨️",
  Cloze:       "🕳️",
};

export const MAX_FIELDS_PER_SIDE = 8;
