CREATE OR REPLACE FUNCTION public.check_deck_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.decks WHERE user_id = NEW.user_id) >= 15 THEN
    RAISE EXCEPTION 'Maximum deck limit (15) reached';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_card_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.saved_cards WHERE deck_id = NEW.deck_id) >= 50 THEN
    RAISE EXCEPTION 'Maximum card limit (50) per deck reached';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;