-- Team app: a tournament type's awards (ADR 0044), set in its editor and shown on the website: a JSON list of
-- { name, about }. The Kumite starts with the usual three and The Dim Mak, a fun one: the fastest goal from a faceoff.
ALTER TABLE tournament_types ADD COLUMN awards TEXT NOT NULL DEFAULT '[]';

UPDATE tournament_types SET awards = json('[
  {"name": "Champions", "about": "The team on top of the table at the end of the day."},
  {"name": "Top scorer", "about": "Most goals across every game."},
  {"name": "Best goalie", "about": "Voted by the skaters they stopped."},
  {"name": "The Dim Mak", "about": "Fastest goal from a faceoff. One touch. Lights out."}
]') WHERE slug = 'kumite';
