# 0091. A tournament series has usual hours

- **Status:** Accepted. Amends [0087](0087-next-tournament-in-three-questions.md).
- **Date:** 2026-10-09

## Context

New tournaments started at 11:00–16:00, a weekend day's hours. The Kumite is usually instead of Friday training, at
its time (19:30–21:30), so every new one needed its hours changed in Advanced.

## Decision

- **A series has a usual start and end** (`default_start_time`, `default_end_time`), set in its settings (Settings →
  Tournament Series → When, where and fee) beside its place and fee. Each new tournament in it starts with them; it
  can change them for itself.
- **The quick form shows them**: Starts and Ends under "When is it?", filled in from the series, to change for this
  one.
- **The server fills them in** for a new tournament that doesn't say, as it does the series' fee and rules.
- The club's seed has the Kumite at Friday training's hours (19:30–21:30, from Friday Training's own times).

## Consequences

- A series made before this (an existing database) keeps 11:00–16:00 until an admin sets its hours.
