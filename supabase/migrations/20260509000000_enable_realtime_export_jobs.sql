DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'export_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE export_jobs;
  END IF;
END;
$$;
