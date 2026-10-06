// One route tree for phone and desktop (the Gwenda ops pattern). The phone tabs are derived from it in
// mobile-nav.ts, so the two can't drift apart. Each route declares the action it needs (ADR 0024).
import type { Requirement } from "../access/actions";
import type { IconName } from "./shell/icons";

export type TabId = "home" | "calendar" | "kumite" | "club" | "more";

export interface Route {
  id: string;
  path: string;
  name: string;
  tab: TabId;
  action: Requirement;
  icon: IconName;
  /** Label in the strip of sub-pages, when shorter than the name. */
  short?: string;
  /** Subtitle on the More page. */
  hint?: string;
  /** Group on the More page. */
  group?: "Me" | "Admin";
  /** Full-screen: hides the tabs and shows its own back bar (editors, the game clock). */
  focus?: boolean;
}

export const ROUTES: Route[] = [
  { id: "home", path: "/", name: "Home", tab: "home", action: "authenticated", icon: "home" },

  { id: "calendar", path: "/calendar", name: "Calendar", tab: "calendar", action: "read:Event", icon: "calendar" },
  { id: "teams", path: "/calendar/teams", name: "Teams", tab: "calendar", action: "read:Event", icon: "teams" },
  {
    id: "register",
    path: "/calendar/register",
    name: "Register",
    tab: "calendar",
    action: "record:Attendance",
    icon: "check",
  },

  { id: "kumite", path: "/kumite", name: "Games", tab: "kumite", action: "read:Event", icon: "trophy" },
  {
    id: "standings",
    path: "/kumite/standings",
    name: "Standings",
    tab: "kumite",
    action: "read:Event",
    icon: "list",
  },
  { id: "draft", path: "/kumite/draft", name: "Draft", tab: "kumite", action: "read:Event", icon: "draft" },
  {
    id: "game",
    path: "/kumite/game",
    name: "Game clock",
    tab: "kumite",
    action: "score:Match",
    icon: "clock",
    focus: true,
  },

  { id: "club", path: "/club", name: "Roster", tab: "club", action: "authenticated", icon: "teams" },
  { id: "upload", path: "/club/upload", name: "Upload", tab: "club", action: "upload:Photo", icon: "upload" },

  { id: "more", path: "/more", name: "More", tab: "more", action: "authenticated", icon: "more" },
  {
    id: "profile",
    path: "/more/profile",
    name: "Profile",
    tab: "more",
    action: "authenticated",
    icon: "user",
    group: "Me",
    hint: "Your details, position and photo",
  },
  {
    id: "tab",
    path: "/more/tab",
    name: "My tab",
    tab: "more",
    action: "authenticated",
    icon: "pound",
    group: "Me",
    hint: "What you owe and how to pay",
  },
  {
    id: "members",
    path: "/more/members",
    name: "Members",
    tab: "more",
    action: "manage:Member",
    icon: "teams",
    group: "Admin",
    hint: "Approve requests, assign roles",
  },
  {
    id: "roles",
    path: "/more/roles",
    name: "Roles",
    tab: "more",
    action: "manage:Role",
    icon: "key",
    group: "Admin",
    hint: "What each role can do",
  },
  {
    id: "fees",
    path: "/more/fees",
    name: "Fees",
    tab: "more",
    action: "manage:Fees",
    icon: "pound",
    group: "Admin",
    hint: "Quarterly subscription and per-session fee",
  },
  {
    id: "overdue",
    path: "/more/overdue",
    name: "Overdue Rentals",
    tab: "more",
    action: "read:Dues",
    icon: "tape",
    group: "Admin",
    hint: "Who owes what, and for how long",
  },
];

export const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "kumite", label: "Kumite", icon: "trophy" },
  { id: "club", label: "Club", icon: "teams" },
  { id: "more", label: "More", icon: "more" },
];

export const routeFor = (path: string): Route | undefined =>
  ROUTES.find((r) => r.path === path) ?? ROUTES.find((r) => r.path !== "/" && path.startsWith(r.path + "/"));
