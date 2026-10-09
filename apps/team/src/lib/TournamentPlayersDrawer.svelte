<script lang="ts">
  import { goesBy, matchesName } from "./names";
  import { MEMBERS, type Player } from "../demo/data";
  import Icon from "../app/shell/Icon.svelte";
  import Drawer from "./Drawer.svelte";
  import Person from "./Person.svelte";
  import { setTournamentPlayer } from "../app/backend.svelte";

  // Who's in a tournament, in a drawer over the draft: an admin puts in someone who didn't sign up (sign-up shut or
  // not, past the limit) or takes someone off, who then comes off their team too. Captains are in automatically and
  // change in the tournament's settings. Search narrows the list.
  let {
    tournamentId,
    going,
    captains,
    sub,
    open = $bindable(false),
  }: { tournamentId: number; going: number[]; captains: Set<number | null>; sub: string; open?: boolean } = $props();

  let search = $state("");
  const active = $derived(
    MEMBERS.filter((m) => m.status === "active")
      .map((m) => m.player)
      .sort((a, b) => goesBy(a).localeCompare(goesBy(b))),
  );
  const found = (p: Player) => search.length < 2 || matchesName(p, search);
  const inIt = $derived(active.filter((p) => going.includes(p.id) && !captains.has(p.id) && found(p)));
  const others = $derived(active.filter((p) => !going.includes(p.id) && !captains.has(p.id) && found(p)));
</script>

{#snippet row(p: Player, isIn: boolean)}
  <button class="row" onclick={() => setTournamentPlayer(tournamentId, p.id, !isIn)}>
    <Person player={p} />
    <span class="state">
      {#if isIn}<span class="badge green">In</span>
      {:else}<span class="badge"><Icon name="plus" size={14} /> Add</span>{/if}
    </span>
  </button>
{/snippet}

<Drawer bind:open title="Add player" {sub}>
  {#snippet top()}
    <label class="search">
      <Icon name="search" size={18} />
      <input class="input" placeholder="Find a player" bind:value={search} />
    </label>
  {/snippet}

  {#if inIt.length}
    <h3 class="section-title">In · tap to take off</h3>
    <div class="list">
      {#each inIt as p (p.id)}{@render row(p, true)}{/each}
    </div>
  {/if}

  {#if others.length}
    <h3 class="section-title">Everyone else · tap to add</h3>
    <div class="list">
      {#each others as p (p.id)}{@render row(p, false)}{/each}
    </div>
  {/if}

  {#snippet footer()}
    <button class="btn primary block" onclick={() => (open = false)}>Done</button>
  {/snippet}
</Drawer>

<style>
  .search {
    position: relative;
    display: block;
    color: var(--fg-subtle);
  }
  .search :global(svg) {
    position: absolute;
    left: var(--s-4);
    top: 50%;
    translate: 0 -50%;
  }
  .search input {
    padding-left: 2.75rem;
  }
  .state {
    display: inline-flex;
    justify-content: flex-end;
    min-width: 5.5rem;
  }
</style>
