// The website roster's query (scripts/roster-snapshot.mjs, ADR 0043): active Cougars and their record.
// Stats count what's been played (signed up in, not marked a no-show, not cancelled), as the team app does.
const PLAYED = `a.signup = 'in' AND COALESCE(a.attended, 1) = 1`;
export const ROSTER_SQL = `SELECT m.id, m.name, m.web_name, m.position, m.bio,
    (SELECT COUNT(*) FROM attendance a JOIN training_sessions s ON s.id = a.session_id
      WHERE a.member_id = m.id AND ${PLAYED} AND s.cancelled_at IS NULL AND s.held_on < date('now')) sessions,
    (SELECT COUNT(*) FROM attendance a JOIN training_sessions s ON s.id = a.session_id
      WHERE a.member_id = m.id AND ${PLAYED} AND s.cancelled_at IS NULL AND s.held_on < date('now')
        AND s.held_on >= strftime('%Y-01-01', 'now')) season,
    (SELECT COUNT(*) FROM tournament_entries a JOIN tournaments t ON t.id = a.tournament_id
      WHERE a.member_id = m.id AND ${PLAYED} AND t.held_on < date('now')) tournaments
  FROM members m WHERE m.status = 'active' AND m.cougar = 1
  ORDER BY m.name COLLATE NOCASE`;
