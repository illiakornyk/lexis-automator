"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { SavedCard } from '@/lib/types/deck';

export function useDeckCards(deckId: string) {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchCards = useCallback(async () => {
    if (!deckId) {
      setCards([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_cards')
        .select('*')
        .eq('deck_id', deckId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setCards(
        (data || []).map((c) => ({
          id: c.id,
          deckId: c.deck_id,
          word: c.word,
          partOfSpeech: c.part_of_speech,
          phonetic: c.phonetic,
          definition: c.definition,
          example: c.example,
          imagePath: c.image_path ?? null,
          createdAt: c.created_at,
        })),
      );
    } catch (err) {
      console.error('Error loading cards:', err);
    } finally {
      setIsLoading(false);
    }
  }, [deckId, supabase]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const removeCard = async (cardId: string) => {
    const previous = cards;
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    try {
      const { error } = await supabase.from('saved_cards').delete().eq('id', cardId);
      if (error) throw error;
    } catch {
      toast.error('Failed to remove card.');
      setCards(previous);
    }
  };

  const updateCardImage = (cardId: string, imagePath: string | null) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, imagePath } : c)),
    );
  };

  return { cards, isLoading, removeCard, updateCardImage };
}