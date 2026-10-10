// Tournaments (ADR 0030, ADR 0060, ADR 0074): types and editions, their teams, fixtures and winners.
import { can } from "../../src/access/actions";
import { id, memberIdIn, ok, type Route } from "../api/api.route";
import { setWinners } from "./awards";
import { putOnTeam, takeOffTeam } from "./draft";
import { makeFixtures } from "./fixtures";
import { body, json } from "../api/api.http";
import {
  createTournament,
  createTournamentType,
  deleteTournament,
  setTeamLook,
  tournamentSummary,
  updateTournament,
  updateTournamentType,
} from "./tournaments";

export const TOURNAMENTS_ROUTES: Route[] = [
  {
    method: "POST",
    path: /^\/api\/tournament-types$/,
    audit: false,
    action: "manage:Tournament",
    changes: ["tournamentTypes"],
    handle: async (c) => json(await createTournamentType(c.env.DB, await body(c.request)), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/tournament-types\/(\d+)$/,
    audit: false,
    action: "manage:Tournament",
    changes: ["tournamentTypes"],
    handle: async (c) => (await updateTournamentType(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments$/,
    audit: false,
    action: "manage:Tournament",
    changes: ["tournaments", "charges", "credits", "payments"],
    handle: async (c) => json(await createTournament(c.env.DB, await body(c.request)), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/tournaments\/(\d+)$/,
    audit: false,
    action: "manage:Tournament",
    changes: ["tournaments", "charges", "credits", "payments"],
    handle: async (c) => (await updateTournament(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "DELETE",
    path: /^\/api\/tournaments\/(\d+)$/,
    audit: { event: "tournament.deleted", subject: (c) => tournamentSummary(c.env.DB, id(c)) },
    action: "manage:Tournament",
    changes: ["tournaments", "charges", "credits", "payments"],
    // Gone, with its teams, sign-ups, games, awards and charges (Settings → Tournaments)
    handle: async (c) => (await deleteTournament(c.env.DB, id(c)), ok()),
  },
  {
    method: "PUT",
    path: /^\/api\/tournaments\/(\d+)\/winners$/,
    audit: false,
    action: "manage:Tournament",
    changes: ["tournaments"],
    // { winners: [{ award, teamId | memberId }] }: who won the tournament's awards (ADR 0044)
    handle: async (c) => (await setWinners(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/fixtures$/,
    audit: false,
    action: "manage:Tournament",
    changes: ["tournaments"],
    // The round robin and its playoffs, once the teams are set (ADR 0061)
    handle: async (c) => (await makeFixtures(c.env.DB, id(c)), ok()),
  },
  {
    method: "PUT",
    path: /^\/api\/tournaments\/(\d+)\/teams\/(\d+)\/look$/,
    audit: false,
    // Its captain or an admin: setTeamLook decides
    action: "authenticated",
    changes: ["tournaments"],
    handle: async (c) => {
      const admin = can(c.actions, "manage:Tournament");
      await setTeamLook(c.env.DB, id(c), Number(c.params[1]), { memberId: c.memberId, admin }, await body(c.request));
      return ok();
    },
  },
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/teams\/(\d+)\/players$/,
    audit: false,
    action: "manage:Tournament",
    changes: ["tournaments"],
    // A replacement, outside the draft: onto this team (from another, or from outside the tournament)
    handle: async (c) => {
      const { memberId } = await memberIdIn(c);
      await putOnTeam(c.env.DB, id(c), Number(c.params[1]), memberId, c.now);
      return ok();
    },
  },
  {
    method: "DELETE",
    path: /^\/api\/tournaments\/(\d+)\/teams\/(\d+)\/players\/(\d+)$/,
    audit: false,
    action: "manage:Tournament",
    changes: ["tournaments"],
    // Off the team, still signed up
    handle: async (c) => (await takeOffTeam(c.env.DB, id(c), Number(c.params[1]), Number(c.params[2])), ok()),
  },
];
