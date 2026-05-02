-- Add image_path column to saved_cards
ALTER TABLE public.saved_cards
  ADD COLUMN image_path TEXT;

-- Grant UPDATE so the backend (service_role) can set image_path
-- Authenticated users get UPDATE too so the RLS policy below applies
GRANT UPDATE ON public.saved_cards TO authenticated;
GRANT UPDATE ON public.saved_cards TO service_role;

-- RLS policy: users can update only their own cards (e.g. to clear image_path client-side if needed)
CREATE POLICY "Users can update own saved cards" ON public.saved_cards
  FOR UPDATE USING (auth.uid() = user_id);

-- Create private storage bucket for card images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'card-images',
    'card-images',
    false,
    1048576,  -- 1 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
  )
  ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can manage only their own folder ({userId}/*)
CREATE POLICY "Users can upload own images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'card-images'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'card-images'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'card-images'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'card-images'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );
