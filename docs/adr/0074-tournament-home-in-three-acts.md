# 0074. A tournament's home in three acts, its state from its games

- **Status:** Accepted. Changes the tournament landing page (Games.svelte) and its header (TournamentHead).
- **Date:** 2026-10-08

## Context

The Kumite's home stacked cards whatever the day: a date card with sign-up (the Home feed's announcement card), the
draft, the games, the teams, and once it was won, a champions card above a "Date TBC" card. The settings (status,
date confirmed) said one thing and the results another. Past Kumites were a list at the bottom.

## Decision

- **Its state comes from its games** (`lib/edition.ts`): under way once a game's being scored or has a result, done
  once every game's played (or an admin marked it finished). Before then, sign-up open or coming up, from its status.
  The day shows once it's confirmed or the games have been played; the season always.
- **The header carries the when**, on every tournament page: the day big (or Date to be confirmed), the season, the
  hours and place, and the state.
- **Past ones are History**, a tab once one's been played: each past one with how it ended (the day, the
  champions, the final's score), each opening its own page (`/tournaments/:slug/history/:id`: the champions, the
  final, every fight, the board, the awards), back to the list. Its teams' and games' pages work from there too. The
  series' other pages always show the latest; there's no switcher.
- **A series opens on its next one** (`latestOf`): the one under way, else the next one not done (a tentative date
  or just a season is enough, so an admin's New date shows at once), else the last one played. The next one's page
  also shows **Last time**: the last champions and the day, opening its page. The app's **Home teases each
  series' next one** in a feature card (date or season, sign-up, the way to its page), not a line under Later.
- **The home page follows the day in three acts:**
  - Before: In / Out on one line (the announcement card is for the Home feed), the draft and its date, the teams so
    far (not final till the day), the first fight once the card's out.
  - During: your turn to keep score, the fight on now and the next, the latest results.
  - After: the champions (crest, name, how they won it), the final, every fight, the awards.
- **Fewer cards**: the champions, sign-up, keep-score duty and teams sit on the page, set apart by space, type and a
  rule, not each in its own dark panel.

- **An admin's jobs are in one place, Manage**, ordered by the moment (the awards first once it's done, the fight card
  on the day): a bottom sheet on a phone, where most of it's done at the rink, a side drawer on a desktop. Enter the awards,
  the fight card and results, run the draft, captains and draft date, edit, a new date.
- **The Kumite has its motif** (`lib/motif.ts`): it's Bloodsport. Kanji beside its section headings (組手, 決勝, 試合,
  闘, 賞), a red 優勝 hanko seal on the champions' crest, and a gong for its fight card. The kanji come from Noto Serif
  JP Black cut to just those characters (under 5 KB, self-hosted). Other series have no motif. The font is Noto
  Serif JP (SIL Open Font License), so it can ship with the app.

## Consequences

- A tournament's status setting matters less: an admin needn't mark it live or finished for the page to move on.
- A past one has an address of its own, so it can be shared.
