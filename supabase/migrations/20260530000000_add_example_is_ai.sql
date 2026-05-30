-- Track whether a card's example sentence was AI-generated (vs. from the dictionary).
ALTER TABLE public.saved_cards
  ADD COLUMN IF NOT EXISTS example_is_ai BOOLEAN NOT NULL DEFAULT false;
