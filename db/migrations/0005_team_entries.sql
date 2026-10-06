-- Team app: who's in (docs/team-app-data-model.md, T2). One row per person per session, tournament or club event,
-- made when they answer, when an admin adds them, or when the register ticks a walk-in. Not answering is no row.
-- Order is first come, first served: by signed_up_at, then id.

-- Training sessions: the sign-up and the register on the night
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES training_sessions (id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  -- in / waitlist / out
  signup TEXT NOT NULL,
  signed_up_at TEXT NOT NULL,
  -- From the register: NULL not recorded (a sign-up is expected), 1 came, 0 no-show
  attended INTEGER,
  -- Came without signing up; the register added them
  walk_in INTEGER NOT NULL DEFAULT 0,
  recorded_by INTEGER REFERENCES members (id),
  recorded_at TEXT,
  UNIQUE (session_id, member_id)
);
CREATE INDEX attendance_member ON attendance (member_id);

CREATE TABLE tournament_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL REFERENCES tournaments (id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  -- in / waitlist / out
  signup TEXT NOT NULL,
  signed_up_at TEXT NOT NULL,
  attended INTEGER,
  UNIQUE (tournament_id, member_id)
);
CREATE INDEX tournament_entries_member ON tournament_entries (member_id);

CREATE TABLE club_event_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES club_events (id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  -- in / waitlist / out
  signup TEXT NOT NULL,
  signed_up_at TEXT NOT NULL,
  UNIQUE (event_id, member_id)
);
CREATE INDEX club_event_entries_member ON club_event_entries (member_id);
