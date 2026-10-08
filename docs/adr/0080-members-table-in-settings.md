# 0080. The members table is a Settings page that fills the window

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

Teammates had two views for admins: cards (everyone's) and Rows, an AG Grid table of what an admin checks (rating,
role, plan, played, owes, email, phone). The table sat in the 76rem page frame (ADR 0078) with `domLayout:
autoHeight`, so its last columns were cut off at the frame's edge and the whole page scrolled, taking the header row
with it. The toggle also gave an everyday page an admin's tool.

## Decision

- The table moves to **Settings → Members** (`/settings/members`, Club section, `manage:Member`). Teammates is
  cards only, for everyone; it keeps the join requests and a card's tap opens the member sheet for an admin.
- Members is a `.page.fill`: past the frame, every bit of width beside the settings list to the window's edge, and
  the window's height. The table scrolls inside itself, its header row and the pinned Name column in view. On a
  short phone it keeps at least a few rows' height and the page scrolls too.
- Columns are as wide as what's in them (`fitCellContents`), any room left shared out, re-fitted when the rows
  change. Cells are tight (8px) so the table fits beside the settings list at 1440px; past that it scrolls sideways
  inside itself, never off the page.
- The settings list stays (ADR 0078): the title keeps its place, the table runs on to the right.

## Consequences

- An admin's table has the room it needs and its header never scrolls away; members never see a toggle they can't
  use.
- A narrow desktop window with long emails still scrolls the table sideways. Hiding the settings list on this page
  would give it ~250px more, at the cost of the title moving between settings pages.
- `.page.fill` is for a page that is one big table. Anything else stays `page` or `page full`.
