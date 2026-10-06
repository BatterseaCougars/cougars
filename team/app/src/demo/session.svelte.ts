// Who's signed in, and who they're viewing the app as. Real sessions arrive in T1 (ADR 0023); impersonation is
// ADR 0027: an admin sees exactly what a member sees, read-only.
import type { Action } from "../access/actions";
import { PLAYERS, REAL_ID, type Player } from "./data";
import { db } from "./store.svelte";

const KEY = "team.demo.viewAs";

function readAs(): number | null {
  try {
    const id = Number(localStorage.getItem(KEY));
    return PLAYERS.some((p) => p.id === id) && id !== REAL_ID ? id : null;
  } catch {
    return null;
  }
}

export const session = $state({ as: readAs() });

const player = (id: number): Player => PLAYERS.find((p) => p.id === id)!;

/** Who you are. */
export const realMember = (): Player => player(REAL_ID);
/** Who the app is showing: you, or the member you're viewing as. */
export const me = (): Player => player(session.as ?? REAL_ID);
export const impersonating = (): boolean => session.as !== null;

export const rolesOf = (id: number): string[] => db.members.find((m) => m.player.id === id)?.roles ?? [];

function actionsOf(id: number): ReadonlySet<Action> {
  const actions = rolesOf(id).flatMap((name) => db.roles.find((r) => r.name === name)?.actions ?? []);
  return new Set(actions);
}

/** What the app lets the shown member do. While viewing as someone, that's their actions, not yours. */
export const granted = (): ReadonlySet<Action> => actionsOf(me().id);
/** What you can do yourself: decides whether "View as" is offered at all. */
export const realGranted = (): ReadonlySet<Action> => actionsOf(REAL_ID);

export function viewAs(id: number | null) {
  session.as = id === REAL_ID ? null : id;
  try {
    if (session.as === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(session.as));
  } catch {
    // Private mode: lasts until reload.
  }
}
