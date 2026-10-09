# 0084. The Sticker colour scheme

- **Status:** Accepted
- **Date:** 2026-10-08
- **Supersedes:** [0083](0083-main-button-is-vcr-blue.md)

## Context

The team app's colours had grown one at a time. Red was the brand, "live", danger, the focus ring and a team colour;
green was in, paid and a team colour; amber was heads-up and a team colour; blue had just become the main button and
was a team colour too. The six schedule and team tones were picked by eye at different weights, about thirty literal
colours sat outside the tokens (the trading card, the Draft, Game), and three calls to action were red fills. The
VCR-blue main button (ADR 0083) stood out but looked like a web framework's default.

Three whole schemes were compared on the same screen in the brand document (Cougars Brand): Sticker, Signal (indigo)
and One red.

## Decision

The **Sticker** scheme, one system the whole app follows:

- **Carbon and bone**: one warm ramp (OKLCH hue 70) for surfaces (`--bg`, `--surface-1..3`) and ink (`--fg`,
  `--fg-body`, `--fg-muted`, `--fg-subtle`), so greys and words belong together.
- **Cougar red** (`--red`, `--red-hot` for words) is the brand: the logo, the title slash, section titles, the switch,
  live, and danger. Red fills only an armed "are you sure" and a count on the dock.
- **One action colour**: the website's sticker yellow (`--action: #ffd60a`) with carbon words (13.8:1), for the main
  button only: one per group, nothing else. The calls to action that were red fills (Watch a live game, Go to the
  draft on your turn, End turn) are main buttons.
- **Three statuses, one job each, always with a word**: success green (in, paid), heads-up orange (`--caution`, so
  yellow means only "tap here"), live/danger red.
- **Six tones at one lightness** (OKLCH 0.74) for trainings, tournaments and teams: crests, chips and dots, never a
  card fill. The red tone is coral, so a team never looks live.
- **The trading card** keeps its printed colours as tokens (`--card-stock`, `--card-ink`, `--card-band`).
- Colours live in `app.css` tokens; a component doesn't type a colour of its own.

## Consequences

- One look across the app and the brand document; a new screen picks from the tokens.
- Yellow is loud, so the one-per-group rule matters: two yellow buttons in a row is a bug.
- `--amber*` is now `--caution*`. The brand document holds the same values; change both together.
