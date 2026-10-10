// Scoring a game as it's played (ADR 0061): the scoresheet, the clock and goals.
import { id, ok, type Route } from "./api.route";
import { scoreGame } from "./fixtures";
import { body } from "./http";
import { addGoal, clockGame, holdScoresheet, removeGoal, undoGoal } from "./scoring";

export const SCORING_ROUTES: Route[] = [
  {
    method: "PUT",
    path: /^\/api\/tournaments\/(\d+)\/games\/(\d+)$/,
    audit: false,
    action: "score:Match",
    changes: ["tournaments"],
    // A game's final score; the last group result fills the playoffs
    handle: async (c) => (await scoreGame(c.env.DB, id(c), Number(c.params[1]), await body(c.request)), ok()),
  },
  // Scoring a game as it's played (ADR 0061): whoever holds the scoresheet
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/games\/(\d+)\/scorer$/,
    audit: false,
    action: "authenticated",
    changes: ["tournaments"],
    // { action: "claim" | "release" }: Start scoring, or let it go
    handle: async (c) => (await holdScoresheet(c.env.DB, id(c), Number(c.params[1]), await body(c.request), c), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/games\/(\d+)\/clock$/,
    audit: false,
    action: "authenticated",
    changes: ["tournaments"],
    // { action: "start" | "pause" | "end" }
    handle: async (c) => (
      await clockGame(c.env.DB, id(c), Number(c.params[1]), await body(c.request), c, new Date(c.now)),
      ok()
    ),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/games\/(\d+)\/goals$/,
    audit: false,
    action: "authenticated",
    changes: ["tournaments"],
    // { teamId, scorerId?, assistId? }
    handle: async (c) => (
      await addGoal(c.env.DB, id(c), Number(c.params[1]), await body(c.request), c, new Date(c.now)),
      ok()
    ),
  },
  {
    method: "DELETE",
    path: /^\/api\/tournaments\/(\d+)\/games\/(\d+)\/goals\/last$/,
    audit: false,
    action: "authenticated",
    changes: ["tournaments"],
    handle: async (c) => (await undoGoal(c.env.DB, id(c), Number(c.params[1]), c), ok()),
  },
  {
    method: "DELETE",
    path: /^\/api\/tournaments\/(\d+)\/games\/(\d+)\/goals\/(\d+)$/,
    audit: false,
    action: "authenticated",
    changes: ["tournaments"],
    // An admin takes any goal off a finished game (scoring.ts decides who)
    handle: async (c) => (await removeGoal(c.env.DB, id(c), Number(c.params[1]), Number(c.params[2]), c), ok()),
  },
];
