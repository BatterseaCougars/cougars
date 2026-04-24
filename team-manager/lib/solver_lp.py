#!/usr/bin/env python3
"""
LP team solver — reads a JSON array of player objects from stdin,
assigns them to balanced teams using PuLP/CBC, and writes the
result (same objects with an added 'team' key) as JSON to stdout.

Number of teams is derived automatically: each team should have 6–7 players.

Called by /api/solve/route.ts via child_process.execSync.
"""

import json
import sys
from pulp import LpProblem, LpMinimize, LpVariable, lpSum, value, PULP_CBC_CMD

# Team names in priority order — Cougars is always available as the last team
ALL_TEAM_NAMES = ['White', 'Black', 'Cougars', 'Red', 'Gold']
MIN_TEAM_SIZE = 3
MAX_TEAM_SIZE = 7
PHASE1_TIME_LIMIT_SEC = 8
PHASE2_TIME_LIMIT_SEC = 12
LP_PLAYER_THRESHOLD = 30


def compute_n_teams(n_players: int) -> int:
    """Return the number of teams so each has 3–7 players where possible."""
    for n in range(2, n_players + 1):
        lo = n_players // n
        hi = -(- n_players // n)  # ceil
        if lo >= MIN_TEAM_SIZE and hi <= MAX_TEAM_SIZE:
            return n
    # Fallback: fewest teams that keep each under MAX_TEAM_SIZE
    return max(2, -(- n_players // MAX_TEAM_SIZE))


def get_team_names(n: int) -> list[str]:
    """Get n team names, always ending with 'Cougars'."""
    others = [name for name in ALL_TEAM_NAMES if name != 'Cougars']
    if n <= len(ALL_TEAM_NAMES):
        return others[:n - 1] + ['Cougars']

    extra_needed = (n - 1) - len(others)
    generated = [f"Team {i}" for i in range(1, extra_needed + 1)]
    return others + generated + ['Cougars']


def _snake_draft(players_sorted, n_teams, cougar_team):
    """
    Snake-draft players_sorted (already in desired pick order) across n_teams.
    Returns list of (player_id, team_index).
    Cougar players are steered toward cougar_team with a mild preference.
    """
    rank_sums = [0] * n_teams
    assignment = []
    direction = 1
    pos = 0
    for p in players_sorted:
        # For cougar players give cougar_team a small bonus (lower is better)
        def pick_score(t, p=p):
            s = rank_sums[t]
            if p.get('cougar') and t != cougar_team:
                s += 2
            return s

        best = min(range(n_teams), key=pick_score)
        rank_sums[best] += 1
        assignment.append((p['id'], best))

        pos += direction
        if pos >= n_teams or pos < 0:
            direction = -direction
            pos += direction
    return assignment


def _build_heuristic_assignment(players, n_teams):
    """
    Fast deterministic fallback: separate snake drafts for defenders and forwards,
    both sorted by rating descending. This mirrors the LP's rank-balance objective.
    """
    cougar_team = n_teams - 1

    defenders = sorted(
        [p for p in players if p['position'] == 'D'],
        key=lambda p: -p['rating'],
    )
    forwards = sorted(
        [p for p in players if p['position'] == 'F'],
        key=lambda p: -p['rating'],
    )

    assignment = (
        _snake_draft(defenders, n_teams, cougar_team) +
        _snake_draft(forwards,  n_teams, cougar_team)
    )
    return assignment


def _extract_assignment(players, assigned_vars, teams):
    assigned = []
    for i, p in enumerate(players):
        if p['position'] not in ('D', 'F'):
            continue
        picked = None
        for t in teams:
            v = value(assigned_vars[i][t])
            if v is not None and v > 0.5:
                picked = t
                break
        if picked is None:
            return None
        assigned.append((p['id'], picked))
    return assigned


def _rank_weights(indices, players):
    """
    Assign integer weights to players at the given indices for the rank-balance
    objective. The best-rated player gets the highest weight (= n_unique) and
    the worst-rated gets weight 1. Dense ranking handles ties.

    Using inverted weights (best = heavy) is critical: the LP objective
    minimises deviation of each team's weight-sum from the ideal.  If the best
    player had weight 0 (raw rank) they would contribute nothing and the LP
    would be free to stack all elite players on one team.
    """
    sorted_ratings = sorted({players[i]['rating'] for i in indices}, reverse=True)
    n = len(sorted_ratings)
    rating_to_rank = {r: k for k, r in enumerate(sorted_ratings)}
    # weight = n - rank  →  best player (rank 0) → n,  worst (rank n-1) → 1
    return {i: n - rating_to_rank[players[i]['rating']] for i in indices}


def _build_prob(players, teams, d_idx, f_idx, cougar_idx, n_players):
    n_all   = len(players)
    n_teams = len(teams)
    prob = LpProblem("team_assignment", LpMinimize)
    assigned       = [[LpVariable(f"x_{i}_{t}", cat='Binary') for t in teams] for i in range(n_all)]
    max_size       = LpVariable("max_size", lowBound=0, cat='Integer')
    min_size       = LpVariable("min_size", lowBound=0, cat='Integer')
    max_def        = LpVariable("max_def", lowBound=0, cat='Integer')
    min_def        = LpVariable("min_def", lowBound=0, cat='Integer')
    is_cougar_team = [LpVariable(f"y_{t}", cat='Binary') for t in teams]

    prob += lpSum(is_cougar_team[t] for t in teams) == 1

    cougar_placed = {}
    for i in cougar_idx:
        for t in teams:
            cougar_placed[i, t] = LpVariable(f"w_{i}_{t}", cat='Binary')
            prob += cougar_placed[i, t] <= assigned[i][t]
            prob += cougar_placed[i, t] <= is_cougar_team[t]
            prob += cougar_placed[i, t] >= assigned[i][t] + is_cougar_team[t] - 1

    cougar_count = lpSum(cougar_placed[i, t] for i in cougar_idx for t in teams)

    for i in range(n_all):
        if players[i]['position'] in ('D', 'F'):
            prob += lpSum(assigned[i][t] for t in teams) == 1
        else:
            prob += lpSum(assigned[i][t] for t in teams) == 0

    for t in teams:
        prob += lpSum(assigned[i][t] for i in range(n_all)) <= MAX_TEAM_SIZE
        # Enforce min size only when the numbers allow it
        if n_players >= n_teams * MIN_TEAM_SIZE:
            prob += lpSum(assigned[i][t] for i in range(n_all)) >= MIN_TEAM_SIZE

    team_size = [lpSum(assigned[i][t] for i in range(n_all)) for t in teams]
    team_def  = [lpSum(assigned[i][t] for i in d_idx) for t in teams]

    for t in teams:
        prob += team_size[t] <= max_size
        prob += team_size[t] >= min_size
        prob += team_def[t]  <= max_def
        prob += team_def[t]  >= min_def

    # Only enforce position-per-team constraints when there are enough of each
    # position to cover every team.
    for t in teams:
        if len(d_idx) >= n_teams:
            prob += lpSum(assigned[i][t] for i in d_idx) >= 1
        if len(f_idx) >= n_teams:
            prob += lpSum(assigned[i][t] for i in f_idx) >= 1

    # --- Rank-balance objective ---
    # Assign each forward and each defender a rank (0 = best) within their
    # position group. For each team, compute the sum of ranks received by its
    # forwards and its defenders separately.  The ideal sum per team is
    #   ideal = total_rank_sum / n_teams
    # We minimise the total absolute deviation from that ideal across all
    # teams and both position groups. This is size-agnostic: a team with one
    # extra player only helps if it picks up a player from a rank tier that is
    # genuinely underrepresented there — it cannot just accumulate totals.
    #
    # |x - ideal| is linearised as: pos + neg = abs_dev,
    # x - ideal = pos - neg, pos >= 0, neg >= 0.

    rank_balance_terms = []

    for pos_indices, pos_label in [(f_idx, 'F'), (d_idx, 'D')]:
        if not pos_indices:
            continue
        rw = _rank_weights(pos_indices, players)
        total_rank = sum(rw.values())
        # ideal rank sum per team (continuous)
        ideal = total_rank / n_teams

        for t in teams:
            rank_sum_t = lpSum(rw[i] * assigned[i][t] for i in pos_indices)
            pos_v = LpVariable(f"rbal_pos_{pos_label}_{t}", lowBound=0)
            neg_v = LpVariable(f"rbal_neg_{pos_label}_{t}", lowBound=0)
            prob += rank_sum_t - ideal == pos_v - neg_v
            rank_balance_terms += [pos_v, neg_v]

    return prob, assigned, is_cougar_team, cougar_placed, cougar_count, max_size, min_size, max_def, min_def, rank_balance_terms


def assign_teams(players):
    eligible   = [p for p in players if p['position'] in ('D', 'F')]
    n_players  = len(eligible)
    if n_players == 0:
        return []
    n_teams    = compute_n_teams(n_players)
    teams      = range(n_teams)
    d_idx      = [i for i, p in enumerate(players) if p['position'] == 'D']
    f_idx      = [i for i, p in enumerate(players) if p['position'] == 'F']
    cougar_idx = [i for i, p in enumerate(players) if p.get('cougar')]

    # Avoid expensive MILP on very large sessions; heuristic is near-instant and stable.
    if n_players >= LP_PLAYER_THRESHOLD:
        id_to_team = dict(_build_heuristic_assignment(eligible, n_teams))
        team_names = get_team_names(n_teams)
        return [{**p, 'team': team_names[id_to_team[p['id']]]} for p in eligible]

    # Phase 1 — maximise Cougars concentrated on one team
    prob1, assigned1, is_cougar_team1, cougar_placed1, cougar_count1, \
        max_size1, min_size1, max_def1, min_def1, rbal1 = \
        _build_prob(players, teams, d_idx, f_idx, cougar_idx, n_players)
    prob1 += -cougar_count1
    status1 = prob1.solve(PULP_CBC_CMD(msg=0, timeLimit=PHASE1_TIME_LIMIT_SEC))
    cougar_val = value(cougar_count1)
    max_cougars = int(round(cougar_val)) if cougar_val is not None else 0

    # Phase 2 — lock Cougar count, then minimise:
    #   1000 × size_spread  +  500 × defender_spread  +  rank_balance
    # rank_balance = sum of absolute deviations from the ideal rank-sum per
    # team, computed separately for forwards and defenders.  This is
    # size-agnostic: teams that grab an extra player only benefit if it
    # genuinely improves rank distribution — they cannot inflate totals.
    prob2, assigned2, is_cougar_team2, cougar_placed2, cougar_count2, \
        max_size2, min_size2, max_def2, min_def2, rbal2 = \
        _build_prob(players, teams, d_idx, f_idx, cougar_idx, n_players)
    if status1 in (1,):
        prob2 += cougar_count2 >= max_cougars
    prob2 += 1000 * (max_size2 - min_size2) + 500 * (max_def2 - min_def2) + lpSum(rbal2)
    status2 = prob2.solve(PULP_CBC_CMD(msg=0, timeLimit=PHASE2_TIME_LIMIT_SEC))

    assigned_pairs = _extract_assignment(players, assigned2, teams)
    if assigned_pairs is None or status2 not in (1,):
        # Fall back if solver times out or does not return a complete assignment.
        assigned_pairs = _build_heuristic_assignment(eligible, n_teams)

    # Name teams — place 'Cougars' label on whichever team has the most Cougars
    team_names = get_team_names(n_teams)
    if cougar_idx:
        cougar_counts = [0] * n_teams
        for player_id, t in assigned_pairs:
            player = next((p for p in players if p['id'] == player_id), None)
            if player and player.get('cougar'):
                cougar_counts[t] += 1
        cougar_team = int(max(teams, key=lambda t: cougar_counts[t]))
        cougars_pos   = team_names.index('Cougars')
        team_names[cougar_team], team_names[cougars_pos] = 'Cougars', team_names[cougar_team]

    result = []
    id_to_team = dict(assigned_pairs)
    for p in eligible:
        t = id_to_team.get(p['id'])
        if t is not None:
            result.append({**p, 'team': team_names[t]})

    return result


if __name__ == '__main__':
    players = json.loads(sys.stdin.read())
    result  = assign_teams(players)
    print(json.dumps(result))

