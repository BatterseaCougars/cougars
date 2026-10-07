<script lang="ts">
  import { can } from "../access/actions";
  import { granted } from "../demo/session.svelte";
  import { KUMITE_TEAMS, MATCHES, SAMPLE_TOURNAMENT_ID } from "../demo/kumite";
  import { currentTournament, typeById, whenOf } from "../demo/schedule.svelte";
  import { db } from "../demo/store.svelte";
  import TournamentHead from "../lib/TournamentHead.svelte";

  let { typeId }: { typeId: number } = $props();

  const perms = $derived(granted());
  const type = $derived(typeById(typeId)!);
  const tournament = $derived(currentTournament(typeId));
  const past = $derived(
    db.tournaments
      .filter((t) => t.typeId === typeId && t.status === "finished" && t.id !== tournament?.id)
      .sort((a, b) => b.heldOn.localeCompare(a.heldOn)),
  );
  // Sample fixtures exist for one tournament only; a new one has none until its teams are set.
  const matches = $derived(tournament?.id === SAMPLE_TOURNAMENT_ID ? MATCHES : []);
  const name = (id: number) => KUMITE_TEAMS.find((t) => t.id === id)!.name;
  const score = (m: (typeof MATCHES)[number], team: number) => m.goals.filter((g) => g.team === team).length;
  const live = $derived(matches.find((m) => m.status === "live"));
  const rest = $derived(matches.filter((m) => m !== live));
</script>

<div class="page">
  <TournamentHead {type} {tournament} title="Games" />

  {#if live}
    <article class="panel feature live-panel rise">
      <div class="live-head">
        <span class="badge red live">Live · Game {live.id}</span>
        {#if can(perms, "score:Match")}<a class="btn primary sm" href="/tournaments/{type.slug}/game">Score it</a>{/if}
      </div>
      <div class="scoreline">
        <span class="display team">{name(live.home)}</span>
        <span class="display score num"
          >{score(live, live.home)}<span class="dash">–</span>{score(live, live.away)}</span
        >
        <span class="display team away">{name(live.away)}</span>
      </div>
    </article>
  {/if}

  {#if rest.length}
    <h2 class="section-title">Fixtures</h2>
    <div class="list">
      {#each rest as m (m.id)}
        <div class="row fixture" class:done={m.status === "done"}>
          <span class="n hint num">{m.id}</span>
          <span class="team">{name(m.home)}</span>
          <span class="mid num">
            {#if m.status === "next"}<span class="vs">vs</span>{:else}<strong>{score(m, m.home)}</strong>–<strong
                >{score(m, m.away)}</strong
              >{/if}
          </span>
          <span class="team right">{name(m.away)}</span>
        </div>
      {/each}
    </div>
  {:else}
    <p class="note">Fixtures are made once the teams are set: a round robin, {type.gameMinutes}-minute games.</p>
  {/if}

  {#if past.length}
    <h2 class="section-title">Past {type.shortName}s</h2>
    <div class="list">
      {#each past as t (t.id)}
        <div class="row">
          <span class="grow">
            <span class="title">{t.name}</span>
            <span class="sub">{[whenOf(t), t.venue].filter(Boolean).join(" · ")}</span>
          </span>
          {#if t.champions}<span class="badge red">Champions · {t.champions}</span>{/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .live-panel {
    display: grid;
    gap: var(--s-4);
    padding: var(--s-4) var(--s-5) var(--s-5);
  }
  .live-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .scoreline {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: var(--s-4);
  }
  .scoreline .team {
    font-size: 1.5rem;
    color: var(--fg);
  }
  .away {
    text-align: right;
  }
  .score {
    font-size: 3rem;
    color: var(--fg);
  }
  .dash {
    margin: 0 0.15em;
    color: var(--fg-subtle);
  }
  .fixture {
    display: grid;
    grid-template-columns: 1.5rem 1fr auto 1fr;
    gap: var(--s-3);
    min-height: 3.25rem;
  }
  .fixture .team {
    color: var(--fg);
    font-weight: 500;
  }
  .fixture.done .team {
    color: var(--fg-body);
  }
  .right {
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
</style>
