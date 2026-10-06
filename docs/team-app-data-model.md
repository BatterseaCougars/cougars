# Team app data model

The D1 tables the team app needs, by milestone. Conventions are in [db/README.md](../db/README.md): snake_case
plural tables, `INTEGER PRIMARY KEY AUTOINCREMENT`, ISO text dates (`*_on` a date, `*_at` an instant), `_pence`
integers, 0/1 booleans, free-text status with a comment. The demo in `team/app/src/demo/model.ts` uses the same
shapes in memory.

## People and access (T1)

[ADR 0023](adr/0023-device-bound-sign-in.md), [ADR 0024](adr/0024-action-based-authorization.md),
[ADR 0029](adr/0029-view-as-a-member.md).

| Table              | Columns                                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `members`          | name, email (unique), phone, position (F/D/G), rating, cougar, photo, status (pending/active/inactive), payment_reference (unique), joined_on |
| `login_challenges` | email, code_hash, link_hash, nonce_hash, attempts, expires_at, used_at                                                                        |
| `auth_sessions`    | member_id, viewing_as_member_id (null unless viewing as someone), token_hash, created_at, last_seen_at, revoked_at                            |
| `roles`            | name, description, is_system                                                                                                                  |
| `role_actions`     | role_id, action                                                                                                                               |
| `member_roles`     | member_id, role_id                                                                                                                            |
| `audit_log`        | member_id, viewing_as_member_id, action, subject, detail (JSON), at                                                                           |

## Schedule (T2, T5)

[ADR 0030](adr/0030-training-series-and-tournaments.md).

| Table               | Columns                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `training_series`   | slug (unique), name, short_name, icon, tone, repeat_every (weeks), weekdays (`mon,fri`), starts_on, ends_on (null: ongoing), start_time, end_time, venue, capacity, signup_closes_mins, public, active |
| `training_sessions` | series_id, held_on, moved_from, start_time, end_time, venue, capacity (each null: follows the series), note, cancelled_at, register_closed_at; unique (series_id, held_on)                             |
| `tournament_types`  | slug (unique), name, short_name, icon, tone, format (`round_robin`), points_win, points_draw, points_loss, game_minutes, draft, active                                                                 |
| `tournaments`       | type_id, name, location, held_on, start_time, end_time, capacity, status (planned/open/live/finished), public                                                                                          |
| `club_events`       | title, starts_at, ends_at, venue, public, signup_enabled, capacity                                                                                                                                     |

The calendar is a union of the three: sessions (with series defaults filled in), tournaments and club events.

## Sign-up, register and teams (T2, T3)

| Table                  | Columns                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `attendance`           | session_id, member_id, signup (in/out/waitlist), signed_up_at, attended, walk_in, recorded_by, recorded_at; unique (session_id, member_id) |
| `session_teams`        | session_id, name, published_at                                                                                                             |
| `session_team_players` | team_id, member_id                                                                                                                         |
| `club_event_entries`   | event_id, member_id, signup, signed_up_at                                                                                                  |

## Tournaments (T5, T6)

| Table                     | Columns                                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `tournament_entries`      | tournament_id, member_id, signup, signed_up_at, attended                                                                                     |
| `tournament_teams`        | tournament_id, name, captain_id                                                                                                              |
| `tournament_team_players` | team_id, member_id                                                                                                                           |
| `drafts`                  | tournament_id, order (`snake`), pick_seconds, started_at, finished_at                                                                        |
| `draft_picks`             | draft_id, pick_no, team_id, member_id, picked_by, picked_at; unique (draft_id, pick_no)                                                      |
| `matches`                 | tournament_id, round, home_team_id, away_team_id, status (next/live/done)                                                                    |
| `match_events`            | match_id, client_id (unique, made on the phone), kind (start/pause/resume/period/goal/end/undo), team_id, scorer_id, assist_id, clock_ms, at |

## Dues (T4)

[ADR 0026](adr/0026-dues-ledger.md), amended by [ADR 0032](adr/0032-fees-per-session-and-tournament.md): fees belong to
each session and tournament, payments are marked against charges, and Overdue Rentals is the unpaid charges.

| Table                 | Columns                                                                            |
| --------------------- | ---------------------------------------------------------------------------------- |
| `series_fees`         | series_id, amount_pence, effective_from (a training's fee, going forward)          |
| `subscription_fees`   | amount_pence, effective_from (the quarterly subscription)                          |
| `member_plans`        | member_id, plan (subscription/payg), starts_on, ends_on                            |
| `charges`             | member_id, session_id or tournament_id or quarter, amount_pence, due_on, voided_at |
| `payments`            | member_id, amount_pence, received_on, via (transfer/cash), reference, recorded_by  |
| `payment_allocations` | payment_id, charge_id, amount_pence                                                |

Also: `training_sessions.fee_pence` (written when the register closes, or an admin's override),
`tournament_types.default_fee_pence`, `tournaments.fee_pence` (copied from the type's default when scheduled).

## Club (T1)

| Table   | Columns                                                                                      |
| ------- | -------------------------------------------------------------------------------------------- |
| `quips` | kind (ask/in/waitlist/out), text (≤ 56 characters), created_by, created_at; admins edit them |
