-- Tournament dates get their details (ADR 0046): a type's default location, which a date uses unless it has its own;
-- when sign-up closes; and, for a drafted type, the draft day and the captains in pick order.
ALTER TABLE tournament_types ADD COLUMN location TEXT NOT NULL DEFAULT '';
-- The last day members can say they're in (London); null: up to the day itself
ALTER TABLE tournaments ADD COLUMN signup_closes_on TEXT;
ALTER TABLE tournaments ADD COLUMN draft_on TEXT;
ALTER TABLE tournaments ADD COLUMN draft_time TEXT;

CREATE TABLE tournament_captains (
  tournament_id INTEGER NOT NULL REFERENCES tournaments (id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  -- Pick order in the draft, from 1
  pick INTEGER NOT NULL,
  PRIMARY KEY (tournament_id, member_id)
);

-- The Kumite is at the sports centre, like Fridays; a date that said so itself now just uses the default
UPDATE tournament_types SET location = 'Battersea Sports Centre' WHERE slug = 'kumite';
UPDATE tournaments SET location = '' WHERE location = 'Battersea Sports Centre'
  AND type_id = (SELECT id FROM tournament_types WHERE slug = 'kumite');
