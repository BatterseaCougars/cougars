-- Team app: one-off club events get what the website shows (ADR 0042). A short description, and a cancelled time:
-- cancelling keeps the row, so whoever said they're in can see it's off. `public` already exists (shown on the
-- website); the app now asks for it, on by default.
ALTER TABLE club_events ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE club_events ADD COLUMN cancelled_at TEXT;
