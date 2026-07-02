-- Swim carpool schema (idempotent)

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  secret_slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  home_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, name)
);

CREATE TABLE IF NOT EXISTS recurring_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL DEFAULT '05:45',
  end_time TIME NOT NULL DEFAULT '08:15',
  location_name TEXT NOT NULL DEFAULT 'Main Pool',
  cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (team_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '05:45',
  end_time TIME NOT NULL DEFAULT '08:15',
  location_name TEXT NOT NULL DEFAULT 'Main Pool',
  location_notes TEXT,
  cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, session_date)
);

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('dropoff', 'pickup')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, role)
);

CREATE INDEX IF NOT EXISTS idx_families_team ON families(team_id);
CREATE INDEX IF NOT EXISTS idx_sessions_team_date ON practice_sessions(team_id, session_date);
CREATE INDEX IF NOT EXISTS idx_templates_team ON recurring_templates(team_id);
CREATE INDEX IF NOT EXISTS idx_assignments_session ON assignments(session_id);

CREATE TABLE IF NOT EXISTS saved_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, name)
);

CREATE INDEX IF NOT EXISTS idx_saved_locations_team ON saved_locations(team_id);

ALTER TABLE saved_locations ADD COLUMN IF NOT EXISTS address TEXT;
