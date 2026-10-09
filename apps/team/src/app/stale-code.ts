// An open app whose code has changed underneath it: a deploy renames the app's files, and the dev server's restart
// renames its bundled libraries. A page then asks for a file that's gone, and the import fails. Reloading picks up the
// new files; once, so a real failure isn't hidden behind a reload loop.

/** A part of the app that won't load, in each browser's words (not the API being unreachable). */
export const isStaleCode = (e: unknown) =>
  e instanceof Error &&
  /dynamically imported module|Importing a module script failed|Outdated Optimize Dep/i.test(e.message);

const KEY = "cougars:reloaded-for-new-code";
/** Within this long of the last reload, it didn't help: stop and say so. */
const QUIET_MS = 60_000;

interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Reloads for the new code, unless that was just tried. True if it reloaded. */
export function recoverOnce(store: Store, reload: () => void, now = () => Date.now()) {
  let last = 0;
  try {
    last = Number(store.getItem(KEY)) || 0;
  } catch {
    // storage off: treated as never reloaded, and the write below decides
  }
  if (now() - last < QUIET_MS) return false;
  try {
    store.setItem(KEY, String(now()));
  } catch {
    return false; // nowhere to remember it: a reload could loop
  }
  reload();
  return true;
}
