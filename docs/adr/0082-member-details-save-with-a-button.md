# 0082. A member's details save with a Save button

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The member sheet (an admin's view of a member, from Teammates or Settings → Members) saved every field as it
changed: a role picked, a rating left, a switch flipped. Nothing on screen said what had been saved or offered a way
back, and a slip (the wrong role, a mistyped rating) was live at once. Gwenda ops' editors have a footer along the
bottom with Save, and the team app's EditorPanel already has one (Settings → Tournaments).

## Decision

- The member's details (name, role, plan, position, rating, Cougars team, email, phone) are a draft until **Save**,
  in a footer that stays at the bottom of the sheet (on a phone too, where the whole sheet scrolls). **Discard** puts
  the draft back. Only what changed goes to the server.
- Closing with unsaved changes (×, Escape, a tap outside) doesn't close: the footer asks, with Keep editing, Discard
  and Save.
- Attendance (tapping a Friday) and fees (marking paid) still save as they're tapped: they're records of what
  happened, each its own action, not details of the member.
- Training teams still save as you change them (ADR 0079): a team is moved person by person, live, not a form.

## Consequences

- An admin sees when there's something unsaved and can back out of it.
- One more tap per change. Forgetting is caught by the close check, not lost.
- A sheet now mixes a draft (the details) and live actions (attendance, fees); the footer's note and the sections'
  order make which is which clear.
