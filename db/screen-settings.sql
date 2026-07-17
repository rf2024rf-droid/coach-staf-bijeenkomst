ALTER TABLE public.presentations
  ADD COLUMN IF NOT EXISTS screen_settings_json TEXT;

ALTER TABLE public.presentations
  ADD COLUMN IF NOT EXISTS screen_last_seen_at TEXT;
