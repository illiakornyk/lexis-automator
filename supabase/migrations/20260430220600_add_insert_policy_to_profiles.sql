-- Add INSERT policy so users can upsert their profile if it is missing
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
