-- Run this once against your Vercel Postgres database
-- (Vercel dashboard -> Storage -> your Postgres db -> Query tab)

CREATE TABLE IF NOT EXISTS pings (
  id             SERIAL PRIMARY KEY,
  device_id      TEXT NOT NULL,
  device_name    TEXT,
  device_model   TEXT,
  device_brand   TEXT,
  android_ver    TEXT,
  latitude       DOUBLE PRECISION NOT NULL,
  longitude      DOUBLE PRECISION NOT NULL,
  accuracy       DOUBLE PRECISION,
  provider       TEXT,
  battery_pct    INTEGER,
  battery_status TEXT,
  wifi_ssid      TEXT,
  wifi_ip        TEXT,
  wifi_rssi      INTEGER,
  client_ts      TEXT,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pings_device_time
  ON pings (device_id, recorded_at DESC);
