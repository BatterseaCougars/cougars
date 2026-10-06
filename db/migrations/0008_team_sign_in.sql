-- Team app: sign-in (ADR 0023, ADR 0035). An emailed code, good only in the browser that asked, then a session.
-- Every secret here is stored as a SHA-256 hash: a copy of the database signs nobody in.

-- One sign-in attempt: the code emailed, and the nonce cookie set in the browser that asked for it
CREATE TABLE login_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  nonce_hash TEXT NOT NULL,
  -- Wrong codes so far; at 5 the challenge is spent
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX login_challenges_nonce ON login_challenges (nonce_hash);
CREATE INDEX login_challenges_member ON login_challenges (member_id, created_at);

-- A signed-in device. The cookie holds the token; an admin signs someone out by revoking their rows.
CREATE TABLE auth_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  -- "code" (later "google"), and the browser, so a member can tell their devices apart
  method TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX auth_sessions_member ON auth_sessions (member_id);

-- Who did what: sign-ins, sign-outs, access requests. Detail is JSON; never a code, token or cookie.
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  member_id INTEGER REFERENCES members (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX audit_log_at ON audit_log (at);
