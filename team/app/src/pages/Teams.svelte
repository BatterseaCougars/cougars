<script lang="ts">
  import { can } from "../access/actions";
  import { PLAYERS, TEAM_NAMES } from "../demo/data";
  import { granted } from "../demo/session.svelte";
  import { db } from "../demo/store.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import Person from "../lib/Person.svelte";
  import { formatDayDate } from "../lib/dates";
  import { snakeTeams } from "../lib/snake";

  const perms = $derived(granted());
  const next = $derived(db.events.find((e) => e.kind === "friday")!);
  let proposal: { name: string; players: number[] }[] | null = $state(null);
  const shown = $derived(proposal ?? db.teams);
  const byId = (id: number) => PLAYERS.find((p) => p.id === id)!;

  function generate() {
    proposal = snakeTeams(next.going.map(byId), TEAM_NAMES);
  }
  function move(id: number, from: number, to: number) {
    if (!proposal) return;
    proposal[from].players = proposal[from].players.filter((p) => p !== id);
    proposal[to].players = [...proposal[to].players, id];
  }
  function publish() {
    db.teams = proposal;
    proposal = null;
  }
  const rating = (players: number[]) => players.reduce((s, id) => s + byId(id).rating, 0);
</script>

<div class="page">
  <div class="page-head">
    <div>
      <h1>Teams</h1>
      <p class="hint">{formatDayDate(next.startsAt)} · {next.going.length} signed up</p>
    </div>
    {#if can(perms, "generate:Teams")}
      <button class="btn sm" class:primary={!shown} class:outline={!!shown} onclick={generate}
        >{shown ? "Regenerate" : "Generate"}</button
      >
    {/if}
  </div>

  {#if proposal}
    <p class="note rise">
      Draft, not published. Move a player with the arrow; drag and drop comes with the solver in T3.
    </p>
  {/if}

  {#if shown}
    {#each shown as team, t (team.name)}
      <section class="team rise">
        <header>
          <h2 class="display">{team.name}</h2>
          <span class="hint num"
            >{team.players.length} players{can(perms, "read:Rating") ? ` · ${rating(team.players)}` : ""}</span
          >
        </header>
        <div class="list">
          {#each team.players as id (id)}
            <div class="row">
              <Person player={byId(id)} showRating={can(perms, "read:Rating")} />
              {#if proposal}
                <button
                  class="btn ghost icon"
                  aria-label="Move to next team"
                  onclick={() => move(id, t, (t + 1) % shown.length)}
                >
                  <Icon name="chevronRight" size={18} />
                </button>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/each}
    {#if proposal && can(perms, "publish:Teams")}
      <button class="btn primary block" onclick={publish}>Publish teams</button>
    {/if}
  {:else}
    <div class="empty">
      <span class="mark"><Icon name="teams" /></span>
      <p class="title">Teams aren't out yet</p>
      <p class="hint">They're made from sign-ups once sign-up closes, then published here and on Home.</p>
    </div>
  {/if}
</div>

<style>
  .team {
    display: grid;
    gap: var(--s-3);
  }
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 0 var(--s-1);
  }
  h2 {
    font-size: 1.6rem;
  }
  .empty {
    display: grid;
    justify-items: center;
    gap: var(--s-1);
    padding: var(--s-10) var(--s-4);
    text-align: center;
  }
  .empty .mark {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    margin-bottom: var(--s-2);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--panel-bg);
    color: var(--fg-muted);
  }
  .empty .title {
    color: var(--fg);
    font-weight: 500;
  }
</style>
