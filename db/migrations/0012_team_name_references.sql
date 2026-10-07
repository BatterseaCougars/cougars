-- Team app: bank references read as a name, "COUGARS ADRIAN K" (ADR 0038), not "COU-0004". The old ones are cleared
-- here; the roster seed, which runs straight after on every deploy, gives the club's players their new one, and
-- anyone else gets theirs when they next sign in. Nobody has paid with a COU- reference: the team app wasn't live.
UPDATE members SET payment_reference = NULL WHERE payment_reference LIKE 'COU-%';
