// One route tree for phone and desktop (the Gwenda ops pattern). The phone tabs are derived from it in
// mobile-nav.ts, so the two can't drift apart. Each route declares the action it needs (ADR 0024).
//
// What a member uses most comes first: Home (am I in, what team), then Friday (who's in, the teams). Club pages,
// your account and the admin Settings live under More on a phone; on desktop the rail lists them, with Settings
// folding open, and your account sits in the badge top right.
import type { Requirement } from "../access/actions";
import type { IconName } from "./shell/icons";

export type TabId = "home" | "friday" | "calendar" | "kumite" | "more";

/** Groups under More (phone) and in the rail (desktop). */
export type Group = "Club" | "You" | "Settings";

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
  group?: Group;
  /** Sub-heading inside Settings. */
  section?: "People" | "Money";
  /** Full-screen: hides the tabs and shows its own back bar (editors, the game clock). */
  focus?: boolean;
}

export const ROUTES: Route[] = [
  { id: "home", path: "/", name: "Home", tab: "home", action: "authenticated", icon: "home" },

  { id: "friday", path: "/friday", name: "Friday", short: "Teams", tab: "friday", action: "read:Event", icon: "teams" },
  {
    id: "register",
    path: "/friday/register",
    name: "Register",
    tab: "friday",
    action: "record:Attendance",
    icon: "check",
  },

  { id: "calendar", path: "/calendar", name: "Calendar", tab: "calendar", action: "read:Event", icon: "calendar" },

  { id: "kumite", path: "/kumite", name: "Games", tab: "kumite", action: "read:Event", icon: "trophy" },
  { id: "standings", path: "/kumite/standings", name: "Standings", tab: "kumite", action: "read:Event", icon: "list" },
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

  { id: "more", path: "/more", name: "More", tab: "more", action: "authenticated", icon: "more" },
  {
    id: "roster",
    path: "/more/roster",
    name: "Roster",
    tab: "more",
    action: "authenticated",
    icon: "user",
    group: "Club",
    hint: "Everyone in the club",
  },
  {
    id: "upload",
    path: "/more/upload",
    name: "Upload",
    tab: "more",
    action: "upload:Photo",
    icon: "upload",
    group: "Club",
    hint: "Photos to the website, videos to YouTube",
  },
  {
    id: "profile",
    path: "/me",
    name: "Profile",
    tab: "more",
    action: "authenticated",
    icon: "user",
    group: "You",
    hint: "Your details, position and photo",
  },
  {
    id: "tab",
    path: "/me/tab",
    name: "My tab",
    tab: "more",
    action: "authenticated",
    icon: "pound",
    group: "You",
    hint: "What you owe and how to pay",
  },
  {
    id: "members",
    path: "/settings/members",
    name: "Members",
    tab: "more",
    action: "manage:Member",
    icon: "teams",
    group: "Settings",
    section: "People",
    hint: "Approve requests, assign roles",
  },
  {
    id: "roles",
    path: "/settings/roles",
    name: "Roles",
    tab: "more",
    action: "manage:Role",
    icon: "key",
    group: "Settings",
    section: "People",
    hint: "What each role can do",
  },
  {
    id: "fees",
    path: "/settings/fees",
    name: "Fees",
    tab: "more",
    action: "manage:Fees",
    icon: "pound",
    group: "Settings",
    section: "Money",
    hint: "Quarterly subscription and per-session fee",
  },
  {
    id: "overdue",
    path: "/settings/overdue",
    name: "Overdue Rentals",
    tab: "more",
    action: "read:Dues",
    icon: "tape",
    group: "Settings",
    section: "Money",
    hint: "Who owes what, and for how long",
  },
];

export const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "friday", label: "Friday", icon: "teams" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "kumite", label: "Kumite", icon: "trophy" },
  { id: "more", label: "More", icon: "more" },
];

export const routeFor = (path: string): Route | undefined =>
  ROUTES.find((r) => r.path === path) ?? ROUTES.find((r) => r.path !== "/" && path.startsWith(r.path + "/"));
