// A tournament's awards from its data (ADR 0044): an admin confirms them, they don't pick them. By the award's name:
//   Champions: the champion team (lib/fixtures.ts champion).
//   Top scorer: most goals, then most assists; still level, joint winners.
//   Best goalie: the goalie (position G) whose team let in fewest goals a game.
//   The Dim Mak (or any "fun" one): a player drawn at random, the same for the same seed, drawn again on asking.
// Anything else the data can't decide: null, and an admin picks.
import { champion, table, type Result } from "./fixtures";

export interface AwardWinner {
  teamId: number | null;
  memberId: number | null;
}
export interface FromData {
  winners: AwardWinner[];
  /** Why, in a few words: "7 goals", "1.5 against a game", "Drawn at random". */
  why: string;
  random?: boolean;
}

interface Data {
  id: number;
  teams: { id?: number | null; captainMemberId: number | null; players: { memberId: number | null }[] }[];
  games?: (Result & {
    stage: "group" | "playoff";
    position: number;
    goals?: { scorerId: number | null; assistId?: number | null }[];
  })[];
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
}

/** Everyone who played: each team's captain and players. */
const playersOf = (t: Data) =>
  t.teams.flatMap((x) => [x.captainMemberId, ...x.players.map((p) => p.memberId)]).filter((id): id is number => !!id);

/** A small seeded random: the same seed draws the same player. */
const draw = (n: number, seed: number) => {
  let x = (seed * 2654435761) % 2 ** 32;
  x ^= x >>> 16;
  x = Math.imul(x, 2246822507) >>> 0;
  return x % n;
};

export function awardFromData(
  award: string,
  t: Data,
  { positionOf, seed = t.id }: { positionOf: (memberId: number) => string | undefined; seed?: number },
): FromData | null {
  const teamIds = t.teams.flatMap((x) => (x.id ? [x.id] : []));
  const played = (t.games ?? []).filter((g) => g.status === "done");
  if (/dim mak|random|lucky|fun/i.test(award)) {
    const everyone = playersOf(t);
    if (!everyone.length) return null;
    return {
      winners: [{ teamId: null, memberId: everyone[draw(everyone.length, seed)] }],
      why: "Drawn at random",
      random: true,
    };
  }
  if (!played.length) return null;
  if (/champion/i.test(award)) {
    const id = champion(teamIds, t.games ?? [], { win: t.pointsWin, draw: t.pointsDraw, loss: t.pointsLoss });
    return id ? { winners: [{ teamId: id, memberId: null }], why: "From the results" } : null;
  }
  if (/scor/i.test(award)) {
    // Most goals; level on goals, most assists; level on both, joint
    const goals: Record<number, number> = {};
    const assists: Record<number, number> = {};
    for (const g of played)
      for (const x of g.goals ?? []) {
        if (x.scorerId) goals[x.scorerId] = (goals[x.scorerId] ?? 0) + 1;
        if (x.assistId) assists[x.assistId] = (assists[x.assistId] ?? 0) + 1;
      }
    const most = Math.max(0, ...Object.values(goals));
    if (!most) return null;
    const level = Object.keys(goals)
      .map(Number)
      .filter((id) => goals[id] === most);
    const bestAssists = Math.max(...level.map((id) => assists[id] ?? 0));
    const ids = level.filter((id) => (assists[id] ?? 0) === bestAssists);
    const g = `${most} ${most === 1 ? "goal" : "goals"}`;
    const why =
      level.length > 1 && bestAssists ? `${g}, ${bestAssists} ${bestAssists === 1 ? "assist" : "assists"}` : g;
    return { winners: ids.map((memberId) => ({ teamId: null, memberId })), why };
  }
  if (/goalie|keeper|goaltend/i.test(award)) {
    const rows = table(teamIds, played);
    const perGame = (r: (typeof rows)[number]) => (r.p ? r.ga / r.p : Infinity);
    const goalieOf = (teamId: number) => {
      const team = t.teams.find((x) => x.id === teamId);
      return team
        ? [team.captainMemberId, ...team.players.map((p) => p.memberId)].find((id) => id && positionOf(id) === "G")
        : undefined;
    };
    const ranked = rows.filter((r) => r.p && goalieOf(r.teamId)).sort((a, b) => perGame(a) - perGame(b));
    if (!ranked.length) return null;
    const best = perGame(ranked[0]);
    const winners = ranked
      .filter((r) => perGame(r) === best)
      .map((r) => ({ teamId: null, memberId: goalieOf(r.teamId)! }));
    return { winners, why: `${Number(best.toFixed(1))} against a game` };
  }
  return null;
}
