-- Team app: Friday Training's history for 2026, so admins can record who came after the fact (the member page's
-- attendance). The club trained on Fridays all year; this adds an empty session for every Friday from 2 January
-- to 2 October 2026 (9 October on are made by the app). Admins cancel any Friday that didn't happen.

UPDATE training_series SET starts_on = '2026-01-02' WHERE slug = 'friday' AND starts_on > '2026-01-02';

WITH RECURSIVE fridays (d) AS (
  SELECT '2026-01-02'
  UNION ALL
  SELECT date(d, '+7 days') FROM fridays WHERE d < '2026-10-02'
)
INSERT OR IGNORE INTO training_sessions (series_id, held_on)
SELECT ts.id, f.d FROM fridays f, training_series ts WHERE ts.slug = 'friday';
