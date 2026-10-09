# 0083. The main button is VCR blue

- **Status:** Superseded by [0084](0084-sticker-colour-scheme.md)
- **Date:** 2026-10-08

## Context

The team app's main button (`.btn.primary`) has been through a red fill (lost among the brand's red titles, read as an
error), a cream fill (glared on the dark page) and a cream edge on a 12% cream wash, which read as grey and not
prominent enough. A brighter wash, a glow and a red slash were tried in the brand document (Cougars Brand) and all
still read grey: the main button needs a colour of its own. Red is the brand, green means in and paid, amber means
heads-up. Blue means nothing in the app, and it is the club's already: the website's 404 is a VCR's blue no-signal
screen (`--vcr-blue`).

## Decision

- The main button is solid **VCR blue**, `--action: #1f5eff` (the website's `#1420c8` lifted so it stands out on the dark
  panels), white words (`--on-action`, 5.1:1), `--action-hover: #3a71ff`. No edge.
- The same goes for every main-button look: `.btn.primary`, the one in a bar, the floating action button (Fab) and
  the Draft's Pick when pointed at.
- Blue is for the main action only. It doesn't mark state, links or anything else, so it keeps meaning "this one".
- A disabled main or outline button drops to a faint edge and `fg-subtle` words. It used to keep its look and seem
  live, because `.btn:disabled` sat above the kinds at the same weight.
- `--primary` (cream) stays as ink on red: the kanji seal and the tournament stamp.

## Consequences

- One clear button per row, on a phone and a desktop.
- A second colour beside the club's red. The rule that keeps it calm: one blue button per group, never a blue fill for
  anything else.
- The brand document (Cougars Brand) holds the same values; change it with the app.
