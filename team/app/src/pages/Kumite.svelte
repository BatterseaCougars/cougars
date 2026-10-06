<script lang="ts">
  import { can } from "../access/actions";
  import { granted } from "../demo/session.svelte";
  import { KUMITE_TEAMS, MATCHES } from "../demo/kumite";

  const perms = $derived(granted());
  const name = (id: number) => KUMITE_TEAMS.find((t) => t.id === id)!.name;
  const score = (m: (typeof MATCHES)[number], team: number) => m.goals.filter((g) => g.team === team).length;
  const live = MATCHES.find((m) => m.status === "live");
  const rest = MATCHES.filter((m) => m !== live);
</script>

<div class="page">
  <header class="head">
    <p class="kicker">Quarterly round robin</p>
    <h1 class="display">The Cougars Kumite</h1>
  </header>

  {#if live}
    <article class="panel feature live-panel rise">
      <div class="live-head">
        <span class="badge red live">Live · Game {live.id}</span>
        {#if can(perms, "score:Match")}<a class="btn primary sm" href="/kumite/game">Score it</a>{/if}
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
</div>

<style>
  .head {
    display: grid;
    gap: var(--s-3);
  }
  .head h1 {
    font-size: clamp(2.2rem, 9vw, 3rem);
    color: var(--red-hot);
  }
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
