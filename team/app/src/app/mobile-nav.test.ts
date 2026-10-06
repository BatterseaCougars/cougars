import { describe, expect, it } from "vitest";
import type { Action } from "../access/actions";
import { stripRoutes, tabHref, tabRoutes } from "./mobile-nav";
import { buildRoutes, buildTabs, routeFor, type NavConfig } from "./nav-routes";

const member = new Set<Action>(["read:Event", "signup:Event"]);
const admin = new Set<Action>(["manage:all"]);

const friday = {
  id: 1,
  slug: "friday",
  name: "Friday Training",
  shortName: "Friday",
  icon: "stick" as const,
  active: true,
};
const sunday = {
  id: 2,
  slug: "sunday",
  name: "Sunday Skills",
  shortName: "Sunday",
  icon: "skate" as const,
  active: true,
};
const kumite = {
  id: 1,
  slug: "kumite",
  name: "The Cougars Kumite",
  shortName: "Kumite",
  icon: "swords" as const,
  draft: true,
  active: true,
};
const cup = {
  id: 2,
  slug: "cup",
  name: "Summer Cup",
  shortName: "Cup",
  icon: "trophy" as const,
  draft: false,
  active: true,
};

const one: NavConfig = { series: [friday], types: [kumite] };
const many: NavConfig = { series: [friday, sunday], types: [kumite, cup] };

describe("buildRoutes", () => {
  it("makes a page per training and a section per tournament type", () => {
    const routes = buildRoutes(many);
    expect(routes.filter((r) => r.page === "training").map((r) => r.path)).toEqual([
      "/training/friday",
      "/training/sunday",
    ]);
    expect(routes.filter((r) => r.fold === "type:2").map((r) => r.name)).toEqual(["Games", "Standings", "Game clock"]);
  });

  it("leaves paused trainings out", () => {
    const routes = buildRoutes({ ...many, series: [friday, { ...sunday, active: false }] });
    expect(routeFor(routes, "/training/sunday")?.page).not.toBe("training");
  });
});

describe("buildTabs", () => {
  it("names the tab after the only training or tournament", () => {
    expect(buildTabs(one).map((t) => t.label)).toEqual(["Home", "Friday", "Calendar", "Kumite", "More"]);
    expect(buildTabs(many).map((t) => t.label)).toEqual(["Home", "Training", "Calendar", "Tournaments", "More"]);
  });
});

describe("tabRoutes", () => {
  it("hides pages reached from a page, and pages the member can't use", () => {
    const routes = buildRoutes(one);
    expect(tabRoutes(routes, "training", admin).map((r) => r.id)).toEqual(["training:1"]);
    expect(tabRoutes(routes, "more", member).map((r) => r.id)).not.toContain("members");
  });
});

describe("stripRoutes", () => {
  it("lists every training when there are several", () => {
    const routes = buildRoutes(many);
    expect(stripRoutes(routes, routeFor(routes, "/training/friday")!, member).map((r) => r.name)).toEqual([
      "Friday Training",
      "Sunday Skills",
    ]);
  });

  it("keeps a tournament's strip to its own pages", () => {
    const routes = buildRoutes(many);
    expect(stripRoutes(routes, routeFor(routes, "/tournaments/cup")!, member).map((r) => r.name)).toEqual([
      "Games",
      "Standings",
    ]);
  });
});

describe("tabHref", () => {
  it("returns to the last page used in the tab, unless it's gone", () => {
    const routes = buildRoutes(one);
    expect(tabHref(routes, "tournaments", admin, { tournaments: "/tournaments/kumite/standings" })).toBe(
      "/tournaments/kumite/standings",
    );
    expect(tabHref(routes, "training", member, { training: "/training/sunday" })).toBe("/training/friday");
  });
});
