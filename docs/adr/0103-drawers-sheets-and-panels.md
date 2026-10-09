# 0103. A side drawer for working beside the page, a sheet for a short job, a panel for a whole editor

- **Status:** Proposed
- **Date:** 2026-10-09

## Context

The team app opens things over the page in three ways: a side drawer (`lib/Drawer`), a sheet (`lib/Sheet`: a
bottom sheet on a phone, a centred modal on a desktop) and an editor panel (`lib/EditorPanel`, the page's column on a
desktop, full screen on a phone). [0065](0065-page-frame-and-admin-actions.md) says admin jobs open over the page in
one of them, and its Manage menu is a sheet on a phone and a drawer on a desktop, but nothing said which to use when.
The only stated rule was a code comment (short forms that never grow go in a sheet), and a survey on 2026-10-09 found
16 drawers, 12 sheets and 4 editor panels, mostly well chosen but not always:

- Drawers were used well for lists you work through with the page in view: the register, a team's squad, the
  draft's players, the awards, an import's check, the pick log.
- But three short fixed forms were drawers (a fee rate, Set the score, Set the time), while the same kind of form
  elsewhere (a venue, a payment, a team's look) was a sheet.
- Game tools was a drawer on a phone too: full screen for one to four rows.
- Manage menus with one or two rows opened a full-height drawer that was mostly empty.

A drawer has a cost a sheet doesn't. It's tall and narrow, so it suits a list and wastes space on two fields. It also
leaves the page in view, which is only worth it if you need the page while you use it.

## Decision

**Pick by what's inside:**

| What it holds                                                                                       | Use                                       | Phone                                | Desktop                                  |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------ | ---------------------------------------- |
| A list that grows: ticking, searching or picking people or things (register, squad, awards, import) | **Side drawer**                           | full width                           | right, 26rem, the page visible beside it |
| Something read beside the page (the draft's rules, the pick log)                                    | **Side drawer**                           | full width                           | right                                    |
| A short form that never grows (about five fields at most) or a one-tap choice                       | **Sheet**                                 | bottom sheet                         | centred                                  |
| A menu of jobs (Manage, Scoring's tools, the account menu)                                          | **Sheet on a phone, drawer on a desktop** | bottom sheet                         | right drawer                             |
| A thing's whole editor: tabs, many fields, Save and Discard                                         | **Editor panel**                          | full screen                          | the page's column                        |
| A value inside a form (a time, a role, a date)                                                      | **Pop-over** (Select, DateField)          | admin forms only; members get Choice | —                                        |

**Menus of jobs**

- Each row is an icon, a label and one line saying what it does. That line is why a menu is a drawer on a desktop
  rather than a drop-down: there's room to explain.
- A menu with only one job isn't a menu. In the gear's place goes that job's own button (a Session lead on a training
  night before the teams are made has only Add player), or the gear opens it directly when the job is the settings
  (a tournament whose series has no awards). The exception is a job you'd not want done by a stray tap (Hand over,
  the scorekeeper's only tool before kick-off): its sheet stays, as the second step.
- A row closes the menu before its job opens, so there's never a drawer on a drawer.
- A job from a menu opens in the same kind of layer as the menu, never a drawer and then a sheet. If a job belongs in
  a sheet, its way in is the thing itself on the page (tap the clock to set the time), not a menu row. A menu row
  either does its job there and then (Take back last goal) or opens a drawer or panel.

**Stacking**

- One overlay at a time. The exceptions are a pop-over inside a form, and a short sheet opened from an editor panel
  (a member's Charge, Adjust and Record a payment).
- Every overlay renders outside the page: a native `<dialog>` (Sheet) or moved to `<body>` (`lib/portal.ts`).
  Inside the page, the page's own stacking context put the desktop dock and corners above a drawer's scrim.
- Escape closes the top layer only: a pop-over's Escape (`defaultPrevented`) leaves the drawer or panel open.

**Buttons**

- A sheet's or drawer's main action sits in its footer, not at the end of the body, so it's always in reach.

## Consequences

- To bring the app in line with this:
  - Fees' rate and Set the score become sheets.
  - Set the time becomes a sheet opened by tapping the scoresheet's clock, and leaves Game tools. What's left there
    (Take back last goal, Full time now, Hand over) is done in the menu, so it becomes a sheet on a phone, opened from
    Scoring in the top bar instead of a banner over the clock. (Done 2026-10-09.)
  - A Manage menu that has a single job opens that job directly.
  - The forms that put their submit button in the body (Calendar, Venues, Fees and the member's Dues sheets) move it
    to the footer.
- On a desktop a sheet hides the page and a drawer doesn't, so a phone/desktop switch changes more than the shape.
  That's fine for a menu, which you leave as soon as you choose, but not for anything you'd want the page beside.
- Two copies are left to fold into the primitives:
  - the account menu's own drawer (24rem, z 60)
  - MemberSheet's copy of EditorPanel
- A drawer isn't a native dialog, so it doesn't trap focus. Making it one would also put it in the top layer.

## History

- 2026-10-09: Written from a survey of every overlay in the team app. Drawers move to `<body>` (the desktop dock showed
  through the Kumite's Manage drawer), and Escape in a pop-over no longer closes the drawer under it.
