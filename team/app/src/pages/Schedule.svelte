<script lang="ts">
  // A tournament's full schedule (ADR 0061): the round robin by round, then the playoffs, which show their places
  // (1st v 2nd) until the table fills them in. Admins make the fixtures (again, until a game has a result); whoever
  // scores games enters final scores. Goal by goal, with the clock, is live scoring (T5).
  import EmptyState from "../lib/EmptyState.svelte";
  import { can } from "../access/actions";
  import { granted } from "../demo/session.svelte";
  import { currentTournament, typeById } from "../demo/schedule.svelte";
  import { makeFixtures } from "../app/backend.svelte";
  import { BREAK_MINUTES } from "../lib/fixtures";
  import FixtureRow from "../lib/FixtureRow.svelte";
  import TournamentHead from "../lib/TournamentHead.svelte";

  let { typeId }: { typeId: number } = $props();

  const perms = $derived(granted());
  const type = $derived(typeById(typeId)!);
  const tournament = $derived(currentTournament(typeId));
  const teams = $derived(tournament?.teams ?? []);
  const games = $derived(tournament?.games ?? []);
  const rounds = $derived(
    [...new Set(games.filter((g) => g.stage === "group").map((g) => g.round))].map((r) => ({
      round: r,
      games: games.filter((g) => g.stage === "group" && g.round === r),
    })),
  );
  const playoffs = $derived(games.filter((g) => g.stage === "playoff"));
  // Two teams are enough to make the fixtures: a draft's captains are its teams before anyone's picked (ADR 0060)
  const teamsSet = $derived(!!tournament && teams.length >= 2);
  const hasResult = $derived(games.some((g) => g.homeGoals !== null));
  const manage = $derived(can(perms, "manage:Tournament"));
  const then = $derived(
    tournament?.playoffs.length ? `, then ${tournament.playoffs.map((p) => p.name).join(" and ")}` : "",
  );
</script>

<div class="page">
  <TournamentHead {type} {tournament} title="Fight card" />

  {#if tournament && games.length}
    <div class="head">
      <p class="hint num">
        {tournament.gameMinutes}-minute games, {BREAK_MINUTES} minutes between, from {tournament.startTime}
      </p>
      {#if manage && !hasResult}
        <button class="btn ghost sm" onclick={() => makeFixtures(tournament.id)}>Make them again</button>
      {/if}
    </div>
    {#each rounds as r (r.round)}
      <section>
        <h3 class="round hint">Round {r.round}</h3>
        <div class="list">
          {#each r.games as g (g.id)}<FixtureRow
              {tournament}
              game={g}
              live={g.status === "live"}
              chant="{type.shortName}!"
            />{/each}
        </div>
      </section>
    {/each}
    {#if playoffs.length}
      <section>
        <h3 class="round hint">Playoffs</h3>
        <div class="list">
          {#each playoffs as g (g.id)}
            <p class="playoff-name small">{g.name}</p>
            <FixtureRow {tournament} game={g} live={g.status === "live"} chant="{type.shortName}!" />
          {/each}
        </div>
      </section>
    {/if}
  {:else if tournament && teamsSet && manage}
    <div class="panel pad make">
      <p>{teams.length} teams. Make the fixtures: every team plays every other once{then}.</p>
      <button class="btn primary sm" onclick={() => makeFixtures(tournament.id)}>Make the fixtures</button>
    </div>
  {:else}
    <EmptyState icon={type.slug === "kumite" ? "gong" : "calendar"} title="No fight card yet">
      It's made once the teams are in: a round robin, {(tournament ?? type).gameMinutes}-minute games{then}.
    </EmptyState>
  {/if}
</div>

<style>
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
  }
  .head p {
    margin: 0;
  }
  .round {
    margin: 0 0 var(--s-2);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }
  /* Lined up with the rows' contents */
  .playoff-name {
    margin: 0;
    padding: var(--s-3) var(--s-4) 0;
    color: var(--fg-muted);
    font-weight: 600;
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
