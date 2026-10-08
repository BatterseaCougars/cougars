// Live pages follow along by checking for changes (ADR 0072): a game being scored, the tournament's home while a
// game's on, the draft room while it's open. Each check is a request against the club's free daily allowance, so how
// often is the admins' setting (Usage), and a page says so. Only while the page is in view; the brake (ADR 0058)
// still has the last word.
import { refreshIfChanged } from "../app/backend.svelte";
import { db } from "../demo/store.svelte";

/** Seconds between checks, as the admins set it. */
export const liveRefreshSeconds = () => db.settings.liveRefreshSeconds;

/** As a page says it: "every 10 seconds". */
export const everyHowOften = () => {
  const s = liveRefreshSeconds();
  return s % 60 === 0 ? `every ${s === 60 ? "minute" : `${s / 60} minutes`}` : `every ${s} seconds`;
};

/**
 * Check for changes now, as the page opens (what the app already had may be minutes old), then on the setting's beat:
 * call in an effect (it follows the setting), and return what it returns.
 */
export function checkForUpdates() {
  const check = () => {
    if (document.visibilityState === "visible") refreshIfChanged().catch(() => {});
  };
  check();
  const t = setInterval(check, liveRefreshSeconds() * 1000);
  return () => clearInterval(t);
}
