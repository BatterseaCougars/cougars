-- "Try a session" / join-the-club interest form submissions.
-- Conventions: see db/README.md (snake_case, ISO-8601 *_at text, additive only).
CREATE TABLE enquiries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  experience  TEXT,          -- never | some | regular
  message     TEXT,
  source      TEXT,          -- page path the form was submitted from
  status      TEXT NOT NULL DEFAULT 'new',  -- new | contacted | joined | closed
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX enquiries_created_at ON enquiries (created_at);
