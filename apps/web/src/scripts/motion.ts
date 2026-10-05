// Site-wide motion, deliberately minimal: fade-in on scroll and the frosted
// header. Lifecycle pattern from gwenda-hackney/ark: one init per
// astro:page-load; an AbortController tears down the previous page's listeners.

const root = document.documentElement;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let pageAbort: AbortController | null = null;
let io: IntersectionObserver | null = null;

function onPage() {
  pageAbort?.abort();
  pageAbort = new AbortController();
  io?.disconnect();
  reveal();
  header(pageAbort.signal);
  sectionSpy(pageAbort.signal);
}

/** Home page: underline the nav link for the section in view. */
function sectionSpy(signal: AbortSignal) {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-section-link][href^="#"]')];
  const sections = links
    .map((a) => document.getElementById(a.hash.slice(1)))
    .filter((el): el is HTMLElement => el !== null);
  if (!sections.length) return;
  let raf = 0;
  const update = () => {
    raf = 0;
    const line = innerHeight * 0.35; // section "in view" once its top passes this line
    // The last section (in page order, whatever the nav order) whose top has passed the line
    let active = "";
    let best = -Infinity;
    for (const s of sections) {
      const top = s.getBoundingClientRect().top;
      if (top <= line && top > best) [active, best] = [s.id, top];
    }
    for (const a of links) {
      if (a.hash.slice(1) === active) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    }
  };
  update();
  addEventListener("scroll", () => (raf ||= requestAnimationFrame(update)), { passive: true, signal });
}

function reveal() {
  const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
  if (reduced() || root.classList.contains("navigation-restore")) {
    els.forEach((el) => el.classList.add("is-in"));
    return;
  }
  io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io?.unobserve(e.target);
      }),
    { threshold: 0.12, rootMargin: "0px 0px -32px 0px" },
  );
  els.forEach((el) => io!.observe(el));
}

/** Frosted header once scrolled, with hysteresis so it doesn't flicker (from ark). */
function header(signal: AbortSignal) {
  const el = document.querySelector<HTMLElement>("[data-header]");
  if (!el) return;
  const showAt = 40;
  const hideAt = showAt * 0.6;
  let on = false;
  let raf = 0;
  const update = () => {
    raf = 0;
    const y = scrollY;
    if (!on && y > showAt) on = true;
    else if (on && y < hideAt) on = false;
    el.classList.toggle("is-scrolled", on);
  };
  update();
  addEventListener("scroll", () => (raf ||= requestAnimationFrame(update)), { passive: true, signal });
}

// Back/forward: land in the final state with no entrance animation (ark's navigation-restore).
let traversing = false;
document.addEventListener("astro:before-preparation", (e) => {
  traversing = e.navigationType === "traverse";
});
// The swap replaces every <html> attribute, so re-apply the class afterwards.
document.addEventListener("astro:after-swap", () => root.classList.toggle("navigation-restore", traversing));
addEventListener("pageshow", (e) => e.persisted && root.classList.add("navigation-restore"));

document.addEventListener("astro:page-load", () => {
  onPage();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("navigation-restore")));
});
