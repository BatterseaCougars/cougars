// One easing for the whole app (matches --ease in app.css). Reduced motion zeroes every duration.
import { cubicOut } from "svelte/easing";

export const prefersReducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The app's curve (--ease in app.css) for scripted animations: things arriving. */
export const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
/** Its mirror, for things leaving. */
export const EASE_IN = "cubic-bezier(0.7, 0, 0.84, 0)";

export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3.2);
export const fadeMs = prefersReducedMotion ? 0 : 160;
export const flyMs = prefersReducedMotion ? 0 : 320;

/** Full-screen pages (the game clock) zoom in from blurred to sharp, and drop back out. */
export function zoom(_node: Element, { out = false } = {}) {
  if (prefersReducedMotion) return { duration: 0 };
  return {
    duration: out ? 220 : 420,
    easing: out ? (t: number) => t * t * t : (t: number) => 1 - Math.pow(1 - t, 5),
    css: (t: number, u: number) =>
      `transform: scale(${(0.92 + 0.08 * t).toFixed(4)}); transform-origin: 50% 40%;` +
      ` filter: blur(${(8 * u).toFixed(2)}px); opacity: ${Math.min(1, t * 1.6).toFixed(3)};`,
  };
}

/**
 * Desktop settings list: slides out from behind the dock like a tape ejecting, blurred to sharp. `delay` staggers its
 * rows. Leaving, it's gone at once: the next page is already there, and the list sliding back lay over it.
 */
export function eject(_node: Element, { delay = 0, out = false, x = 28 } = {}) {
  if (prefersReducedMotion || out) return { duration: 0 };
  return {
    delay,
    duration: 460,
    easing: (t: number) => 1 - Math.pow(1 - t, 4),
    css: (t: number, u: number) =>
      `transform: translateX(${(-x * u).toFixed(2)}px); filter: blur(${(3 * u).toFixed(2)}px);` +
      ` opacity: ${Math.min(1, t * 1.4).toFixed(3)};`,
  };
}

export { cubicOut };
