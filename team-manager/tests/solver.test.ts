/**
 * solver.test.ts
 *
 * Tests for solver_lp.py via child_process (all tests in one language).
 * Run: npm test
 *
 * Player names and record IDs are anonymised — do not add real names here.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

const SOLVER = path.resolve(__dirname, '../lib/solver_lp.py');

interface SolverPlayer {
  id: string;
  name: string;
  position: string;
  rating: number;
  cougar: boolean;
  team: string;
}

function runSolver(players: object[]): SolverPlayer[] {
  const input = JSON.stringify(players);
  const output = execSync(`python3 "${SOLVER}"`, {
    input,
    encoding: 'utf-8',
    timeout: 60_000,
  });
  return JSON.parse(output);
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

/**
 * Small session — 6 players (5 forwards, 1 defender).
 * Mirrors the shape of a real low-attendance session.
 * Expected: 2 teams of 3; position constraints relaxed when too few of one type.
 */
const SMALL_SESSION_PLAYERS = [
  { id: 'pid-001', name: 'Player 1', position: 'F', rating: 80, cougar: false },
  { id: 'pid-002', name: 'Player 2', position: 'D', rating: 55, cougar: true  },
  { id: 'pid-003', name: 'Player 3', position: 'F', rating: 65, cougar: true  },
  { id: 'pid-004', name: 'Player 4', position: 'F', rating: 70, cougar: true  },
  { id: 'pid-005', name: 'Player 5', position: 'F', rating: 50, cougar: true  },
  { id: 'pid-006', name: 'Player 6', position: 'F', rating: 20, cougar: false },
];

/**
 * Full session — 18 players, balanced mix of forwards and defenders.
 * Expected: 3 teams of 6; each team has at least 1 F and 1 D.
 */
const FULL_SESSION_PLAYERS = [
  { id: 'pid-001', name: 'Player 1',  position: 'F', rating: 80, cougar: false },
  { id: 'pid-002', name: 'Player 2',  position: 'F', rating: 50, cougar: false },
  { id: 'pid-003', name: 'Player 3',  position: 'F', rating: 75, cougar: false },
  { id: 'pid-004', name: 'Player 4',  position: 'D', rating: 55, cougar: true  },
  { id: 'pid-005', name: 'Player 5',  position: 'D', rating: 65, cougar: false },
  { id: 'pid-006', name: 'Player 6',  position: 'F', rating: 90, cougar: false },
  { id: 'pid-007', name: 'Player 7',  position: 'F', rating: 40, cougar: true  },
  { id: 'pid-008', name: 'Player 8',  position: 'F', rating: 20, cougar: false },
  { id: 'pid-009', name: 'Player 9',  position: 'D', rating: 65, cougar: true  },
  { id: 'pid-010', name: 'Player 10', position: 'D', rating: 75, cougar: false },
  { id: 'pid-011', name: 'Player 11', position: 'D', rating: 70, cougar: false },
  { id: 'pid-012', name: 'Player 12', position: 'D', rating: 80, cougar: false },
  { id: 'pid-013', name: 'Player 13', position: 'F', rating: 65, cougar: true  },
  { id: 'pid-014', name: 'Player 14', position: 'F', rating: 70, cougar: true  },
  { id: 'pid-015', name: 'Player 15', position: 'F', rating: 70, cougar: false },
  { id: 'pid-016', name: 'Player 16', position: 'F', rating: 40, cougar: false },
  { id: 'pid-017', name: 'Player 17', position: 'F', rating: 50, cougar: true  },
  { id: 'pid-018', name: 'Player 18', position: 'F', rating: 20, cougar: false },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function teamMap(result: SolverPlayer[]): Record<string, SolverPlayer[]> {
  return result.reduce<Record<string, SolverPlayer[]>>((acc, p) => {
    (acc[p.team] ??= []).push(p);
    return acc;
  }, {});
}

// ── Tests: March 27 session (6 players → 2 teams of 3) ───────────────────────

describe('Small session (6 players)', () => {
  let result: SolverPlayer[];

  beforeAll(() => {
    result = runSolver(SMALL_SESSION_PLAYERS);
  });

  it('assigns all 6 players', () => {
    expect(result).toHaveLength(6);
  });

  it('assigns each player exactly once', () => {
    const ids = result.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(6);
  });

  it('produces exactly 2 teams', () => {
    const teams = new Set(result.map((p) => p.team));
    expect(teams.size).toBe(2);
  });

  it('each team has at least 3 players', () => {
    const teams = teamMap(result);
    for (const [name, players] of Object.entries(teams)) {
      expect(players.length, `Team ${name} too small`).toBeGreaterThanOrEqual(3);
    }
  });

  it('Cougars team concentrates the cougar players', () => {
    const teams = teamMap(result);
    const cougarTeam = teams['Cougars'] ?? [];
    const otherTeams = Object.entries(teams)
      .filter(([name]) => name !== 'Cougars')
      .map(([, players]) => players);

    const cougarCount = cougarTeam.filter((p) => p.cougar).length;
    const maxOther = Math.max(...otherTeams.map((t) => t.filter((p) => p.cougar).length));
    expect(cougarCount).toBeGreaterThanOrEqual(maxOther);
  });
});

// ── Tests: full 18-player session ────────────────────────────────────────────

describe('Full session (18 players)', () => {
  let result: SolverPlayer[];

  beforeAll(() => {
    result = runSolver(FULL_SESSION_PLAYERS);
  });

  it('assigns all 18 players', () => {
    expect(result).toHaveLength(18);
  });

  it('assigns each player exactly once', () => {
    const ids = result.map((p) => p.id);
    expect(new Set(ids).size).toBe(18);
  });

  it('produces exactly 3 teams', () => {
    const teams = new Set(result.map((p) => p.team));
    expect(teams.size).toBe(3);
  });

  it('each team has at least 3 players', () => {
    const teams = teamMap(result);
    for (const [name, players] of Object.entries(teams)) {
      expect(players.length, `Team ${name} too small`).toBeGreaterThanOrEqual(3);
    }
  });

  it('each team has at least 1 forward and 1 defender', () => {
    const teams = teamMap(result);
    for (const [name, players] of Object.entries(teams)) {
      expect(players.some((p) => p.position === 'F'), `${name} has no forward`).toBe(true);
      expect(players.some((p) => p.position === 'D'), `${name} has no defender`).toBe(true);
    }
  });

  it('Cougars team concentrates the cougar players', () => {
    const teams = teamMap(result);
    const cougarTeam = teams['Cougars'] ?? [];
    const otherTeams = Object.entries(teams)
      .filter(([name]) => name !== 'Cougars')
      .map(([, players]) => players);

    const cougarCount = cougarTeam.filter((p) => p.cougar).length;
    const maxOther = Math.max(...otherTeams.map((t) => t.filter((p) => p.cougar).length));
    expect(cougarCount).toBeGreaterThanOrEqual(maxOther);
  });
});

// ── Tests: March 20 session (21 players → 3 teams of 7) ──────────────────────

/**
 * Real session from 2026-03-20, anonymised.
 * 21 players: 14 forwards, 7 defenders, 8 cougars.
 * Expected: 3 teams of 7; each team has ≥1 F and ≥1 D.
 */
const MAR_20_SESSION_PLAYERS = [
  { id: 'pid-001', name: 'Player 1',  position: 'F', rating: 80, cougar: false },
  { id: 'pid-002', name: 'Player 2',  position: 'F', rating: 50, cougar: false },
  { id: 'pid-003', name: 'Player 3',  position: 'D', rating: 75, cougar: false },
  { id: 'pid-004', name: 'Player 4',  position: 'F', rating: 75, cougar: false },
  { id: 'pid-005', name: 'Player 5',  position: 'D', rating: 65, cougar: true  },
  { id: 'pid-006', name: 'Player 6',  position: 'D', rating: 70, cougar: false },
  { id: 'pid-007', name: 'Player 7',  position: 'F', rating: 90, cougar: false },
  { id: 'pid-008', name: 'Player 8',  position: 'D', rating: 40, cougar: true  },
  { id: 'pid-009', name: 'Player 9',  position: 'F', rating: 20, cougar: false },
  { id: 'pid-010', name: 'Player 10', position: 'F', rating: 70, cougar: true  },
  { id: 'pid-011', name: 'Player 11', position: 'D', rating: 75, cougar: false },
  { id: 'pid-012', name: 'Player 12', position: 'D', rating: 70, cougar: false },
  { id: 'pid-013', name: 'Player 13', position: 'D', rating: 80, cougar: false },
  { id: 'pid-014', name: 'Player 14', position: 'F', rating: 70, cougar: true  },
  { id: 'pid-015', name: 'Player 15', position: 'F', rating: 70, cougar: true  },
  { id: 'pid-016', name: 'Player 16', position: 'F', rating: 70, cougar: false },
  { id: 'pid-017', name: 'Player 17', position: 'F', rating: 65, cougar: true  },
  { id: 'pid-018', name: 'Player 18', position: 'F', rating: 40, cougar: true  },
  { id: 'pid-019', name: 'Player 19', position: 'F', rating: 50, cougar: true  },
  { id: 'pid-020', name: 'Player 20', position: 'F', rating: 20, cougar: false },
  { id: 'pid-021', name: 'Player 21', position: 'F', rating: 70, cougar: false },
];

describe('March 20 session (21 players)', () => {
  let result: SolverPlayer[];

  beforeAll(() => {
    result = runSolver(MAR_20_SESSION_PLAYERS);
  });

  it('assigns all 21 players', () => {
    expect(result).toHaveLength(21);
  });

  it('assigns each player exactly once', () => {
    const ids = result.map((p) => p.id);
    expect(new Set(ids).size).toBe(21);
  });

  it('produces exactly 3 teams', () => {
    const teams = new Set(result.map((p) => p.team));
    expect(teams.size).toBe(3);
  });

  it('each team has exactly 7 players', () => {
    const teams = teamMap(result);
    for (const [name, players] of Object.entries(teams)) {
      expect(players.length, `Team ${name} should have 7 players`).toBe(7);
    }
  });

  it('defenders are spread evenly (no team has more than ceil(7/3) = 3)', () => {
    const teams = teamMap(result);
    for (const [name, players] of Object.entries(teams)) {
      const defCount = players.filter((p) => p.position === 'D').length;
      expect(defCount, `Team ${name} has too many defenders (${defCount})`).toBeLessThanOrEqual(3);
    }
  });

  it('each team has at least 1 forward and 1 defender', () => {
    const teams = teamMap(result);
    for (const [name, players] of Object.entries(teams)) {
      expect(players.some((p) => p.position === 'F'), `${name} has no forward`).toBe(true);
      expect(players.some((p) => p.position === 'D'), `${name} has no defender`).toBe(true);
    }
  });

  it('Cougars team concentrates the cougar players', () => {
    const teams = teamMap(result);
    const cougarTeam = teams['Cougars'] ?? [];
    const otherTeams = Object.entries(teams)
      .filter(([name]) => name !== 'Cougars')
      .map(([, players]) => players);

    const cougarCount = cougarTeam.filter((p) => p.cougar).length;
    const maxOther = Math.max(...otherTeams.map((t) => t.filter((p) => p.cougar).length));
    expect(cougarCount).toBeGreaterThanOrEqual(maxOther);
  });
});

// ── Tests: April 24 session (20 players → 3 teams) ───────────────────────────

/**
 * Real session from 2026-04-24, anonymised. 20 players: 15 forwards, 5 defenders.
 *
 * The previous solver (total-rating objective) placed the three highest-rated
 * players — F:90, D:80, D:80 — on the same team, producing a heavily
 * unbalanced result. The rank-balance objective should spread them so that
 * each of the three top-rated players lands on a different team.
 *
 * Player list (sorted by rating desc):
 *   pid-001 F 90 | pid-002 D 80 | pid-003 D 80 | pid-004 F 75 | pid-005 D 75
 *   pid-006..010 F 70x5 | pid-011 D 65 | pid-012 F 65 | pid-013 F 60
 *   pid-014..015 F 50x2 | pid-016 D 45 | pid-017..018 F 45x2
 *   pid-019 F 30 | pid-020 F 15
 */
const APR_24_PLAYERS = [
  { id: 'pid-001', name: 'Player 1',  position: 'F', rating: 90, cougar: false },
  { id: 'pid-002', name: 'Player 2',  position: 'D', rating: 80, cougar: false },
  { id: 'pid-003', name: 'Player 3',  position: 'D', rating: 80, cougar: false },
  { id: 'pid-004', name: 'Player 4',  position: 'F', rating: 75, cougar: false },
  { id: 'pid-005', name: 'Player 5',  position: 'D', rating: 75, cougar: false },
  { id: 'pid-006', name: 'Player 6',  position: 'F', rating: 70, cougar: false },
  { id: 'pid-007', name: 'Player 7',  position: 'F', rating: 70, cougar: false },
  { id: 'pid-008', name: 'Player 8',  position: 'F', rating: 70, cougar: false },
  { id: 'pid-009', name: 'Player 9',  position: 'F', rating: 70, cougar: false },
  { id: 'pid-010', name: 'Player 10', position: 'F', rating: 70, cougar: false },
  { id: 'pid-011', name: 'Player 11', position: 'D', rating: 65, cougar: false },
  { id: 'pid-012', name: 'Player 12', position: 'F', rating: 65, cougar: false },
  { id: 'pid-013', name: 'Player 13', position: 'F', rating: 60, cougar: false },
  { id: 'pid-014', name: 'Player 14', position: 'F', rating: 50, cougar: false },
  { id: 'pid-015', name: 'Player 15', position: 'F', rating: 50, cougar: false },
  { id: 'pid-016', name: 'Player 16', position: 'D', rating: 45, cougar: false },
  { id: 'pid-017', name: 'Player 17', position: 'F', rating: 45, cougar: false },
  { id: 'pid-018', name: 'Player 18', position: 'F', rating: 45, cougar: false },
  { id: 'pid-019', name: 'Player 19', position: 'F', rating: 30, cougar: false },
  { id: 'pid-020', name: 'Player 20', position: 'F', rating: 15, cougar: false },
];

describe('April 24 session (20 players)', () => {
  let result: SolverPlayer[];

  beforeAll(() => {
    result = runSolver(APR_24_PLAYERS);
  });

  it('assigns all 20 players', () => {
    expect(result).toHaveLength(20);
  });

  it('assigns each player exactly once', () => {
    const ids = result.map((p) => p.id);
    expect(new Set(ids).size).toBe(20);
  });

  it('produces exactly 3 teams', () => {
    const teams = new Set(result.map((p) => p.team));
    expect(teams.size).toBe(3);
  });

  it('each team has at least 1 forward and 1 defender', () => {
    const teams = teamMap(result);
    for (const [name, players] of Object.entries(teams)) {
      expect(players.some((p) => p.position === 'F'), `${name} has no forward`).toBe(true);
      expect(players.some((p) => p.position === 'D'), `${name} has no defender`).toBe(true);
    }
  });

  it('the two highest-rated defenders (both D 80) are on different teams', () => {
    // Regression: old solver placed both D-80 players + the F-90 player on
    // the same team, making it far stronger than the others.
    const topDefenders = result.filter((p) => p.position === 'D' && p.rating === 80);
    expect(topDefenders).toHaveLength(2);
    const [teamA, teamB] = topDefenders.map((p) => p.team);
    expect(teamA, 'both D-80 defenders landed on the same team').not.toBe(teamB);
  });

  it('the top-3 rated players (F 90, D 80, D 80) are each on a different team', () => {
    // With 3 teams the rank-balance objective should place exactly one of the
    // three highest-rated players on each team.
    const top3 = result.filter(
      (p) => (p.position === 'F' && p.rating === 90) ||
             (p.position === 'D' && p.rating === 80),
    );
    expect(top3).toHaveLength(3);
    const teams = new Set(top3.map((p) => p.team));
    expect(teams.size).toBe(3);
  });

  it('average rating per player is balanced across teams (max - min <= 20)', () => {
    const teams = teamMap(result);
    const avgs = Object.values(teams).map(
      (players) => players.reduce((s, p) => s + p.rating, 0) / players.length,
    );
    const spread = Math.max(...avgs) - Math.min(...avgs);
    expect(spread, `avg rating spread was ${spread.toFixed(1)}`).toBeLessThanOrEqual(20);
  });
});

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Boundary & edge-case tests                                             ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePlayers(specs: { pos: string; rating: number; cougar?: boolean }[]) {
  return specs.map((s, i) => ({
    id: `b${i + 1}`,
    name: `P${i + 1}`,
    position: s.pos,
    rating: s.rating,
    cougar: s.cougar ?? false,
  }));
}

function teamStats(result: SolverPlayer[]) {
  const map: Record<string, SolverPlayer[]> = {};
  for (const p of result) {
    (map[p.team] ??= []).push(p);
  }
  const avgs = Object.values(map).map(
    (ps) => ps.reduce((s, p) => s + p.rating, 0) / ps.length,
  );
  return {
    teams: map,
    n: Object.keys(map).length,
    sizes: Object.values(map).map((ps) => ps.length).sort((a, b) => a - b),
    avgSpread: Math.max(...avgs) - Math.min(...avgs),
    topF: (team: SolverPlayer[]) => Math.max(...team.filter(p => p.position === 'F').map(p => p.rating), 0),
    topD: (team: SolverPlayer[]) => Math.max(...team.filter(p => p.position === 'D').map(p => p.rating), 0),
  };
}

// ── Boundary 1: minimum viable session (6 players, 2 teams) ─────────────────
describe('Boundary: 6 players (minimum, 2 teams)', () => {
  // Exactly MIN_TEAM_SIZE * 2 = 6 players
  const players = makePlayers([
    { pos: 'F', rating: 90 }, { pos: 'D', rating: 80 },
    { pos: 'F', rating: 70 }, { pos: 'D', rating: 60 },
    { pos: 'F', rating: 50 }, { pos: 'F', rating: 40 },
  ]);
  let result: SolverPlayer[];
  beforeAll(() => { result = runSolver(players); });

  it('assigns all 6 players', () => expect(result).toHaveLength(6));
  it('produces 2 teams', () => expect(teamStats(result).n).toBe(2));
  it('each team has exactly 3 players', () => {
    expect(teamStats(result).sizes).toEqual([3, 3]);
  });
  it('top F and top D are on different teams', () => {
    const f90 = result.find(p => p.rating === 90)!.team;
    const d80 = result.find(p => p.rating === 80)!.team;
    expect(f90).not.toBe(d80);
  });
});

// ── Boundary 2: 14 players (largest 2-team session) ──────────────────────────
describe('Boundary: 14 players (largest 2-team session)', () => {
  const players = makePlayers([
    { pos: 'F', rating: 95 }, { pos: 'D', rating: 85 },
    { pos: 'F', rating: 80 }, { pos: 'D', rating: 75 },
    { pos: 'F', rating: 70 }, { pos: 'F', rating: 65 },
    { pos: 'F', rating: 60 }, { pos: 'D', rating: 55 },
    { pos: 'F', rating: 50 }, { pos: 'F', rating: 45 },
    { pos: 'D', rating: 40 }, { pos: 'F', rating: 35 },
    { pos: 'F', rating: 30 }, { pos: 'F', rating: 20 },
  ]);
  let result: SolverPlayer[];
  beforeAll(() => { result = runSolver(players); });

  it('assigns all 14 players', () => expect(result).toHaveLength(14));
  it('produces 2 teams', () => expect(teamStats(result).n).toBe(2));
  it('teams differ by at most 1 player', () => {
    const s = teamStats(result).sizes;
    expect(s[1] - s[0]).toBeLessThanOrEqual(1);
  });
  it('top F and top D on different teams', () => {
    const f95 = result.find(p => p.rating === 95)!.team;
    const d85 = result.find(p => p.rating === 85)!.team;
    expect(f95).not.toBe(d85);
  });
  it('avg rating spread <= 15', () => {
    expect(teamStats(result).avgSpread).toBeLessThanOrEqual(15);
  });
});

// ── Boundary 3: 15 players (smallest 3-team session) ─────────────────────────
describe('Boundary: 15 players (smallest 3-team session)', () => {
  const players = makePlayers([
    { pos: 'F', rating: 90 }, { pos: 'D', rating: 80 }, { pos: 'D', rating: 75 },
    { pos: 'F', rating: 70 }, { pos: 'F', rating: 70 }, { pos: 'D', rating: 65 },
    { pos: 'F', rating: 60 }, { pos: 'F', rating: 60 }, { pos: 'F', rating: 55 },
    { pos: 'F', rating: 50 }, { pos: 'F', rating: 45 }, { pos: 'F', rating: 40 },
    { pos: 'F', rating: 35 }, { pos: 'F', rating: 30 }, { pos: 'F', rating: 20 },
  ]);
  let result: SolverPlayer[];
  beforeAll(() => { result = runSolver(players); });

  it('assigns all 15 players', () => expect(result).toHaveLength(15));
  it('produces 3 teams of 5', () => {
    expect(teamStats(result).n).toBe(3);
    expect(teamStats(result).sizes).toEqual([5, 5, 5]);
  });
  it('top F not on same team as top D', () => {
    const f90 = result.find(p => p.rating === 90)!.team;
    const d80 = result.find(p => p.rating === 80)!.team;
    expect(f90).not.toBe(d80);
  });
  it('avg rating spread <= 20', () => {
    expect(teamStats(result).avgSpread).toBeLessThanOrEqual(20);
  });
});

// ── Boundary 4: all identical ratings ────────────────────────────────────────
describe('Boundary: all players have identical rating (60)', () => {
  const players = makePlayers([
    { pos: 'F', rating: 60 }, { pos: 'D', rating: 60 }, { pos: 'F', rating: 60 },
    { pos: 'D', rating: 60 }, { pos: 'F', rating: 60 }, { pos: 'F', rating: 60 },
    { pos: 'F', rating: 60 }, { pos: 'D', rating: 60 }, { pos: 'F', rating: 60 },
  ]);
  let result: SolverPlayer[];
  beforeAll(() => { result = runSolver(players); });

  it('assigns all 9 players', () => expect(result).toHaveLength(9));
  it('produces 2 teams', () => expect(teamStats(result).n).toBe(2));
  it('avg rating spread is 0', () => {
    expect(teamStats(result).avgSpread).toBe(0);
  });
});

// ── Boundary 5: heavily skewed ratings (1 elite, rest low) ───────────────────
describe('Boundary: 1 elite player (rating 100), rest rating 10', () => {
  const players = makePlayers([
    { pos: 'F', rating: 100 },
    ...Array.from({ length: 8 }, (_, i) => ({ pos: i % 2 === 0 ? 'F' : 'D', rating: 10 })) as { pos: string; rating: number }[],
  ]);
  let result: SolverPlayer[];
  beforeAll(() => { result = runSolver(players); });

  it('assigns all 9 players', () => expect(result).toHaveLength(9));
  it('produces 2 teams', () => expect(teamStats(result).n).toBe(2));
  it('elite player is assigned to exactly one team', () => {
    const elite = result.filter(p => p.rating === 100);
    expect(elite).toHaveLength(1);
  });
});

// ── Boundary 6: no defenders ──────────────────────────────────────────────────
describe('Boundary: all forwards (no defenders)', () => {
  const players = makePlayers(
    Array.from({ length: 9 }, (_, i) => ({ pos: 'F', rating: 90 - i * 8 })),
  );
  let result: SolverPlayer[];
  beforeAll(() => { result = runSolver(players); });

  it('assigns all 9 players', () => expect(result).toHaveLength(9));
  it('produces 2 teams', () => expect(teamStats(result).n).toBe(2));
  it('top F on one of two teams', () => {
    expect(result.find(p => p.rating === 90)).toBeDefined();
  });
});

// ── Boundary 7: all defenders ─────────────────────────────────────────────────
describe('Boundary: all defenders (no forwards)', () => {
  const players = makePlayers(
    Array.from({ length: 9 }, (_, i) => ({ pos: 'D', rating: 85 - i * 7 })),
  );
  let result: SolverPlayer[];
  beforeAll(() => { result = runSolver(players); });

  it('assigns all 9 players', () => expect(result).toHaveLength(9));
  it('produces 2 teams', () => expect(teamStats(result).n).toBe(2));
});

// ── Boundary 8: 4-team session (24 players) ───────────────────────────────────
describe('Boundary: 24 players (4 teams)', () => {
  // 16 F + 8 D — one elite F, one elite D, rest spread
  const specs = [
    { pos: 'F', rating: 95 }, { pos: 'D', rating: 90 },
    { pos: 'F', rating: 80 }, { pos: 'D', rating: 80 },
    { pos: 'F', rating: 75 }, { pos: 'D', rating: 75 },
    { pos: 'F', rating: 70 }, { pos: 'D', rating: 70 },
    { pos: 'F', rating: 70 }, { pos: 'D', rating: 65 },
    { pos: 'F', rating: 65 }, { pos: 'D', rating: 60 },
    { pos: 'F', rating: 60 }, { pos: 'D', rating: 55 },
    { pos: 'F', rating: 55 }, { pos: 'D', rating: 50 },
    { pos: 'F', rating: 50 }, { pos: 'F', rating: 45 },
    { pos: 'F', rating: 40 }, { pos: 'F', rating: 35 },
    { pos: 'F', rating: 30 }, { pos: 'F', rating: 25 },
    { pos: 'F', rating: 20 }, { pos: 'F', rating: 15 },
  ];
  const players = makePlayers(specs);
  let result: SolverPlayer[];
  beforeAll(() => { result = runSolver(players); });

  it('assigns all 24 players', () => expect(result).toHaveLength(24));
  it('produces 4 teams', () => expect(teamStats(result).n).toBe(4));
  it('each team has 6 players', () => {
    expect(teamStats(result).sizes).toEqual([6, 6, 6, 6]);
  });
  it('each team has at least 1 F and 1 D', () => {
    const { teams } = teamStats(result);
    for (const [name, ps] of Object.entries(teams)) {
      expect(ps.some(p => p.position === 'F'), `${name} has no F`).toBe(true);
      expect(ps.some(p => p.position === 'D'), `${name} has no D`).toBe(true);
    }
  });
  it('top F and top D on different teams', () => {
    const f95 = result.find(p => p.rating === 95 && p.position === 'F')!.team;
    const d90 = result.find(p => p.rating === 90 && p.position === 'D')!.team;
    expect(f95).not.toBe(d90);
  });
  it('avg rating spread <= 20', () => {
    expect(teamStats(result).avgSpread).toBeLessThanOrEqual(20);
  });
});

// ── Boundary 9: LP threshold (29 players — last to use LP) ───────────────────
describe('Boundary: 29 players (last LP session, 5 teams)', () => {
  const specs = Array.from({ length: 29 }, (_, i) => ({
    pos: i % 5 === 0 ? 'D' : 'F',
    rating: Math.max(10, 90 - i * 2),
  }));
  const players = makePlayers(specs);
  let result: SolverPlayer[];
  beforeAll(() => { result = runSolver(players); });

  it('assigns all 29 players', () => expect(result).toHaveLength(29));
  it('produces 5 teams', () => expect(teamStats(result).n).toBe(5));
  it('no team has more than 7 players', () => {
    const { sizes } = teamStats(result);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(7);
  });
  it('avg rating spread <= 20', () => {
    expect(teamStats(result).avgSpread).toBeLessThanOrEqual(20);
  });
});

// ── Boundary 10: heuristic threshold (30 players — first heuristic session) ──
describe('Boundary: 30 players (first heuristic session, 5 teams)', () => {
  const specs = Array.from({ length: 30 }, (_, i) => ({
    pos: i % 5 === 0 ? 'D' : 'F',
    rating: Math.max(10, 90 - Math.floor(i * 2.5)),
  }));
  const players = makePlayers(specs);
  let result: SolverPlayer[];
  beforeAll(() => { result = runSolver(players); });

  it('assigns all 30 players', () => expect(result).toHaveLength(30));
  it('produces 5 teams', () => expect(teamStats(result).n).toBe(5));
  it('no team has more than 7 players', () => {
    const { sizes } = teamStats(result);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(7);
  });
  it('avg rating spread <= 25 (heuristic is less precise)', () => {
    expect(teamStats(result).avgSpread).toBeLessThanOrEqual(25);
  });
});

// ── Boundary 11: tied top players (3 F all rating 90) ────────────────────────
describe('Boundary: 3 tied top-rated forwards (all F 90) across 3 teams', () => {
  const players = makePlayers([
    { pos: 'F', rating: 90 }, { pos: 'F', rating: 90 }, { pos: 'F', rating: 90 },
    { pos: 'D', rating: 80 }, { pos: 'D', rating: 75 }, { pos: 'D', rating: 70 },
    { pos: 'F', rating: 60 }, { pos: 'F', rating: 50 }, { pos: 'F', rating: 50 },
    { pos: 'F', rating: 40 }, { pos: 'F', rating: 35 }, { pos: 'F', rating: 30 },
    { pos: 'F', rating: 25 }, { pos: 'F', rating: 20 }, { pos: 'F', rating: 15 },
  ]);
  let result: SolverPlayer[];
  beforeAll(() => { result = runSolver(players); });

  it('assigns all 15 players', () => expect(result).toHaveLength(15));
  it('produces 3 teams', () => expect(teamStats(result).n).toBe(3));
  it('each team gets exactly one F-90 player', () => {
    const { teams } = teamStats(result);
    for (const [name, ps] of Object.entries(teams)) {
      const top90 = ps.filter(p => p.rating === 90 && p.position === 'F');
      expect(top90, `${name} has ${top90.length} F-90 players`).toHaveLength(1);
    }
  });
});

// ── Boundary 12: many cougars (all players are cougars) ──────────────────────
describe('Boundary: all 9 players are Cougars', () => {
  const players = makePlayers(
    Array.from({ length: 9 }, (_, i) => ({ pos: i < 3 ? 'D' : 'F', rating: 80 - i * 5, cougar: true })),
  );
  let result: SolverPlayer[];
  beforeAll(() => { result = runSolver(players); });

  it('assigns all 9 players', () => expect(result).toHaveLength(9));
  it('produces 2 teams', () => expect(teamStats(result).n).toBe(2));
  it('one team is named Cougars', () => {
    expect(Object.keys(teamStats(result).teams)).toContain('Cougars');
  });
  it('Cougars team has more cougar players than the other team', () => {
    const { teams } = teamStats(result);
    const counts = Object.entries(teams).map(([name, ps]) => ({
      name, count: ps.filter(p => p.cougar).length,
    }));
    const cougarTeam = counts.find(t => t.name === 'Cougars')!;
    const maxOther = Math.max(...counts.filter(t => t.name !== 'Cougars').map(t => t.count));
    expect(cougarTeam.count).toBeGreaterThanOrEqual(maxOther);
  });
});
