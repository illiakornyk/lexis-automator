"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { Deck } from '@/lib/types/deck';

export function useDecks() {
  const { user, isLoading: authLoading } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchDecks = useCallback(async () => {
    if (!user) {
      setDecks([]);
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('decks')
        .select('*, saved_cards(count)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      type DeckRow = { id: string; name: string; created_at: string; saved_cards: { count: number }[] };
      setDecks(
        ((data || []) as DeckRow[]).map((d) => ({
          id: d.id,
          name: d.name,
          cardCount: d.saved_cards[0]?.count ?? 0,
          createdAt: d.created_at,
        })),
      );
    } catch (err) {
      console.error('Error loading decks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (authLoading) return;
    fetchDecks();
  }, [authLoading, fetchDecks]);

  const createDeck = async (name: string): Promise<Deck | null> => {
    if (!user) return null;
    if (decks.length >= 15) {
      toast.error('Maximum of 15 decks reached.');
      return null;
    }
    const trimmed = name.trim().slice(0, 50);
    if (!trimmed) return null;

    try {
      const { data, error } = await supabase
        .from('decks')
        .insert({ user_id: user.id, name: trimmed })
        .select()
        .single();
      if (error) throw error;
      const newDeck: Deck = { id: data.id, name: data.name, cardCount: 0, createdAt: data.created_at };
      setDecks((prev) => [newDeck, ...prev]);
      return newDeck;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create deck.');
      return null;
    }
  };

  const renameDeck = async (id: string, name: string) => {
    const trimmed = name.trim().slice(0, 50);
    if (!trimmed) return;
    const previous = decks;
    setDecks((prev) => prev.map((d) => (d.id === id ? { ...d, name: trimmed } : d)));
    try {
      const { error } = await supabase
        .from('decks')
        .update({ name: trimmed, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    } catch {
      toast.error('Failed to rename deck.');
      setDecks(previous);
    }
  };

  const deleteDeck = async (id: string) => {
    const previous = decks;
    setDecks((prev) => prev.filter((d) => d.id !== id));
    try {
      const { error } = await supabase.from('decks').delete().eq('id', id);
      if (error) throw error;
    } catch {
      toast.error('Failed to delete deck.');
      setDecks(previous);
    }
  };

  const incrementCardCount = (deckId: string, by: number) => {
    setDecks((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, cardCount: d.cardCount + by } : d)),
    );
  };

  return { decks, isLoading, createDeck, renameDeck, deleteDeck, incrementCardCount, refetch: fetchDecks };
}