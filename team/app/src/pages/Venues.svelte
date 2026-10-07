<script lang="ts">
  // Settings → Venues (ADR 0051): places the club goes again and again, each with its address and the map link
  // pasted from Google Maps. Trainings, tournaments and events pick one, so changing it here fixes every one of them.
  // One that's no longer used is hidden from the pickers rather than deleted: what had it keeps it.
  import PageHeader from "../lib/PageHeader.svelte";
  import Sheet from "../lib/Sheet.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import { db } from "../demo/store.svelte";
  import { createVenue, updateVenue } from "../app/backend.svelte";
  import type { Venue } from "../demo/model";
  import { cleanMapUrl, placeOf } from "../../../../shared/places";

  const blank = (): Venue => ({ id: 0, name: "", address: "", mapUrl: "", active: true });
  let open = $state(false);
  let draft = $state<Venue>(blank());
  let problem = $state("");

  function edit(v?: Venue) {
    draft = v ? { ...$state.snapshot(v) } : blank();
    problem = "";
    open = true;
  }

  // What picks each one, so it's clear what a change moves
  const usedBy = (id: number) =>
    [
      ...db.series.filter((s) => s.venueId === id).map((s) => s.name),
      ...db.tournamentTypes.filter((t) => t.venueId === id).map((t) => t.name),
      ...db.tournaments.filter((t) => t.venueId === id).map((t) => t.name),
      ...db.oneOffs.filter((o) => o.venueId === id).map((o) => o.title),
    ].join(", ");

  const mapOf = (v: Venue) => placeOf({ venueId: v.id, name: "", mapUrl: "" }, [v])!.mapUrl;

  async function save(e: SubmitEvent) {
    e.preventDefault();
    const mapUrl = cleanMapUrl(draft.mapUrl);
    if (mapUrl === null) return void (problem = "That map link isn't a web link. In Google Maps: Share → Copy link.");
    const v = { ...draft, name: draft.name.trim(), address: draft.address.trim(), mapUrl };
    if ((v.id ? await updateVenue(v) : await createVenue(v)) !== null) open = false;
  }
</script>

<div class="page">
  <PageHeader title="Venues" subtitle="Places the club goes. Change one here and everything held there follows.">
    {#snippet actions()}
      <button class="btn sm primary" aria-haspopup="dialog" onclick={() => edit()}>
        <Icon name="plus" size={16} />Venue
      </button>
    {/snippet}
  </PageHeader>

  {#if db.venues.length}
    <ul class="venues">
      {#each db.venues as v (v.id)}
        {@const used = usedBy(v.id)}
        <li class:hidden={!v.active}>
          <button class="row" onclick={() => edit(v)}>
            <Icon name="pin" size={18} />
            <span class="what">
              <span class="name"
                >{v.name}{#if !v.active}<span class="tag">Hidden</span>{/if}</span
              >
              <span class="hint small">{v.address || "No address"}{used ? ` · ${used}` : ""}</span>
            </span>
            <Icon name="chevronRight" size={18} />
          </button>
          <a class="btn ghost map" href={mapOf(v)} target="_blank" rel="noopener noreferrer">Map</a>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="hint">No venues yet. Add the rink, then pick it for trainings and tournaments.</p>
  {/if}
</div>

<Sheet bind:open title={draft.id ? "Edit venue" : "Add a venue"}>
  <form class="form" onsubmit={save}>
    <label class="field"
      >Name <input
        class="input"
        bind:value={draft.name}
        placeholder="e.g. Battersea Sports Centre"
        maxlength="80"
        required
      /></label
    >
    <label class="field"
      >Address <input
        class="input"
        bind:value={draft.address}
        placeholder="e.g. London SW11 3AB"
        maxlength="160"
      /></label
    >
    <label class="field">
      Map link
      <input
        class="input"
        type="url"
        bind:value={draft.mapUrl}
        placeholder="https://maps.app.goo.gl/…"
        maxlength="500"
      />
      <span class="hint small"
        >In Google Maps, find it, then Share → Copy link. Empty: the map searches for the name and address.</span
      >
    </label>
    <label class="check"><input type="checkbox" bind:checked={draft.active} /> Offer it when picking a place</label>
    {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
    <button class="btn primary">{draft.id ? "Save" : "Add venue"}</button>
  </form>
</Sheet>

<style>
  .venues {
    display: grid;
    gap: var(--s-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    align-items: center;
    gap: var(--s-2);
  }
  li.hidden {
    opacity: 0.6;
  }
  .row {
    display: flex;
    flex: 1;
    align-items: center;
    gap: var(--s-3);
    min-width: 0;
    padding: var(--s-3);
    border: 0;
    border-radius: var(--r-md);
    background: none;
    color: var(--fg-body);
    text-align: left;
  }
  .row:hover {
    background: var(--surface-2);
  }
  .what {
    display: grid;
    flex: 1;
    min-width: 0;
  }
  .name {
    color: var(--fg);
    font-weight: 600;
  }
  .tag {
    margin-left: var(--s-2);
    color: var(--fg-muted);
    font-size: var(--text-sm);
    font-weight: 400;
  }
  .problem {
    color: var(--red-hot);
  }
</style>
