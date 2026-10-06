// Who you are in the demo. Real sessions arrive in T1 (ADR 0023); until then you pick a role to see the app as
// that member would.
import type { Action } from "../access/actions";
import { db } from "./store.svelte";

const KEY = "team.demo.role";

function readRole(): string {
  try {
    return localStorage.getItem(KEY) ?? "Admin";
  } catch {
    return "Admin";
  }
}

export const session = $state({ role: readRole() });

/** The actions of the role you're viewing as. Rebuilt on each read, never mutated, so a plain Set is right. */
export const granted = (): ReadonlySet<Action> =>
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  new Set(db.roles.find((r) => r.name === session.role)?.actions ?? []);

export function viewAs(role: string) {
  session.role = role;
  try {
    localStorage.setItem(KEY, role);
  } catch {
    // Private mode: the choice lasts until reload.
  }
}
