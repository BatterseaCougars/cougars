-- Team app: the rest of what lived only in the browser (docs/team-app-data-model.md). Published teams for a session
-- (T3), Home's quips and greetings, a member's bio, and quarterly memberships (ADR 0034).

-- Teams for a session, as published by an admin. Publishing again replaces them.
CREATE TABLE session_teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES training_sessions (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Display order
  position INTEGER NOT NULL DEFAULT 0,
  published_at TEXT NOT NULL,
  published_by INTEGER REFERENCES members (id)
);
CREATE INDEX session_teams_session ON session_teams (session_id);

CREATE TABLE session_team_players (
  team_id INTEGER NOT NULL REFERENCES session_teams (id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, member_id)
);
CREATE INDEX session_team_players_member ON session_team_players (member_id);

-- What Home says (lib/quips.ts QUIP_KINDS): replies (ask, in, waitlist, out) and greetings (morning, afternoon,
-- evening, late, training, nag). Admins edit them in Settings → Quips. Club banter, not personal data.
CREATE TABLE quips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  text TEXT NOT NULL
);
CREATE INDEX quips_kind ON quips (kind);

-- A line or two about yourself, on the back of your player card
ALTER TABLE members ADD COLUMN bio TEXT NOT NULL DEFAULT '';

-- Quarterly Members (ADR 0034): a member is one while a subscription covers the date. ends_on null: still going.
CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  starts_on TEXT NOT NULL,
  ends_on TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX subscriptions_member ON subscriptions (member_id);

-- The starting quips
INSERT INTO quips (kind, text) VALUES
  ('ask', 'If you ain''t first, you last.'),
  ('ask', 'Well? We haven''t got all night.'),
  ('ask', 'Skates on or excuses ready?'),
  ('ask', 'In or out. It''s not a hard one.'),
  ('ask', 'Your public awaits. Allegedly.'),
  ('ask', 'Commitment issues? It''s one button.'),
  ('ask', 'Neither in nor out. Very you.'),
  ('ask', 'Still deciding? The puck won''t wait.'),
  ('in', 'Shake and bake.'),
  ('in', 'Good. Bring your legs.'),
  ('in', 'Bold. Stretch first.'),
  ('in', 'In. Try to stay upright this time.'),
  ('in', 'Lovely. Someone has to lose the faceoffs.'),
  ('in', 'Brave. Pads on, ego off.'),
  ('in', 'Noted. Pass it occasionally.'),
  ('in', 'Right answer. Took you long enough.'),
  ('in', 'In. The bar''s low. Clear it.'),
  ('waitlist', 'Full house. Someone always bottles it.'),
  ('waitlist', 'Bench for now. Keep it warm.'),
  ('waitlist', 'Waitlist. Start hoping for traffic.'),
  ('waitlist', 'Queued. Stretch anyway, optimist.'),
  ('waitlist', 'Full. Should''ve been quicker.'),
  ('out', 'If you ain''t first, you last.'),
  ('out', 'Noted. Your spot''s going to someone faster.'),
  ('out', 'Fine. More puck for us.'),
  ('out', 'Cool. We''ll say you were scared.'),
  ('out', 'Out? Bold of you to think we''d notice.'),
  ('out', 'Rest up, princess.'),
  ('out', 'Shame. Said no one.'),
  ('out', 'Your loss. Literally, on the scoreboard.'),
  ('morning', 'Up and at ''em, {name}'),
  ('morning', 'Rise and grind, {name}'),
  ('morning', 'Early doors, {name}'),
  ('morning', 'Morning, {name}. Stretch.'),
  ('afternoon', 'Well, well. {name}.'),
  ('afternoon', 'Skiving, {name}?'),
  ('afternoon', 'Look who it is. {name}.'),
  ('afternoon', 'Shouldn''t you be working, {name}?'),
  ('evening', 'Evening, {name}'),
  ('evening', 'Still standing, {name}?'),
  ('evening', 'Legs fresh, {name}?'),
  ('evening', 'Night shift, {name}?'),
  ('late', 'Can''t sleep, {name}?'),
  ('late', 'Go to bed, {name}'),
  ('late', 'Bit late, {name}'),
  ('training', 'Lace up, {name}'),
  ('training', 'Skates on tonight, {name}'),
  ('training', 'Tonight''s the night, {name}'),
  ('training', 'Game face, {name}'),
  ('nag', '{nth} look today, {name}. Touch grass.'),
  ('nag', '{nth} visit. It''s not changing, {name}.'),
  ('nag', 'Refreshing won''t make it {day}, {name}'),
  ('nag', '{nth} time today. Go outside, {name}.'),
  ('nag', 'Again, {name}? {nth} today.');
