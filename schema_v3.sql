-- Run in Vercel's Postgres query editor, one statement at a time.

CREATE TABLE IF NOT EXISTS photos (
  id           TEXT PRIMARY KEY,
  device_id    TEXT NOT NULL,
  image_data   TEXT NOT NULL,
  captured_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photos_device ON photos (device_id);
