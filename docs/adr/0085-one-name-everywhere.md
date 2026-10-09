# 0085. Members go by their chosen name everywhere

- **Status:** Accepted. Amends [0043](0043-roster-from-the-club.md).
- **Date:** 2026-10-08

## Context

A member chooses on their profile how their name shows (ADR 0043): their first name and initial (the default), their
full name, their first name, or a nickname, stored in `members.web_name`. Only the website's roster used it; the
team app showed everyone's full name, so a player known as "The Wall" on the website was "Sam Jones" in the app.

## Decision

- The chosen name is **the name a member goes by, everywhere the app shows them**: cards, lists, teams, the Draft,
  scores, awards, greetings, the account menu. One helper says it (`team/app/src/lib/names.ts`): `goesBy` (the chosen
  name, else the full name) and `shortName` (the chosen name whole, else the first name, wherever the app said just a
  first name: the trading card, "Team …", "Legs fresh, …?").
- With nothing chosen the app shows the full name (it's members only); the public website keeps first name and initial.
- The **full name stays** for what needs it: sign-in, payment references (which match bank statements), Unpaid fees,
  Dev tools, and an admin's views, where it's shown with "Goes by …" beside it (the Members table, the member sheet).
  Search finds a member by either name.
- The profile calls it "The name you go by: in the app, and on the website's roster".

## Consequences

- A nickname reads the same in the app and on the website.
- New screens show a person with `goesBy` or `shortName`, never `player.name`, unless it's one of the full-name places
  above.
- A long nickname on a trading card shrinks to fit the name band.
