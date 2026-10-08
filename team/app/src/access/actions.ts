// The action catalog (ADR 0024). Every route and API handler declares one of these, `authenticated` or
// `anonymous`. Roles are data: sets of actions an admin ticks in the app. `manage:all` means everything.

export const ACTIONS = {
  "read:Event": "See the calendar",
  "signup:Event": "Say in or out for events",
  "create:Event": "Add events",
  "update:Event": "Edit, move or cancel events",
  "record:Attendance": "Run the register on the night",
  "manage:Training": "Set up trainings: days, times, venue",
  "manage:Tournament": "Set up tournaments and their dates",
  "manage:Venue": "Save venues: name, address, map link",
  "generate:Teams": "Generate and adjust teams",
  "publish:Teams": "Publish teams",
  "read:Dues": "See Overdue Rentals (who owes what)",
  "manage:Fees": "Set fees",
  "record:Payment": "Record payments",
  "score:Match": "Score Kumite games",
  "run:Draft": "Run a Kumite draft",
  "pick:Draft": "Pick in a draft (captains only)",
  "read:Usage": "See the club's free Cloudflare allowance",
  "manage:Settings": "Set how often live pages check for updates",
  "upload:Photo": "Upload photos",
  "upload:Video": "Upload videos (on YouTube)",
  "publish:Media": "Publish photos and videos",
  "read:Rating": "See player ratings",
  "manage:Member": "Approve and edit members",
  "impersonate:Member": "View the app as a member (read-only)",
  "manage:Role": "Edit roles",
  "edit:Content": "Edit website content",
  "manage:Quip": "Edit the quips Home says when you sign up",
  "manage:all": "Everything",
} as const;

export type Action = keyof typeof ACTIONS;
export type Requirement = Action | "authenticated" | "anonymous";

export const can = (granted: ReadonlySet<Action>, needed: Requirement | undefined): boolean =>
  needed === undefined ||
  needed === "anonymous" ||
  needed === "authenticated" ||
  granted.has("manage:all") ||
  granted.has(needed);

/** Group actions by subject ("Event", "Teams", ...) for the Roles screen. */
export function actionsBySubject(): [string, Action[]][] {
  const groups = new Map<string, Action[]>();
  for (const action of Object.keys(ACTIONS) as Action[]) {
    const subject = action.split(":")[1];
    groups.set(subject, [...(groups.get(subject) ?? []), action]);
  }
  return [...groups];
}
