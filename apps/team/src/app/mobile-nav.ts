// Phone tabs, derived from the route tree. Each tab remembers the last page used in it.
import { can, type Action } from "../access/actions";
import type { Route, TabId } from "./nav-routes";

/** The routes a member can see in a tab, in tree order. Full-screen and hidden pages are reached from a page. */
export const tabRoutes = (routes: Route[], tab: TabId, granted: ReadonlySet<Action>): Route[] =>
  routes.filter((r) => r.tab === tab && !r.focus && !r.hidden && can(granted, r.action));

/**
 * The pages in the strip along the top of a phone screen: the current tab's, and within a tournament type only
 * that type's. Shown only when there's more than one. The More tab uses its own page.
 */
export function stripRoutes(routes: Route[], current: Route, granted: ReadonlySet<Action>): Route[] {
  if (current.tab === "more") return [];
  const list = tabRoutes(routes, current.tab, granted).filter((r) => !current.fold || r.fold === current.fold);
  return list.length > 1 ? list : [];
}

/** Where a tab goes: the last page used in it, if the member can still see it, else its first page. */
export function tabHref(
  routes: Route[],
  tab: TabId,
  granted: ReadonlySet<Action>,
  last: Partial<Record<TabId, string>>,
): string {
  const list = tabRoutes(routes, tab, granted);
  const remembered = last[tab];
  if (remembered && list.some((r) => r.path === remembered)) return remembered;
  return list[0]?.path ?? "/";
}
