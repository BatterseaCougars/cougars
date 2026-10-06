<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import { PLAYERS } from "../demo/data";
  import { nextSession, seriesById, sessionBookable } from "../demo/schedule.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import Person from "../lib/Person.svelte";
  import { formatDayDate } from "../lib/dates";

  let { seriesId }: { seriesId: number } = $props();

  const series = $derived(seriesById(seriesId)!);
  const session = $derived(nextSession(series));
  const next = $derived(session ?? { id: 0, heldOn: "", going: [] as number[], waitlist: [] as number[] });
  const when = $derived(session ? formatDayDate(sessionBookable(session).startsAt) : "No session coming up");
  // Everyone who signed up starts as expected; one tap marks a no-show.
  const noShows = new SvelteSet<number>();
  let walkIns = $state<number[]>([]);
  let search = $state("");
  let closed = $state(false);

  const expected = $derived(next.going.map((id) => PLAYERS.find((p) => p.id === id)!));
  const here = $derived(expected.length - noShows.size + walkIns.length);
  const matches = $derived(
    search.length < 2
      ? []
      : PLAYERS.filter(
          (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) &&
            !next.going.includes(p.id) &&
            !walkIns.includes(p.id),
        ),
  );

  function toggle(id: number) {
    if (noShows.has(id)) noShows.delete(id);
    else noShows.add(id);
  }
</script>

<div class="page">
  <a class="back" href="/training/{series.slug}"><Icon name="chevronLeft" size={18} />{series.name}</a>
  <div class="page-head">
    <div>
      <h1>Register</h1>
      <p class="hint">{series.name} · {when}</p>
    </div>
    {#if closed}<span class="badge">Closed</span>{:else}<span class="badge green live">Open</span>{/if}
  </div>

  <div class="stats num">
    <div class="stat"><span class="eyebrow">Here</span><span class="value">{here}</span></div>
    <div class="stat">
      <span class="eyebrow">No-show</span><span class="value" class:warn={noShows.size}>{noShows.size}</span>
    </div>
    <div class="stat"><span class="eyebrow">Walk-in</span><span class="value">{walkIns.length}</span></div>
  </div>

  {#if closed}
    <div class="panel pad feature rise">
      <h2>Register closed</h2>
      <p class="hint">Attendance is final. Pay-as-you-go players are charged for tonight; subscribers aren't.</p>
      <button class="btn outline sm" onclick={() => (closed = false)}>Reopen (admin)</button>
    </div>
  {:else}
    <label class="search">
      <Icon name="search" size={18} />
      <input class="input" placeholder="Add a walk-in: search by name" bind:value={search} />
    </label>
    {#if matches.length}
      <div class="list rise">
        {#each matches as p (p.id)}
          <button class="row" onclick={() => ((walkIns = [...walkIns, p.id]), (search = ""))}>
            <Person player={p} /><span class="badge">Add walk-in</span>
          </button>
        {/each}
      </div>
    {:else if search.length >= 2}
      <button class="btn outline block rise"><Icon name="plus" size={16} /> Add “{search}” as a first-timer</button>
    {/if}
  {/if}

  {#if walkIns.length}
    <h2 class="section-title">Walk-ins</h2>
    <div class="list rise">
      {#each walkIns as id (id)}
        <div class="row">
          <Person player={PLAYERS.find((p) => p.id === id)!} /><span class="badge green">Here</span>
        </div>
      {/each}
    </div>
  {/if}

  <h2 class="section-title">Signed up · tap a no-show</h2>
  <div class="list">
    {#each expected as p (p.id)}
      <button class="row" class:off={noShows.has(p.id)} onclick={() => toggle(p.id)} disabled={closed}>
        <Person player={p} />
        {#if noShows.has(p.id)}<span class="badge red">No-show</span>{:else}<span class="badge green">Here</span>{/if}
      </button>
    {/each}
  </div>

  {#if !closed}
    <button class="btn primary block" onclick={() => (closed = true)}>Close the register</button>
  {/if}
</div>

<style>
  .back {
    display: inline-flex;
    align-items: center;
    gap: 0.1rem;
    margin: calc(-1 * var(--s-2)) 0 calc(-1 * var(--s-3)) -0.25rem;
    min-height: 2.25rem;
    color: var(--red-hot);
    font-size: var(--text-sm);
    font-weight: 500;
  }
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
  .row.off :global(.title),
  .row.off :global(.avatar) {
    opacity: 0.5;
  }
  .panel h2 {
    font-size: var(--text-md);
    font-weight: 600;
    margin-bottom: var(--s-2);
  }
  .panel .btn {
    margin-top: var(--s-4);
  }
</style>
