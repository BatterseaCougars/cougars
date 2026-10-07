-- Team app: kinder quips (2026-10-07). Home's lines tease the moment, never the member: no digs at someone's skill,
-- speed, courage or commitment, and nothing gendered ("princess" is gone). Only lines still worded exactly as 0006
-- seeded them are replaced, so anything an admin has written or edited in Settings → Quips stays as it is.

DELETE FROM quips
WHERE (kind, text) IN (
  VALUES
    ('ask', 'Well? We haven''t got all night.'),
    ('ask', 'Skates on or excuses ready?'),
    ('ask', 'In or out. It''s not a hard one.'),
    ('ask', 'Your public awaits. Allegedly.'),
    ('ask', 'Commitment issues? It''s one button.'),
    ('ask', 'Neither in nor out. Very you.'),
    ('in', 'In. Try to stay upright this time.'),
    ('in', 'Lovely. Someone has to lose the faceoffs.'),
    ('in', 'Right answer. Took you long enough.'),
    ('in', 'In. The bar''s low. Clear it.'),
    ('waitlist', 'Full house. Someone always bottles it.'),
    ('waitlist', 'Waitlist. Start hoping for traffic.'),
    ('waitlist', 'Full. Should''ve been quicker.'),
    ('out', 'If you ain''t first, you last.'),
    ('out', 'Noted. Your spot''s going to someone faster.'),
    ('out', 'Cool. We''ll say you were scared.'),
    ('out', 'Out? Bold of you to think we''d notice.'),
    ('out', 'Rest up, princess.'),
    ('out', 'Shame. Said no one.'),
    ('out', 'Your loss. Literally, on the scoreboard.')
);

INSERT INTO quips (kind, text) VALUES
  ('ask', 'Well? The puck''s waiting.'),
  ('ask', 'Skates on or feet up?'),
  ('ask', 'In or out. Easy one.'),
  ('ask', 'One tap. In or out?'),
  ('ask', 'The bench wants to know.'),
  ('ask', 'Spaces are going. You in?'),
  ('in', 'Lovely. See you on the rink.'),
  ('in', 'Good call. Tape your stick.'),
  ('in', 'In. Hydrate like you mean it.'),
  ('in', 'Locked in. Bring the noise.'),
  ('waitlist', 'Full house. Spots do open up.'),
  ('waitlist', 'On the list. We''ll shout if a spot opens.'),
  ('waitlist', 'Waitlist. Keep your skates by the door.'),
  ('out', 'Fair enough. Next time, then.'),
  ('out', 'Rest up. We''ll keep the ice cold.'),
  ('out', 'Life happens. See you next time.'),
  ('out', 'Out. Your stick will forgive you.'),
  ('out', 'Noted. We''ll miss the chirping.'),
  ('out', 'Shame. Your spot''s here next time.');
