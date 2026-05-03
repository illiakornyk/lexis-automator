-- export_jobs table
CREATE TABLE IF NOT EXISTS public.export_jobs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id       UUID        REFERENCES public.decks(id) ON DELETE SET NULL,
  deck_name     TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'processing', 'done', 'failed', 'cancelled')),
  template_ids  TEXT[]      NOT NULL DEFAULT '{}',
  accent        TEXT        NOT NULL DEFAULT 'US',
  gender        TEXT        NOT NULL DEFAULT 'FEMALE',
  file_path     TEXT,
  error_message TEXT,
  attempts      INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days'
);

CREATE INDEX IF NOT EXISTS export_jobs_user_status_idx ON public.export_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS export_jobs_expires_idx     ON public.export_jobs(expires_at);

ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own export jobs"
  ON public.export_jobs FOR SELECT
  USING (auth.uid() = user_id);

GRANT ALL ON public.export_jobs TO service_role;
GRANT ALL ON public.export_jobs TO authenticated;

-- exports storage bucket (private, 100 MB per file)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('exports', 'exports', false, 104857600)
ON CONFLICT (id) DO NOTHING;
