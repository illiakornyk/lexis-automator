-- Add Vault key reference for Google TTS to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS google_tts_key_id uuid;

-- ── RPC: upsert the user's Google TTS key in Vault (called from the frontend) ──
CREATE OR REPLACE FUNCTION public.upsert_google_tts_key(key_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  uid uuid := auth.uid();
  existing_key_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT google_tts_key_id INTO existing_key_id FROM public.profiles WHERE id = uid;

  IF existing_key_id IS NULL THEN
    SELECT vault.create_secret(key_value, 'google_tts_key_' || uid::text) INTO existing_key_id;
    UPDATE public.profiles
      SET google_tts_key_id = existing_key_id,
          updated_at = now()
      WHERE id = uid;
  ELSE
    PERFORM vault.update_secret(existing_key_id, key_value);
  END IF;
END;
$$;

-- ── RPC: delete the user's Google TTS key from Vault (called from the frontend) ──
CREATE OR REPLACE FUNCTION public.delete_google_tts_key()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  uid uuid := auth.uid();
  existing_key_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT google_tts_key_id INTO existing_key_id FROM public.profiles WHERE id = uid;

  IF existing_key_id IS NOT NULL THEN
    UPDATE public.profiles
      SET google_tts_key_id = NULL,
          updated_at = now()
      WHERE id = uid;
    DELETE FROM vault.secrets WHERE id = existing_key_id;
  END IF;
END;
$$;

-- ── RPC: fetch decrypted key by user ID (backend service_role only) ─────────────
CREATE OR REPLACE FUNCTION public.get_user_google_tts_key(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  key_id uuid;
  decrypted text;
BEGIN
  SELECT google_tts_key_id INTO key_id FROM public.profiles WHERE id = p_user_id;
  IF key_id IS NULL THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO decrypted FROM vault.decrypted_secrets WHERE id = key_id;
  RETURN decrypted;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.upsert_google_tts_key(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_google_tts_key() TO authenticated;
-- get_user_google_tts_key is for the backend service_role only
REVOKE EXECUTE ON FUNCTION public.get_user_google_tts_key(uuid) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_google_tts_key(uuid) TO service_role;
