#!/usr/bin/env python3
"""
Line-based team solver — an alternative to solver_lp.py.

Strategy:
  1. Split players into D and F groups, each sorted by rating descending.
  2. Snake-draft each group into "lines" of LINE_SIZE (default 3).
     By construction every line contains one top player, one mid player,
     one bottom player from that position tier — so all lines are already
     roughly equal in strength.
  3. Compute each line's average rating, then snake-draft the lines
     themselves across teams so that each team receives an equal mix of
     strong and weak lines.
  4. If the Cougars flag is in use, steer cougar players onto the team
     that is assigned the "Cougars" label.

Reads a JSON array of player objects from stdin (same format as solver_lp.py):
  [{ "id": str, "name": str, "position": "F"|"D", "rating": int,
     "cougar": bool }, ...]

Writes the same array with an added "team" key to stdout.

Called by /api/solve/route.ts when strategy="lines".
"""

import json
import sys

ALL_TEAM_NAMES = ['White', 'Black', 'Cougars', 'Red', 'Gold']
MIN_TEAM_SIZE = 3
MAX_TEAM_SIZE = 7
LINE_SIZE = 3  # players per line


def compute_n_teams(n_players: int) -> int:
    for n in range(2, n_players + 1):
        lo = n_players // n
        hi = -(- n_players // n)  # ceil
        if lo >= MIN_TEAM_SIZE and hi <= MAX_TEAM_SIZE:
            return n
    return max(2, -(- n_players // MAX_TEAM_SIZE))


def get_team_names(n: int) -> list[str]:
    others = [name for name in ALL_TEAM_NAMES if name != 'Cougars']
    if n <= len(ALL_TEAM_NAMES):
        return others[:n - 1] + ['Cougars']
    extra_needed = (n - 1) - len(others)
    generated = [f"Team {i}" for i in range(1, extra_needed + 1)]
    return others + generated + ['Cougars']


def _form_lines(players_sorted: list, line_size: int) -> list[list]:
    """
    Group players_sorted (already in pick order) into lines of `line_size`
    using a snake/zigzag pattern so each line gets one player from each
    rating tier.

    Example with 9 players and line_size=3:
      Pick order: 1  2  3  4  5  6  7  8  9
      Line:       L1 L2 L3 L3 L2 L1 L1 L2 L3

    The snake reverses direction after each full round, which means each
    line ends up with one player from the top, one from the middle, and
    one from the bottom of the rating distribution.
    """
    n = len(players_sorted)
    if n == 0:
        return []

    lines: list[list] = [[] for _ in range(line_size)]
    direction = 1
    idx = 0  # index into lines[]

    for p in players_sorted:
        lines[idx].append(p)
        idx += direction
        # Bounce at the ends
        if idx >= line_size:
            idx = line_size - 1
            direction = -1
        elif idx < 0:
            idx = 0
            direction = 1

    # Remove any empty lines (can happen if n < line_size)
    return [l for l in lines if l]


def _snake_assign_lines(lines_sorted: list, n_teams: int) -> list[int]:
    """
    Assign lines to teams using a greedy snake draft (team with lowest
    cumulative line-average-rating gets the next line).
    Returns a list of team indices parallel to lines_sorted.
    """
    team_totals = [0.0] * n_teams
    assignment = []
    for line in lines_sorted:
        avg = sum(p['rating'] for p in line) / len(line)
        best = min(range(n_teams), key=lambda t: team_totals[t])
        team_totals[best] += avg
        assignment.append(best)
    return assignment


def assign_teams(players: list) -> list:
    eligible = [p for p in players if p.get('position') in ('D', 'F')]
    n_players = len(eligible)
    if n_players == 0:
        return []

    n_teams = compute_n_teams(n_players)
    team_names = get_team_names(n_teams)

    defenders = sorted([p for p in eligible if p['position'] == 'D'],
                       key=lambda p: -p['rating'])
    forwards  = sorted([p for p in eligible if p['position'] == 'F'],
                       key=lambda p: -p['rating'])

    # Form lines within each position group
    d_lines = _form_lines(defenders, LINE_SIZE)
    f_lines = _form_lines(forwards,  LINE_SIZE)

    # Tag each line with its position so we can steer cougar lines later
    all_lines = [{'players': l, 'pos': 'D'} for l in d_lines] + \
                [{'players': l, 'pos': 'F'} for l in f_lines]

    # Sort all lines by average rating descending (best lines drafted first)
    all_lines.sort(key=lambda l: -sum(p['rating'] for p in l['players']) / len(l['players']))

    # Identify cougar-heavy lines (lines that contain cougar players)
    cougar_team_idx = n_teams - 1  # 'Cougars' is always the last name
    cougar_player_ids = {p['id'] for p in eligible if p.get('cougar')}

    # Greedy team assignment: team with the lowest total so far gets next line.
    # Lines containing cougar players are softly nudged toward cougar_team_idx
    # (we adjust their "effective total" downward for that team).
    team_totals = [0.0] * n_teams
    assignment: dict[str, int] = {}  # player_id -> team_idx

    for line_obj in all_lines:
        line = line_obj['players']
        line_avg = sum(p['rating'] for p in line) / len(line)
        has_cougar = any(p['id'] in cougar_player_ids for p in line)

        def score(t, la=line_avg, hc=has_cougar):
            s = team_totals[t]
            # Bias cougar-containing lines toward the cougar team
            if hc and t == cougar_team_idx:
                s -= la * 0.5
            return s

        best = min(range(n_teams), key=score)
        team_totals[best] += line_avg
        for p in line:
            assignment[p['id']] = best

    # Rename: if cougar players exist, move 'Cougars' label to whichever
    # team actually received the most cougar players.
    if cougar_player_ids:
        cougar_counts = [0] * n_teams
        for pid, t in assignment.items():
            if pid in cougar_player_ids:
                cougar_counts[t] += 1
        cougar_winner = max(range(n_teams), key=lambda t: cougar_counts[t])
        cougars_pos = team_names.index('Cougars')
        team_names[cougar_winner], team_names[cougars_pos] = \
            'Cougars', team_names[cougar_winner]

    return [{**p, 'team': team_names[assignment[p['id']]]} for p in eligible
            if p['id'] in assignment]


if __name__ == '__main__':
    players = json.loads(sys.stdin.read())
    result  = assign_teams(players)
    print(json.dumps(result))
