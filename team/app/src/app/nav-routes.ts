// The route tree, built from the schedule (ADR 0030): one page per training series, and a section per tournament
// type with its Games, Standings and Draft. Admins add a training or a tournament type in Settings and it appears
// here. Phone tabs are derived from the same tree (mobile-nav.ts), so the two can't drift apart. Each route
// declares the action it needs (ADR 0024).
import type { Requirement } from "../access/actions";
import type { IconName } from "./shell/icons";

export type TabId = "home" | "training" | "calendar" | "tournaments" | "more";

/** Groups under More (phone) and in the rail (desktop). */
export type Group = "Club" | "You" | "Settings";

export interface Route {
  id: string;
  path: string;
  name: string;
  tab: TabId;
  action: Requirement;
  icon: IconName;
  /** Which page component renders it (App.svelte), and its props. */
  page: string;
  params?: Record<string, number>;
  /** Label in the strip of sub-pages, when shorter than the name. */
  short?: string;
  /** Subtitle on the More page. */
  hint?: string;
  group?: Group;
  /** Sub-heading inside Settings. */
  section?: "People" | "Schedule" | "Money" | "Club";
  /** The folding rail section it sits in: a tournament type ("type:1"). */
  fold?: string;
  /** Reached from a page, not from any menu (the register). */
  hidden?: boolean;
  /** Full-screen: hides the tabs and shows its own back bar (the game clock). */
  focus?: boolean;
}

export interface Fold {
  id: string;
  name: string;
  icon: IconName;
}

/** What the menu is built from: the configured trainings and tournament types. */
export interface NavConfig {
  series: { id: number; slug: string; name: string; shortName: string; icon: IconName; active: boolean }[];
  types: {
    id: number;
    slug: string;
    name: string;
    shortName: string;
    icon: IconName;
    draft: boolean;
    active: boolean;
  }[];
  /** Members, for their profile pages under Settings → Members. */
  members?: { id: number; name: string }[];
}

const STATIC_TAIL: Route[] = [
  { id: "more", path: "/more", name: "More", tab: "more", page: "more", action: "authenticated", icon: "more" },
  {
    id: "teammates",
    path: "/more/teammates",
    name: "Teammates",
    tab: "more",
    page: "teammates",
    action: "authenticated",
    icon: "user",
    group: "Club",
    hint: "Everyone who plays",
  },
  {
    id: "upload",
    path: "/more/upload",
    name: "Upload",
    tab: "more",
    page: "upload",
    action: "upload:Photo",
    icon: "upload",
    group: "Club",
    hint: "Photos to the website; videos on YouTube",
  },
  {
    id: "profile",
    path: "/me",
    name: "Profile",
    tab: "more",
    page: "profile",
    action: "authenticated",
    icon: "user",
    group: "You",
    hint: "Your details, position and photo",
  },
  {
    id: "tab",
    path: "/me/tab",
    name: "Dues",
    tab: "more",
    page: "tab",
    action: "authenticated",
    icon: "pound",
    group: "You",
    hint: "Pay what you owe, and what you've paid",
  },
  {
    id: "roles",
    path: "/settings/roles",
    name: "Roles",
    tab: "more",
    page: "roles",
    action: "manage:Role",
    icon: "key",
    group: "Settings",
    section: "People",
    hint: "What each role can do",
  },
  {
    id: "training-settings",
    path: "/settings/training",
    name: "Training",
    tab: "more",
    page: "training-settings",
    action: "manage:Training",
    icon: "stick",
    group: "Settings",
    section: "Schedule",
    hint: "Repeating sessions: when, where, how many",
  },
  {
    id: "tournament-settings",
    path: "/settings/tournaments",
    name: "Tournaments",
    tab: "more",
    page: "tournament-settings",
    action: "manage:Tournament",
    icon: "trophy",
    group: "Settings",
    section: "Schedule",
    hint: "Tournament types and each one's dates",
  },
  {
    id: "fees",
    path: "/settings/fees",
    name: "Quarterly rate",
    tab: "more",
    page: "fees",
    action: "manage:Fees",
    icon: "pound",
    group: "Settings",
    section: "Money",
    hint: "The quarterly fee (session fees are on each training)",
  },
  {
    id: "overdue",
    path: "/settings/overdue",
    name: "Overdue Rentals",
    tab: "more",
    page: "overdue",
    action: "read:Dues",
    icon: "tape",
    group: "Settings",
    section: "Money",
    hint: "Who owes what, and for how long",
  },
  {
    id: "quips",
    path: "/settings/quips",
    name: "Quips",
    tab: "more",
    page: "quips",
    action: "manage:Quip",
    icon: "chat",
    group: "Settings",
    section: "Club",
    hint: "What Home says when people sign up",
  },
];

export function buildRoutes(config: NavConfig): Route[] {
  const series = config.series.filter((s) => s.active);
  const types = config.types.filter((t) => t.active);
  return [
    { id: "home", path: "/", name: "Home", tab: "home", page: "home", action: "authenticated", icon: "home" },
    ...series.flatMap((s): Route[] => [
      {
        id: `training:${s.id}`,
        path: `/training/${s.slug}`,
        name: s.name,
        short: s.shortName,
        tab: "training",
        page: "training",
        params: { seriesId: s.id },
        action: "read:Event",
        icon: s.icon,
      },
    ]),
    ...(config.members ?? []).map((m): Route => ({
      id: `member:${m.id}`,
      path: `/more/teammates/${m.id}`,
      name: m.name,
      tab: "more",
      // Teammates, with this member's big card open
      page: "teammates",
      params: { memberId: m.id },
      action: "manage:Member",
      icon: "user",
      hidden: true,
    })),
    {
      id: "calendar",
      path: "/calendar",
      name: "Calendar",
      tab: "calendar",
      page: "calendar",
      action: "read:Event",
      icon: "calendar",
    },
    ...types.flatMap((t): Route[] => {
      const base = { tab: "tournaments" as const, params: { typeId: t.id }, fold: `type:${t.id}` };
      return [
        {
          ...base,
          id: `games:${t.id}`,
          path: `/tournaments/${t.slug}`,
          name: "Games",
          page: "games",
          action: "read:Event",
          icon: "trophy",
        },
        {
          ...base,
          id: `standings:${t.id}`,
          path: `/tournaments/${t.slug}/standings`,
          name: "Standings",
          page: "standings",
          action: "read:Event",
          icon: "list",
        },
        ...(t.draft
          ? [
              {
                ...base,
                id: `draft:${t.id}`,
                path: `/tournaments/${t.slug}/draft`,
                name: "Draft",
                page: "draft",
                action: "read:Event" as const,
                icon: "draft" as const,
              },
            ]
          : []),
        {
          ...base,
          id: `game:${t.id}`,
          path: `/tournaments/${t.slug}/game`,
          name: "Game clock",
          page: "game",
          action: "score:Match",
          icon: "clock",
          focus: true,
        },
      ];
    }),
    ...STATIC_TAIL,
  ];
}

/** Rail sections that fold: one per tournament type. */
export const buildFolds = (config: NavConfig): Fold[] =>
  config.types.filter((t) => t.active).map((t) => ({ id: `type:${t.id}`, name: t.name, icon: t.icon }));

/** Phone tabs. With one training or one tournament type, the tab takes its short name ("Friday", "Kumite"). */
export function buildTabs(config: NavConfig): { id: TabId; label: string; icon: IconName }[] {
  const series = config.series.filter((s) => s.active);
  const types = config.types.filter((t) => t.active);
  return [
    { id: "home", label: "Home", icon: "home" },
    ...(series.length
      ? [
          {
            id: "training" as const,
            label: series.length === 1 ? series[0].shortName : "Training",
            icon: series.length === 1 ? series[0].icon : ("stick" as IconName),
          },
        ]
      : []),
    { id: "calendar", label: "Calendar", icon: "calendar" },
    ...(types.length
      ? [
          {
            id: "tournaments" as const,
            label: types.length === 1 ? types[0].shortName : "Tournaments",
            icon: types.length === 1 ? types[0].icon : ("trophy" as IconName),
          },
        ]
      : []),
    { id: "more", label: "More", icon: "more" },
  ];
}

export const routeFor = (routes: Route[], path: string): Route | undefined =>
  routes.find((r) => r.path === path) ?? routes.find((r) => r.path !== "/" && path.startsWith(r.path + "/"));
