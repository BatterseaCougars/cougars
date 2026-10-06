<script lang="ts">
  import { MEMBERS, type Player } from "../demo/data";
  import { nextSession, seriesById, sessionBookable } from "../demo/schedule.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import Drawer from "./Drawer.svelte";
  import Person from "./Person.svelte";
  import { formatDayDate } from "./dates";
  import { markHere } from "../app/backend.svelte";

  // The register for the night, in a drawer over the training page: every active member, sign-ups first and
  // already ticked, everyone else below to tick as they walk in. Search narrows the list. Ticks are written to the
  // session: a walk-in joins its sign-ups (so the page counts them in), a no-show stays signed up but marked.
  let { seriesId, open = $bindable(false) }: { seriesId: number; open?: boolean } = $props();

  const series = $derived(seriesById(seriesId)!);
  const session = $derived(nextSession(series));
  const when = $derived(session ? formatDayDate(sessionBookable(session).startsAt) : "No session coming up");
  const going = $derived(session?.going ?? []);
  const walkIns = $derived(session?.walkIns ?? []);
  const noShows = $derived(session?.noShows ?? []);
  const here = (id: number) => going.includes(id) && !noShows.includes(id);
  let search = $state("");

  const active = $derived(
    MEMBERS.filter((m) => m.status === "active")
      .map((m) => m.player)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
  const found = (p: Player) => search.length < 2 || p.name.toLowerCase().includes(search.toLowerCase());
  // Walk-ins stay where they were ticked, under everyone else, so the list doesn't jump under your finger
  const signedUpIds = $derived(going.filter((id) => !walkIns.includes(id)));
  const signedUp = $derived(
    signedUpIds.map((id) => active.find((p) => p.id === id)).filter((p): p is Player => !!p && found(p)),
  );
  const others = $derived(active.filter((p) => !signedUpIds.includes(p.id) && found(p)));

  function toggle(id: number) {
    const s = session;
    if (!s) return;
    void markHere(s.id, id, !here(id));
    if (signedUpIds.includes(id)) {
      // Signed up: a tap marks a no-show, or takes it back
      s.noShows = noShows.includes(id) ? noShows.filter((x) => x !== id) : [...noShows, id];
    } else if (walkIns.includes(id)) {
      // A walk-in ticked by mistake: off the session again
      s.going = s.going.filter((x) => x !== id);
      s.walkIns = walkIns.filter((x) => x !== id);
    } else {
      // Turned up without signing up (or off the waitlist): in for tonight, whatever the places
      s.going = [...s.going, id];
      s.waitlist = s.waitlist.filter((x) => x !== id);
      s.out = s.out?.filter((x) => x !== id);
      s.walkIns = [...walkIns, id];
    }
  }
</script>

{#snippet row(p: Player, signedUp: boolean)}
  <button class="row" class:off={!here(p.id)} onclick={() => toggle(p.id)}>
    <Person player={p} />
    <span class="state">
      {#if here(p.id)}<span class="badge green">Here</span>
      {:else if signedUp}<span class="badge red">No-show</span>
      {:else}<span class="badge"><Icon name="plus" size={14} /> Here</span>{/if}
    </span>
  </button>
{/snippet}

<Drawer bind:open title="Add player" sub="{series.name} · {when}">
  {#snippet top()}
    <div class="stats num">
      <div class="stat">
        <span class="eyebrow">Here</span><span class="value">{going.length - noShows.length}</span>
      </div>
      <div class="stat">
        <span class="eyebrow">No-show</span><span class="value" class:warn={noShows.length}>{noShows.length}</span>
      </div>
      <div class="stat"><span class="eyebrow">Walk-in</span><span class="value">{walkIns.length}</span></div>
    </div>
    <label class="search">
      <Icon name="search" size={18} />
      <input class="input" placeholder="Find a player" bind:value={search} />
    </label>
  {/snippet}

  {#if search.length >= 2 && !signedUp.length && !others.length}
    <button class="btn outline block rise"><Icon name="plus" size={16} /> Add “{search}” as a first-timer</button>
  {/if}

  {#if signedUp.length}
    <h3 class="section-title">Signed up · tap a no-show</h3>
    <div class="list">
      {#each signedUp as p (p.id)}{@render row(p, true)}{/each}
    </div>
  {/if}

  {#if others.length}
    <h3 class="section-title">Everyone else · tap who turned up</h3>
    <div class="list">
      {#each others as p (p.id)}{@render row(p, false)}{/each}
    </div>
  {/if}

  {#snippet footer()}
    <button class="btn primary block" onclick={() => (open = false)}>Done</button>
  {/snippet}
</Drawer>

<style>
  .stat .value.warn {
    color: var(--amber);
  }
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
  .row.off :global(.title),
  .row.off :global(.avatar) {
    opacity: 0.5;
  }
</style>
