# 0101. The website and the team app share one icon: the C of COUGARS, traced from the logo

- **Status:** Accepted
- **Date:** 2026-10-06 · updated 2026-10-09

## Context

Browser tabs, bookmarks and home screens show a site's icon at 16 to 512 px. The full logo can't be read at tab size.
The website had a white Anton "C", slanted, on logo red; the team app had the cougar's face cropped from the logo, on
carbon, which was muddy at 16 px and didn't look like the website. Anton isn't the logo's lettering, so the website's
C didn't match the logo either.

## Decision

- **One set of icons for both apps**, written by `scripts/favicons.mjs` into `apps/web/public` and
  `apps/team/public`: `favicon.ico`, `favicon.png`, `apple-touch-icon.png` and the manifest's `icon-192.png`,
  `icon-512.png`, `icon-maskable-512.png`. Each app's manifest keeps its own name.
- **The letter is the logo's own C**, traced as a vector path from `apps/web/src/assets/cougars.png` (no font has
  it), white with the logo's black outline, on logo red (`#e5131f`). A path, not a crop of the picture, so it stays
  sharp at 512 px.
- Change it in the script and re-run it; never edit the PNGs by hand.

## Consequences

- The two apps can't be told apart by their tab icon; their titles do that.
- A new logo means tracing its C again.

## History

- 2026-10-06: The website's icon is a slanted Anton C on red; the team app's is the cougar's face on carbon.
- 2026-10-09: Both apps share one icon, the C traced from the logo instead of Anton.
