# 0078. One page frame: every title in the same place, editors in the page's column

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The team app's pages came in two widths on a desktop: `.page`, a column centred at about 60% of the window, and
`.page.wide` (76rem), centred too. Training, Teammates and every tournament page were wide, while Home, Calendar and
Upload were narrow, so going between them on the dock moved the title 176px sideways at 1440px. Titles also sat at
three heights: pages with an eyebrow pushed theirs down, and Home had its own taller header. In Settings, the
tournaments table was wide and sat apart from every other settings page.

Editor panels (EditorPanel, MemberSheet) were 60rem, centred in the space beside the dock: never the width of the
cards they opened from.

## Decision

- On a desktop every page is the same frame (`--page-max`, 76rem) and its content keeps a reading width (52rem)
  from the frame's left edge. A page that needs the room (the Draft, Teammates, Settings → Tournaments) is
  `.page.full` and uses the whole frame. `wide` and `wide reading` are gone.
- Every title is at the same height: PageHeader keeps the eyebrow's line on a desktop even when there's none, and
  Home's own header matches it.
- An editor panel opens in the page's column: the same left edge and width as the content under it
  (`lib/page-column.ts`), the reading width or the whole frame for a `.full` page. Phones are unchanged: full screen.
- Settings keeps its list beside the dock, so its pages share their own left edge, all of them.

## Consequences

- Nothing moves sideways or up and down when you go between pages, and a panel reads as the card grown.
- On a very wide window a reading page sits left of centre with room on its right. That's the cost of one edge.
- A new page gets `class="page"`, or `page full` if it really needs the width. Don't centre a page on its own.
