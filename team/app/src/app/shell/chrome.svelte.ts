// Trial chrome skins (the rail, top bar and tabs), so they can be compared in the real app before one is
// chosen. The choice sets data-chrome on <html>; the skins live in skins.css. Remembered per device.
export const CHROMES = [
  { id: "glass", label: "Glass" },
  { id: "boards", label: "Boards" },
  { id: "scoreboard", label: "Scoreboard" },
] as const;
export type Chrome = (typeof CHROMES)[number]["id"];

const KEY = "team.chrome";

function read(): Chrome {
  try {
    const v = localStorage.getItem(KEY);
    return CHROMES.some((c) => c.id === v) ? (v as Chrome) : "glass";
  } catch {
    return "glass";
  }
}

export const look = $state({ chrome: read() });

export function setChrome(c: Chrome) {
  look.chrome = c;
  document.documentElement.dataset.chrome = c;
  try {
    localStorage.setItem(KEY, c);
  } catch {
    // Private mode: the choice just isn't remembered.
  }
}

export function applyChrome() {
  const fromUrl = location.search.match(/[?&]chrome=([a-z]+)/)?.[1];
  setChrome(CHROMES.some((c) => c.id === fromUrl) ? (fromUrl as Chrome) : look.chrome);
}
