CREATE TABLE IF NOT EXISTS carpool_sources (
 dashboard_id text PRIMARY KEY CHECK (dashboard_id ~ '^[A-Za-z0-9_-]+$'),
 source_id text NOT NULL CHECK (source_id ~ '^[A-Za-z0-9_-]+$'),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS carpool_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK (id),
 year_folder_id text NOT NULL,
 passengers_name_range text NOT NULL,
 migration_complete boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS carpool_operations (
 operation_key text PRIMARY KEY,
 status text NOT NULL CHECK (status IN ('pending', 'complete')),
 owner_token uuid,
 result jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 CHECK ((status = 'pending' AND result IS NULL) OR (status = 'complete' AND result IS NOT NULL))
);
