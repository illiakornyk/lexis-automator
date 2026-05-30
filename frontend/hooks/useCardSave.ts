"use client";

import { useState } from "react";
import { useDecks } from "./useDecks";
import { useSaveToDecks } from "./useSaveToDecks";
import { parseDefId } from "@/lib/utils/dictionary";
import type { DictionaryEntry } from "@/lib/types/dictionary";
import type { CardToSave } from "@/lib/types/card";

interface Props {
  wordData: DictionaryEntry | null;
  selectedDefs: string[];
  aiGeneratedIds: Set<string>;
}

export function useCardSave({ wordData, selectedDefs, aiGeneratedIds }: Props) {
  const { decks, isLoading: decksLoading, createDeck, incrementCardCount } = useDecks();
  const { saveCards } = useSaveToDecks();
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToDeck = async () => {
    if (!wordData || !selectedDeckId) return;
    const deck = decks.find((d) => d.id === selectedDeckId);
    if (!deck) return;

    const cards: CardToSave[] = [];
    for (const defId of selectedDefs) {
      const { mIdx, dIdx } = parseDefId(defId);
      const meaning = wordData.meanings[mIdx];
      const def = meaning?.definitions[dIdx];
      if (!def) continue;
      cards.push({
        word: wordData.word,
        partOfSpeech: meaning.partOfSpeech,
        phonetic: wordData.phonetics?.find((p) => p.text)?.text || "",
        definition: def.definition,
        example: def.example || "",
        exampleIsAi: aiGeneratedIds.has(defId),
      });
    }

    setIsSaving(true);
    const success = await saveCards(selectedDeckId, deck.cardCount, cards);
    if (success) incrementCardCount(selectedDeckId, cards.length);
    setIsSaving(false);
  };

  return {
    decks,
    decksLoading,
    selectedDeckId,
    setSelectedDeckId,
    isSaving,
    createDeck,
    handleSaveToDeck,
  };
}
