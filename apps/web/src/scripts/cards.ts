// Squad cards: press to flip, and (with a mouse) tilt towards the pointer.
// Delegated listeners, added once; they survive view-transition page swaps.
const MAX_TILT = 9; // degrees
const canTilt = () =>
  window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const cardAt = (e: Event) => (e.target as Element | null)?.closest<HTMLElement>("[data-card]") ?? null;

document.addEventListener("click", (e) => {
  const card = cardAt(e);
  if (!card) return;
  card.setAttribute("aria-pressed", String(card.getAttribute("aria-pressed") !== "true"));
});

document.addEventListener("pointermove", (e) => {
  const card = cardAt(e);
  if (!card || !canTilt()) return;
  const r = card.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  const flipped = card.getAttribute("aria-pressed") === "true";
  card.classList.add("is-tilting");
  card.style.setProperty("--ry", `${(x - 0.5) * 2 * MAX_TILT}deg`);
  card.style.setProperty("--rx", `${(0.5 - y) * 2 * MAX_TILT * (flipped ? -1 : 1)}deg`);
  card.style.setProperty("--mx", `${x * 100}%`);
  card.style.setProperty("--my", `${y * 100}%`);
});

document.addEventListener(
  "pointerleave",
  (e) => {
    const card = e.target instanceof Element && e.target.matches("[data-card]") ? (e.target as HTMLElement) : null;
    if (!card) return;
    card.classList.remove("is-tilting");
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  },
  true,
);
