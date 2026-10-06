// Phone tabs, derived from the route tree. Each tab remembers the last page used in it.
import { can, type Action } from "../access/actions";
import { ROUTES, TABS, type Route, type TabId } from "./nav-routes";

/** The routes a member can see in a tab, in tree order. Focus screens are reached from a page, not the strip. */
export const tabRoutes = (tab: TabId, granted: ReadonlySet<Action>): Route[] =>
  ROUTES.filter((r) => r.tab === tab && !r.focus && can(granted, r.action));

/** The pages shown in a tab's top strip: only when there's more than one. The More tab uses its own page. */
export const stripRoutes = (tab: TabId, granted: ReadonlySet<Action>): Route[] => {
  if (tab === "more") return [];
  const routes = tabRoutes(tab, granted);
  return routes.length > 1 ? routes : [];
};

/** Where a tab goes: the last page used in it, if the member can still see it, else its first page. */
export function tabHref(tab: TabId, granted: ReadonlySet<Action>, last: Partial<Record<TabId, string>>): string {
  const routes = tabRoutes(tab, granted);
  const remembered = last[tab];
  if (remembered && routes.some((r) => r.path === remembered)) return remembered;
  return routes[0]?.path ?? "/";
}

export const tabs = () => TABS;
