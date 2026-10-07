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
  const flipped = card.getAttribute("aria-pressed") !== "true";
  card.setAttribute("aria-pressed", String(flipped));
  if (flipped) void refresh(card);
});

// A roster player's card shows the details from the last build; when it's flipped, fetch the latest and change
// whatever differs (docs/adr/0043-roster-from-the-club.md). Quietly does nothing if it fails.
async function refresh(card: HTMLElement) {
  const id = card.dataset.playerId;
  if (!id) return;
  let player: { name: string; position: string | null; quote: string | null };
  try {
    const res = await fetch(`/api/players/${id}`);
    if (!res.ok) return;
    player = await res.json();
  } catch {
    return;
  }
  const set = (field: string, text: string) => {
    for (const el of card.querySelectorAll<HTMLElement>(`[data-field="${field}"]`)) {
      if (el.textContent !== text) el.textContent = text;
      el.hidden = !text;
    }
  };
  set("name", player.name);
  if (player.position) set("position", player.position);
  set("quote", player.quote ? `“${player.quote}”` : "");
  card.setAttribute("aria-label", `${player.name}: flip card`);
}

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
