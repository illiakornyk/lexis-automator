-- Enable Vault extension (already enabled on Supabase hosted, safe to re-run)
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- Add Vault key reference and provider to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_key_id uuid,
  ADD COLUMN IF NOT EXISTS ai_provider text;

-- Migrate existing plain-text keys into Vault.
-- Guarded: only runs if the legacy column still exists (it may already be dropped
-- on environments where this migration was partially applied manually).
DO $$
DECLARE
  rec record;
  new_key_id uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'openai_api_key'
  ) THEN
    FOR rec IN
      SELECT id, openai_api_key FROM public.profiles WHERE openai_api_key IS NOT NULL
    LOOP
      SELECT vault.create_secret(rec.openai_api_key, 'ai_key_' || rec.id::text)
        INTO new_key_id;
      UPDATE public.profiles
        SET ai_key_id = new_key_id,
            ai_provider = 'openai'
        WHERE id = rec.id;
    END LOOP;
  END IF;
END;
$$;

-- Drop the plain-text column now that data is migrated
ALTER TABLE public.profiles DROP COLUMN IF EXISTS openai_api_key;

-- ── RPC: upsert the user's AI key in Vault (called from the frontend) ──────────
CREATE OR REPLACE FUNCTION public.upsert_ai_key(key_value text, key_provider text DEFAULT 'openai')
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

  SELECT ai_key_id INTO existing_key_id FROM public.profiles WHERE id = uid;

  IF existing_key_id IS NULL THEN
    SELECT vault.create_secret(key_value, 'ai_key_' || uid::text) INTO existing_key_id;
    UPDATE public.profiles
      SET ai_key_id = existing_key_id,
          ai_provider = key_provider,
          updated_at = now()
      WHERE id = uid;
  ELSE
    PERFORM vault.update_secret(existing_key_id, key_value);
    UPDATE public.profiles
      SET ai_provider = key_provider,
          updated_at = now()
      WHERE id = uid;
  END IF;
END;
$$;

-- ── RPC: delete the user's AI key from Vault (called from the frontend) ─────────
CREATE OR REPLACE FUNCTION public.delete_ai_key()
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

  SELECT ai_key_id INTO existing_key_id FROM public.profiles WHERE id = uid;

  IF existing_key_id IS NOT NULL THEN
    UPDATE public.profiles
      SET ai_key_id = NULL,
          ai_provider = NULL,
          updated_at = now()
      WHERE id = uid;
    DELETE FROM vault.secrets WHERE id = existing_key_id;
  END IF;
END;
$$;

-- ── RPC: fetch decrypted key by user ID (backend service_role only) ─────────────
CREATE OR REPLACE FUNCTION public.get_user_ai_key(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  key_id uuid;
  decrypted text;
BEGIN
  SELECT ai_key_id INTO key_id FROM public.profiles WHERE id = p_user_id;
  IF key_id IS NULL THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO decrypted FROM vault.decrypted_secrets WHERE id = key_id;
  RETURN decrypted;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.upsert_ai_key(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_ai_key() TO authenticated;
-- get_user_ai_key is for the backend service_role only
REVOKE EXECUTE ON FUNCTION public.get_user_ai_key(uuid) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_ai_key(uuid) TO service_role;
