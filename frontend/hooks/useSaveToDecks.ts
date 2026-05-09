"use client";

import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import type { CardToSave } from '@/lib/types/card';

export function useSaveToDecks() {
  const { user } = useAuth();
  const supabase = createClient();

  const saveCards = async (
    deckId: string,
    deckCardCount: number,
    cards: CardToSave[],
  ): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to save cards.');
      return false;
    }
    if (deckCardCount + cards.length > 50) {
      toast.error(`This deck can only hold ${50 - deckCardCount} more card(s).`);
      return false;
    }

    const { data: existing } = await supabase
      .from('saved_cards')
      .select('word, definition')
      .eq('deck_id', deckId);

    const existingSet = new Set(
      (existing || []).map((c) => `${c.word}::${c.definition}`),
    );
    const duplicateCount = cards.filter((c) =>
      existingSet.has(`${c.word}::${c.definition}`),
    ).length;

    if (duplicateCount > 0) {
      toast.warning(`${duplicateCount} duplicate(s) found — saving anyway.`);
    }

    const rows = cards.map((c) => ({
      user_id: user.id,
      deck_id: deckId,
      word: c.word,
      part_of_speech: c.partOfSpeech,
      phonetic: c.phonetic || null,
      definition: c.definition,
      example: c.example || null,
    }));

    const { error } = await supabase.from('saved_cards').insert(rows);
    if (error) {
      toast.error(error.message || 'Failed to save cards.');
      return false;
    }

    toast.success(`${cards.length} card(s) saved to deck!`);
    return true;
  };

  return { saveCards };
}