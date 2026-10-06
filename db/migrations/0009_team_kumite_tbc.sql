-- Team app: a tournament's date can be unconfirmed ("Date TBC"): it still has a date, which only decides where it
-- sorts. And the first Cougars Kumite on the calendar, summer 2027, date to be confirmed. No location or fee yet.

ALTER TABLE tournaments ADD COLUMN date_confirmed INTEGER NOT NULL DEFAULT 1;

INSERT INTO tournaments (type_id, name, location, held_on, start_time, end_time, capacity, status, fee_pence,
                         date_confirmed)
SELECT id, 'The Cougars Kumite', '', '2027-06-12', '11:00', '16:00', NULL, 'planned', default_fee_pence, 0
FROM tournament_types WHERE slug = 'kumite'
  AND NOT EXISTS (SELECT 1 FROM tournaments t WHERE t.type_id = tournament_types.id);
