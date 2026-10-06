-- Team app: the schedule (ADR 0030, docs/team-app-data-model.md). Training repeats (series → sessions);
-- tournaments are scheduled one by one under a type; anything else is a one-off club event. Fees, sign-ups and
-- the register come in their own migrations.

CREATE TABLE training_series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  -- The phone tab label, e.g. Friday
  short_name TEXT NOT NULL,
  icon TEXT NOT NULL,
  tone TEXT NOT NULL,
  -- Every N weeks on these days (mon,fri), from starts_on to ends_on (null: ongoing)
  repeat_every INTEGER NOT NULL DEFAULT 1,
  weekdays TEXT NOT NULL,
  starts_on TEXT NOT NULL,
  ends_on TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  venue TEXT NOT NULL DEFAULT '',
  -- Places for skaters, and separately for goalies; null: no limit
  capacity INTEGER,
  goalie_capacity INTEGER,
  signup_closes_mins INTEGER,
  -- Listed on the website calendar
  public INTEGER NOT NULL DEFAULT 1,
  -- 0: paused, no new sessions
  active INTEGER NOT NULL DEFAULT 1
);

-- One night of a series, made ahead of time so it can be cancelled, moved or changed on its own.
-- Null fields follow the series.
CREATE TABLE training_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id INTEGER NOT NULL REFERENCES training_series (id),
  held_on TEXT NOT NULL,
  moved_from TEXT,
  start_time TEXT,
  end_time TEXT,
  venue TEXT,
  capacity INTEGER,
  goalie_capacity INTEGER,
  note TEXT,
  cancelled_at TEXT,
  register_closed_at TEXT,
  UNIQUE (series_id, held_on)
);
CREATE INDEX training_sessions_held_on ON training_sessions (held_on);

CREATE TABLE tournament_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  icon TEXT NOT NULL,
  tone TEXT NOT NULL,
  -- round_robin
  format TEXT NOT NULL DEFAULT 'round_robin',
  points_win INTEGER NOT NULL DEFAULT 3,
  points_draw INTEGER NOT NULL DEFAULT 1,
  points_loss INTEGER NOT NULL DEFAULT 0,
  game_minutes INTEGER NOT NULL DEFAULT 12,
  -- 1: captains draft the teams
  draft INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  -- Copied onto each new edition, where it can be changed (ADR 0032)
  default_fee_pence INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_id INTEGER NOT NULL REFERENCES tournament_types (id),
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  held_on TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  capacity INTEGER,
  -- planned, open, live, finished
  status TEXT NOT NULL DEFAULT 'planned',
  champions TEXT,
  fee_pence INTEGER NOT NULL DEFAULT 0,
  public INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX tournaments_held_on ON tournaments (held_on);

CREATE TABLE club_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  venue TEXT NOT NULL DEFAULT '',
  public INTEGER NOT NULL DEFAULT 0,
  signup_enabled INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER
);
CREATE INDEX club_events_starts_at ON club_events (starts_at);

-- Friday Training: every Friday. Admins cancel the odd one (Christmas, Easter) in Settings → Training.
INSERT INTO training_series
  (slug, name, short_name, icon, tone, repeat_every, weekdays, starts_on, start_time, end_time, venue, capacity,
   goalie_capacity, public, active)
VALUES
  ('friday', 'Friday Training', 'Friday', 'stick', 'blue', 1, 'fri', '2026-10-09', '19:30', '21:30',
   'Battersea Sports Centre', 21, 3, 1, 1);

-- The Kumite: no editions scheduled yet.
INSERT INTO tournament_types
  (slug, name, short_name, icon, tone, format, points_win, points_draw, points_loss, game_minutes, draft, active)
VALUES ('kumite', 'The Cougars Kumite', 'Kumite', 'swords', 'red', 'round_robin', 3, 1, 0, 12, 1, 1);
