// One highlight shape per nav that glides to the current item (the Gwenda ops pattern). The nav owns an
// absolutely positioned element; `shape` says what box to draw around the element carrying `data-mark`.
import { easeOut, prefersReducedMotion } from "../motion";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

export type Shape = (target: HTMLElement, nav: HTMLElement) => Box;

const MS = 320;

/** The item's whole row, as a soft wash. */
export const rowShape: Shape = (el, nav) => {
  const r = el.getBoundingClientRect();
  const n = nav.getBoundingClientRect();
  return { x: r.left - n.left + nav.scrollLeft, y: r.top - n.top + nav.scrollTop, w: r.width, h: r.height, r: 10 };
};

/** A pill behind the icon of a bottom tab. */
export const pillShape: Shape = (el, nav) => {
  const icon = (el.querySelector("[data-mark-anchor]") ?? el).getBoundingClientRect();
  const n = nav.getBoundingClientRect();
  const w = 56;
  const h = 30;
  return {
    x: icon.left + icon.width / 2 - n.left - w / 2,
    y: icon.top + icon.height / 2 - n.top - h / 2,
    w,
    h,
    r: h / 2,
  };
};

/** A 2px underline the width of the label. */
export const underlineShape: Shape = (el, nav) => {
  const r = el.getBoundingClientRect();
  const n = nav.getBoundingClientRect();
  const inset = 8;
  return { x: r.left - n.left + nav.scrollLeft + inset, y: r.bottom - n.top - 2, w: r.width - inset * 2, h: 2, r: 1 };
};

const lerp = (a: Box, b: Box, t: number): Box => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
  r: a.r + (b.r - a.r) * t,
});

export function createMark(nav: HTMLElement, mark: HTMLElement, shape: Shape) {
  let current: Box | null = null;
  let frame = 0;

  const draw = (b: Box | null) => {
    current = b;
    if (!b) {
      mark.style.opacity = "0";
      return;
    }
    mark.style.opacity = "1";
    mark.style.transform = `translate(${b.x}px, ${b.y}px)`;
    mark.style.width = `${b.w}px`;
    mark.style.height = `${b.h}px`;
    mark.style.borderRadius = `${b.r}px`;
  };

  const target = (): Box | null => {
    const el = nav.querySelector<HTMLElement>("[data-mark]");
    return el && el.offsetParent ? shape(el, nav) : null;
  };

  function move(animate = true) {
    cancelAnimationFrame(frame);
    const from = current;
    const to = target();
    if (!animate || !from || !to || prefersReducedMotion) {
      draw(to);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / MS);
      const dest = target() ?? to;
      draw(lerp(from, dest, easeOut(t)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }

  const ro = new ResizeObserver(() => move(false));
  ro.observe(nav);

  return {
    move,
    destroy() {
      cancelAnimationFrame(frame);
      ro.disconnect();
    },
  };
}

/**
 * Svelte action for a nav: `use:glide={{ shape, key }}`. The nav's first `[data-glide]` child is the mark; it
 * glides whenever `key` changes (the current page, a group opening). Works for navs that mount later, too.
 */
export function glide(nav: HTMLElement, params: { shape: Shape; key: unknown }) {
  const el = nav.querySelector<HTMLElement>("[data-glide]");
  if (!el) return {};
  const mark = createMark(nav, el, params.shape);
  mark.move(false);
  return {
    update() {
      requestAnimationFrame(() => mark.move(true));
    },
    destroy: () => mark.destroy(),
  };
}
