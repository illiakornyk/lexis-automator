-- Create decks table
CREATE TABLE public.decks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.decks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decks TO service_role;

CREATE POLICY "Users can view own decks" ON public.decks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own decks" ON public.decks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own decks" ON public.decks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own decks" ON public.decks
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_decks_user_id ON public.decks(user_id);

CREATE OR REPLACE FUNCTION public.check_deck_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.decks WHERE user_id = NEW.user_id) >= 15 THEN
    RAISE EXCEPTION 'Maximum deck limit (15) reached';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_deck_limit
  BEFORE INSERT ON public.decks
  FOR EACH ROW EXECUTE FUNCTION public.check_deck_limit();

-- Create saved_cards table
CREATE TABLE public.saved_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  part_of_speech TEXT NOT NULL,
  phonetic TEXT,
  definition TEXT NOT NULL,
  example TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.saved_cards TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.saved_cards TO service_role;

CREATE POLICY "Users can view own saved cards" ON public.saved_cards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved cards" ON public.saved_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved cards" ON public.saved_cards
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_saved_cards_deck_id ON public.saved_cards(deck_id);
CREATE INDEX idx_saved_cards_user_id ON public.saved_cards(user_id);

CREATE OR REPLACE FUNCTION public.check_card_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.saved_cards WHERE deck_id = NEW.deck_id) >= 50 THEN
    RAISE EXCEPTION 'Maximum card limit (50) per deck reached';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_card_limit
  BEFORE INSERT ON public.saved_cards
  FOR EACH ROW EXECUTE FUNCTION public.check_card_limit();