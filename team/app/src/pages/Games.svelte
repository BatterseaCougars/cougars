<script lang="ts">
  // A tournament series' landing page: the next one coming up (its date, place and sign-up, its captains and draft
  // night), then its games once the fixtures are made (ADR 0061): the round robin by round, then the playoffs, which
  // show their places (1st v 2nd) until the table fills them in. Admins make the fixtures and enter final scores.
  // Goal by goal, with the clock, is live scoring (T5).
  import { can } from "../access/actions";
  import { granted, me } from "../demo/session.svelte";
  import { PLAYERS } from "../demo/data";
  import type { TournamentGame } from "../demo/model";
  import { currentTournament, tournamentBookable, tournamentPlace, typeById, whenOf } from "../demo/schedule.svelte";
  import { db } from "../demo/store.svelte";
  import { makeFixtures, scoreGame } from "../app/backend.svelte";
  import { BREAK_MINUTES, kickOff } from "../lib/fixtures";
  import { formatDayDate, londonISO } from "../lib/dates";
  import EventCard from "../lib/EventCard.svelte";
  import TournamentHead from "../lib/TournamentHead.svelte";
  import TeamCrest from "../lib/TeamCrest.svelte";
  import { teamTone } from "../lib/team-tones";
  import { editTournament } from "../lib/TournamentEditorPanel.svelte";

  let { typeId }: { typeId: number } = $props();

  const perms = $derived(granted());
  const type = $derived(typeById(typeId)!);
  const tournament = $derived(currentTournament(typeId));
  const past = $derived(
    db.tournaments
      .filter((t) => t.typeId === typeId && t.status === "finished" && t.id !== tournament?.id)
      .sort((a, b) => b.heldOn.localeCompare(a.heldOn)),
  );
  const firstName = (id: number | null) => PLAYERS.find((p) => p.id === id)?.name.split(" ")[0] ?? "";
  const teams = $derived(tournament?.teams ?? []);
  const teamName = (id: number | null) => {
    const t = teams.find((x) => x.id === id);
    return t ? t.name || `Team ${firstName(t.captainMemberId)}` : "";
  };
  const logoOf = (id: number) => teams.find((x) => x.id === id)?.logo ?? null;
  // Each team's colour, as on the Draft page
  const toneOf = (id: number) => teamTone(teams.findIndex((x) => x.id === id));
  const games = $derived(tournament?.games ?? []);
  const rounds = $derived(
    [...new Set(games.filter((g) => g.stage === "group").map((g) => g.round))].map((r) => ({
      round: r,
      games: games.filter((g) => g.stage === "group" && g.round === r),
    })),
  );
  const playoffs = $derived(games.filter((g) => g.stage === "playoff"));
  const nth = (n: number | null) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);

  // Two teams are enough to make the fixtures: a draft's captains are its teams before anyone's picked (ADR 0066)
  const teamsSet = $derived(!!tournament && teams.length >= 2);
  const hasResult = $derived(games.some((g) => g.homeGoals !== null));
  const manage = $derived(can(perms, "manage:Tournament"));
  const scorer = $derived(can(perms, "score:Match"));
  const iCaptain = $derived(teams.some((t) => t.captainMemberId === me().id));
  const draftWhen = $derived(
    tournament?.draftOn
      ? `${formatDayDate(londonISO(tournament.draftOn, tournament.draftTime ?? "12:00"))}${tournament.draftTime ? `, ${tournament.draftTime}` : ""}`
      : "",
  );

  // Entering a game's final score: one game at a time
  let editing = $state<number | null>(null);
  let home = $state(0);
  let away = $state(0);
  function edit(g: TournamentGame) {
    editing = g.id;
    home = g.homeGoals ?? 0;
    away = g.awayGoals ?? 0;
  }
  async function saveScore(g: TournamentGame) {
    if (tournament && (await scoreGame(tournament.id, g.id, home, away))) editing = null;
  }
</script>

{#snippet game(g: TournamentGame)}
  <div class="row fixture" class:done={g.status === "done"}>
    <span class="n hint num" title="Game {g.position}"
      >{tournament ? kickOff(tournament.startTime, tournament.gameMinutes, g.position) : g.position}</span
    >
    <span class="team">
      {#if g.homeTeamId}<TeamCrest
          name={teamName(g.homeTeamId)}
          logo={logoOf(g.homeTeamId)}
          tone={toneOf(g.homeTeamId)}
          size="1.5rem"
        />{/if}
      {g.homeTeamId ? teamName(g.homeTeamId) : nth(g.homeSeed)}
    </span>
    <span class="mid num">
      {#if editing === g.id}
        <input
          class="input num goals"
          type="number"
          min="0"
          max="99"
          bind:value={home}
          aria-label="Home goals"
        />–<input class="input num goals" type="number" min="0" max="99" bind:value={away} aria-label="Away goals" />
      {:else if g.homeGoals !== null}<strong>{g.homeGoals}</strong>–<strong>{g.awayGoals}</strong>{:else}<span
          class="vs">vs</span
        >{/if}
    </span>
    <span class="team right">
      {g.awayTeamId ? teamName(g.awayTeamId) : nth(g.awaySeed)}
      {#if g.awayTeamId}<TeamCrest
          name={teamName(g.awayTeamId)}
          logo={logoOf(g.awayTeamId)}
          tone={toneOf(g.awayTeamId)}
          size="1.5rem"
        />{/if}
    </span>
    {#if scorer && g.homeTeamId && g.awayTeamId}
      {#if editing === g.id}
        <button class="btn primary sm" onclick={() => saveScore(g)}>Save</button>
      {:else}
        <button class="btn ghost sm" onclick={() => edit(g)}>{g.homeGoals === null ? "Result" : "Change"}</button>
      {/if}
    {/if}
  </div>
{/snippet}

<div class="page">
  <TournamentHead {type} {tournament} title="Games" manage />

  {#if tournament && tournament.status !== "finished" && !games.length}
    <!-- What's coming up: when, where, and saying you're in -->
    <EventCard event={tournamentBookable(tournament)} canSignUp={can(perms, "signup:Event")} feature />
    {#if tournament.kind === "draft" && teams.length}
      <p class="hint captains">
        Captains: {teams.map((t) => firstName(t.captainMemberId)).join(", ")}
        {#if draftWhen && (iCaptain || can(perms, "run:Draft"))}
          · <a href="/tournaments/{type.slug}/draft">Draft {draftWhen}</a>
        {/if}
        {#if manage}
          · <button class="link" onclick={() => editTournament(tournament.id, { tab: "teams" })}>Change</button>
        {/if}
      </p>
    {:else if tournament.kind === "draft" && manage}
      <p class="hint captains">
        No captains yet ·
        <button class="link" onclick={() => editTournament(tournament.id, { tab: "teams" })}>Add the captains</button>
      </p>
    {/if}
  {/if}

  {#if games.length}
    <div class="fixtures-head">
      <h2 class="section-title">
        Fixtures
        {#if tournament}<span class="hint num"
            >· {tournament.gameMinutes}-minute games, {BREAK_MINUTES} between, from {tournament.startTime}</span
          >{/if}
      </h2>
      {#if manage && !hasResult}
        <button class="btn ghost sm" onclick={() => tournament && makeFixtures(tournament.id)}>Make them again</button>
      {/if}
    </div>
    {#each rounds as r (r.round)}
      <h3 class="round hint">Round {r.round}</h3>
      <div class="list">
        {#each r.games as g (g.id)}{@render game(g)}{/each}
      </div>
    {/each}
    {#if playoffs.length}
      <h3 class="round hint">Playoffs</h3>
      <div class="list">
        {#each playoffs as g (g.id)}
          <p class="playoff-name small">{g.name}</p>
          {@render game(g)}
        {/each}
      </div>
    {/if}
  {:else if teamsSet && manage}
    <div class="panel pad make">
      <p>
        {teams.length} teams. Make the fixtures: every team plays every other once{tournament?.playoffs.length
          ? `, then ${tournament.playoffs.map((p) => p.name).join(" and ")}`
          : ""}.
      </p>
      <button class="btn primary sm" onclick={() => tournament && makeFixtures(tournament.id)}>Make the fixtures</button
      >
    </div>
  {:else}
    <p class="note">
      Fixtures are made once the captains are in: a round robin, {(tournament ?? type).gameMinutes}-minute games{tournament
        ?.playoffs.length
        ? `, then ${tournament.playoffs.map((p) => p.name).join(" and ")}`
        : ""}.
    </p>
  {/if}

  {#if past.length}
    <h2 class="section-title">Past {type.shortName}s</h2>
    <div class="list">
      {#each past as t (t.id)}
        <div class="row">
          <span class="grow">
            <span class="title">{t.name}</span>
            <span class="sub">{[whenOf(t), tournamentPlace(t)?.name].filter(Boolean).join(" · ")}</span>
          </span>
          {#if t.champions}<span class="badge red">Champions · {t.champions}</span>{/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .fixture {
    display: grid;
    grid-template-columns: 2.75rem 1fr auto 1fr;
    gap: var(--s-3);
    min-height: 3.25rem;
  }
  .fixture .team {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    min-width: 0;
    color: var(--fg);
    font-weight: 500;
  }
  .fixture.done .team {
    color: var(--fg-body);
  }
  .right {
    justify-content: flex-end;
    text-align: right;
  }
  .mid {
    min-width: 3.5rem;
    text-align: center;
    color: var(--fg);
    font-family: var(--font-display);
    font-size: 1.2rem;
  }
  .vs {
    color: var(--fg-subtle);
    font-family: var(--font);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .captains {
    margin: var(--s-3) 0 var(--s-5);
  }
  .link {
    padding: 0;
    border: 0;
    background: none;
    color: var(--fg);
    font: inherit;
    text-decoration: underline;
    text-underline-offset: 0.2em;
    cursor: pointer;
  }
  .fixtures-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .round {
    margin: var(--s-4) 0 var(--s-2);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }
  .playoff-name {
    margin: var(--s-2) 0 0;
    color: var(--fg-muted);
    font-weight: 600;
  }
  .goals {
    width: 3.5rem;
    text-align: center;
  }
  .make {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
  }
  .make p {
    margin: 0;
  }
</style>
