<script lang="ts">
  // One game, as a row in a list: its kick-off, the two teams (or the places a playoff waits on, 1st v 2nd), and the
  // score once there is one. Each opens the game's own page (Details, or Full result once played): both teams, the
  // goals, and where it's scored or an admin puts a result right (ADR 0071).
  import { nameOfTeam } from "./names";
  import type { Tournament, TournamentGame } from "../demo/model";
  import { PLAYERS } from "../demo/data";
  import { kickOff, table } from "./fixtures";
  import TeamCrest from "./TeamCrest.svelte";
  import { teamHref, teamTone } from "./team-tones";
  import { typeById } from "../demo/schedule.svelte";
  import { leftOf, mmss, ticking } from "./game-clock.svelte";
  import Icon from "../app/shell/Icon.svelte";

  let {
    tournament,
    game: g,
    live = false,
    chant = "Live",
    big = false,
  }: {
    tournament: Tournament;
    game: TournamentGame;
    live?: boolean;
    /** What the badge on a game being played says: the crowd's chant ("Kumite!"), with the live dot. */
    chant?: string;
    /** Up front (the tournament's home page): bigger crests, and each team's record so far under its name. */
    big?: boolean;
  } = $props();

  const teams = $derived(tournament.teams);
  const teamName = (id: number) => {
    const t = teams.find((x) => x.id === id);
    return nameOfTeam(t, teams, (id) => PLAYERS.find((p) => p.id === id));
  };
  const logoOf = (id: number) => teams.find((x) => x.id === id)?.logo ?? null;
  const toneOf = (id: number) => teamTone(teams.findIndex((x) => x.id === id));
  const nth = (n: number | null) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);

  // Each team's record from the group games with a result: won, drawn, lost, in words (W D L)
  const records = $derived(
    big
      ? new Map(
          table(
            teams.flatMap((t) => (t.id ? [t.id] : [])),
            (tournament.games ?? []).filter((x) => x.stage === "group"),
            { win: tournament.pointsWin, draw: tournament.pointsDraw, loss: tournament.pointsLoss },
          ).map((r) => [r.teamId, r]),
        )
      : null,
  );
  const recordOf = (id: number) => records?.get(id);
  const crest = $derived(big ? "2.75rem" : "2rem");

  // The game's matchup (Details, ADR 0090), and Live: the clock and the score for everyone, and the scoresheet for
  // whoever keeps score (ADR 0071)
  const gameHref = $derived(`/tournaments/${typeById(tournament.typeId)?.slug ?? ""}/games/${g.id}`);
  const clockHref = $derived(`${gameHref}/live`);
  const playable = $derived(g.status !== "done" && !!g.homeTeamId && !!g.awayTeamId);
  // A live game's clock ticks here
  $effect(() => (live ? ticking() : undefined));
</script>

{#snippet side(id: number | null, seed: number | null)}
  <span class="side">
    {#if id}<a class="tn" href={teamHref(typeById(tournament.typeId)?.slug ?? "", id)}>{teamName(id)}</a>
    {:else}<span class="tn">{nth(seed)}</span>{/if}
    {#if big && id}
      {@const r = recordOf(id)}
      {#if r}
        <!-- Won, drawn, lost: the letters say it -->
        <span class="rec num" aria-label="{r.w} won, {r.d} drawn, {r.l} lost">
          <span class="w">{r.w}<b>W</b></span><span class="d">{r.d}<b>D</b></span><span class="l">{r.l}<b>L</b></span>
        </span>
      {/if}
    {/if}
  </span>
{/snippet}

{#snippet when()}
  {#if live}<span class="badge red live">{chant}</span><span class="clock num">{mmss(leftOf(g))}</span>
  {:else}{kickOff(tournament.startTime, tournament.gameMinutes, g.position)}{/if}
{/snippet}

<!-- Every row has the same columns, so the teams, the score and the button line up down a list. Big: the time sits
     over the score in the middle, and the score is entered on the Fight card -->
<div class="row fixture" class:done={g.status === "done"} class:big>
  {#if !big}<span class="n hint num" title="Game {g.position}">{@render when()}</span>{/if}
  <span class="team">
    {#if g.homeTeamId}<TeamCrest
        name={teamName(g.homeTeamId)}
        logo={logoOf(g.homeTeamId)}
        tone={toneOf(g.homeTeamId)}
        size={crest}
      />{/if}
    {@render side(g.homeTeamId, g.homeSeed)}
  </span>
  <a class="mid num" href={gameHref} aria-label="Game {g.position}">
    {#if big}<span class="when hint">{@render when()}</span>{/if}
    <span class="score">
      {#if g.homeGoals !== null}{g.homeGoals}<span class="dash">–</span>{g.awayGoals}{:else}<span class="vs">vs</span
        >{/if}
    </span>
  </a>
  <span class="team right">
    {@render side(g.awayTeamId, g.awaySeed)}
    {#if g.awayTeamId}<TeamCrest
        name={teamName(g.awayTeamId)}
        logo={logoOf(g.awayTeamId)}
        tone={toneOf(g.awayTeamId)}
        size={crest}
      />{/if}
  </span>
  {#if !big}
    <!-- Always there, even empty: every row's columns line up -->
    <span class="act">
      {#if playable}
        <!-- Live: the same for everyone, at the rink or not: the clock, the score, the goals as they go in. Whoever
             keeps score takes it on there -->
        <a class="btn sm live-btn" class:outline={!live} class:primary={live} href={clockHref}
          >{#if live}<i class="dot" aria-hidden="true"></i>{:else}<Icon name="play" size={14} />{/if}Live</a
        >
      {/if}
      <!-- Every game's matchup: both squads, the result and its goals, when the captains' sides last met -->
      <a class="btn ghost sm" href={gameHref}>{g.status === "done" ? "Result" : "Details"}</a>
    </span>
  {/if}
</div>

<style>
  .fixture {
    display: grid;
    grid-template-columns: 4.75rem minmax(0, 1fr) 5rem minmax(0, 1fr) 9.5rem;
    align-items: center;
    gap: var(--s-3);
    min-height: 3.25rem;
  }
  /* Big: home, the middle (time over score), away; the middle the same width in every row */
  .fixture.big {
    position: relative;
    grid-template-columns: minmax(0, 1fr) 7rem minmax(0, 1fr);
    min-height: 5rem;
    padding-block: var(--s-3);
  }
  /* Big: the whole card opens the game (its score, and keeping score); the team names still open the teams */
  .big a.mid::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
  }
  .big:hover {
    background: color-mix(in srgb, var(--fg) 5%, transparent);
  }
  .big a.tn {
    position: relative;
    z-index: 1;
  }
  .fixture .team {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    min-width: 0;
    color: var(--fg);
    font-weight: 500;
  }
  .side {
    display: grid;
    gap: 0.1rem;
    min-width: 0;
  }
  .tn {
    overflow: hidden;
    color: inherit;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  a.tn:hover {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  .big .tn {
    font-size: var(--text-md);
  }
  /* The record: plain numbers, the letters quiet */
  .rec {
    display: inline-flex;
    gap: var(--s-2);
    color: var(--fg-muted);
    font-size: var(--text-sm);
    font-weight: 400;
  }
  .right .rec {
    justify-content: flex-end;
  }
  .rec b {
    margin-left: 0.1rem;
    color: var(--fg-subtle);
    font-size: var(--text-xs);
    font-weight: 400;
  }
  .fixture.done .team {
    color: var(--fg-body);
  }
  .right {
    justify-content: flex-end;
    text-align: right;
  }
  .mid {
    display: grid;
    justify-items: center;
    gap: 0.2rem;
    color: var(--fg);
    font-family: var(--font-display);
    font-size: 1.4rem;
    text-align: center;
  }
  /* The score: the display face as it comes (no bold), the dash spaced and quieter so 0–0 reads */
  .score {
    letter-spacing: 0.03em;
  }
  .dash {
    padding: 0 0.2em;
    color: var(--fg-muted);
  }
  .big .score {
    font-size: 1.6rem;
    line-height: 1;
  }
  .when {
    font-family: var(--font);
    font-size: var(--text-sm);
  }
  a.mid {
    border-radius: var(--r-md);
    color: var(--fg);
  }
  a.mid:hover .vs {
    color: var(--fg-muted);
  }
  .n {
    display: grid;
    justify-items: start;
    gap: 0.15rem;
  }
  .clock {
    color: var(--fg);
    font-weight: 600;
  }
  .big .clock {
    margin-left: 0;
  }
  .when {
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: var(--s-1) var(--s-2);
  }
  .vs {
    color: var(--fg-subtle);
    font-family: var(--font);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .act {
    display: flex;
    justify-content: flex-end;
    gap: var(--s-1);
  }
  .live-btn {
    gap: var(--s-1);
  }
  /* On now: the VCR's REC light */
  .live-btn .dot {
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background: var(--red-hot);
  }
  /* Phones: tighter columns, the crests only on the big rows */
  @media (max-width: 600px) {
    .fixture:not(.big) {
      grid-template-columns: 3rem minmax(0, 1fr) 3.25rem minmax(0, 1fr) 8.75rem;
      gap: var(--s-2);
    }
    .fixture:not(.big) .team :global(.crest) {
      display: none;
    }
  }
</style>
