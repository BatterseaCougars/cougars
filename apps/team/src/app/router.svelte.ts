// Client-side history routing. Links are plain <a href>; the shell intercepts same-origin clicks.
import { untrack } from "svelte";
import type { TabId } from "./nav-routes";

const LAST_KEY = "team.mobile.last";

function readLast(): Partial<Record<TabId, string>> {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** `from`: the page this one was opened from, in the app (null after a reload or the browser's back and forward). */
export const router = $state({ path: location.pathname, last: readLast(), from: null as string | null });

export function navigate(path: string, { replace = false } = {}) {
  if (path === router.path) return;
  if (replace) history.replaceState({}, "", path);
  else {
    history.pushState({}, "", path);
    router.from = router.path;
  }
  router.path = path;
}

/** Back where you came from, in the app; else to `fallback` (a reload, a link from outside). */
export function goBack(fallback: string) {
  if (router.from) history.back();
  else navigate(fallback, { replace: true });
}

/** Called from an effect: untracked, so writing `last` doesn't re-run the effect that called it. */
export function remember(tab: TabId, path: string) {
  untrack(() => {
    if (router.last[tab] === path) return;
    router.last = { ...router.last, [tab]: path };
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify(router.last));
    } catch {
      // Private mode: tabs just start at their first page.
    }
  });
}

addEventListener("popstate", () => {
  router.path = location.pathname;
  router.from = null;
});

/** Delegated click handler: route same-origin links without a reload. */
export function interceptLinks(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
  const a = (event.target as Element).closest("a");
  if (!a || a.target || a.hasAttribute("download") || a.origin !== location.origin) return;
  event.preventDefault();
  navigate(a.pathname);
}
