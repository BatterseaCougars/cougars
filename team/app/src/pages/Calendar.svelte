<script lang="ts">
  import { can } from "../access/actions";
  import type { ClubEvent } from "../demo/data";
  import { granted } from "../demo/session.svelte";
  import { db } from "../demo/store.svelte";
  import EventCard from "../lib/EventCard.svelte";

  const perms = $derived(granted());
  let adding = $state(false);
  let draft = $state({ title: "", date: "", time: "19:30", kind: "social" as ClubEvent["kind"], signup: true });

  function add(e: SubmitEvent) {
    e.preventDefault();
    if (!draft.title || !draft.date) return;
    const startsAt = new Date(`${draft.date}T${draft.time}:00`).toISOString();
    const endsAt = new Date(new Date(startsAt).getTime() + 2 * 3600_000).toISOString();
    db.events = [
      ...db.events,
      {
        id: Date.now(),
        kind: draft.kind,
        title: draft.title,
        startsAt,
        endsAt,
        venue: "TBC",
        signup: draft.signup,
        going: [],
        waitlist: [],
      },
    ].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    adding = false;
    draft = { title: "", date: "", time: "19:30", kind: "social", signup: true };
  }

  // Group by month for the running order
  const months = $derived.by(() => {
    const out: { label: string; events: ClubEvent[] }[] = [];
    for (const e of db.events) {
      const label = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "Europe/London" }).format(
        new Date(e.startsAt),
      );
      const last = out.at(-1);
      if (last?.label === label) last.events.push(e);
      else out.push({ label, events: [e] });
    }
    return out;
  });
</script>

<div class="page">
  <div class="page-head">
    <div>
      <h1>Calendar</h1>
      <p class="hint">Friday hockey every week, and whatever else is on.</p>
    </div>
    {#if can(perms, "create:Event")}
      <button class="btn sm" class:primary={!adding} class:ghost={adding} onclick={() => (adding = !adding)}>
        {adding ? "Cancel" : "+ Event"}
      </button>
    {/if}
  </div>

  {#if adding}
    <form class="panel pad form rise" onsubmit={add}>
      <label class="field"
        >Title <input class="input" bind:value={draft.title} placeholder="e.g. Summer social" required /></label
      >
      <div class="two">
        <label class="field">Date <input class="input" type="date" bind:value={draft.date} required /></label>
        <label class="field">Starts <input class="input" type="time" bind:value={draft.time} /></label>
      </div>
      <label class="field">
        Kind
        <select class="input" bind:value={draft.kind}>
          <option value="social">Social</option>
          <option value="kumite">Kumite</option>
          <option value="friday">Extra hockey</option>
        </select>
      </label>
      <label class="check"><input type="checkbox" bind:checked={draft.signup} /> Members say in or out</label>
      <button class="btn primary">Add to calendar</button>
    </form>
  {/if}

  {#each months as month (month.label)}
    <h2 class="section-title">{month.label}</h2>
    {#each month.events as event (event.id)}
      <EventCard {event} canSignUp={can(perms, "signup:Event")} />
    {/each}
  {/each}
</div>

<style>
  .check {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    color: var(--fg-body);
  }
</style>
