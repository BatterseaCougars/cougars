<script lang="ts">
  // Everything on: training sessions, tournaments and one-offs, in date order. Each training and tournament type
  // has its own icon and colour, and the chips at the top filter to one kind. Trainings and tournaments are set
  // up under Settings; one-off events are added here.
  import PageHeader from "../lib/PageHeader.svelte";
  import Sheet from "../lib/Sheet.svelte";
  import { createClubEvent } from "../app/backend.svelte";
  import { can } from "../access/actions";
  import type { IconName } from "../app/shell/icons";
  import Icon from "../app/shell/Icon.svelte";
  import type { Tone } from "../demo/model";
  import { calendar } from "../demo/schedule.svelte";
  import { granted } from "../demo/session.svelte";
  import { db } from "../demo/store.svelte";
  import EventCard from "../lib/EventCard.svelte";
  import Fab from "../lib/Fab.svelte";
  import { phone } from "../lib/viewport.svelte";
  import { londonISO } from "../lib/dates";

  const perms = $derived(granted());

  // ─── Filter ───
  const FILTER_KEY = "team.calendar.filter";
  let filter = $state(readFilter());
  function readFilter() {
    try {
      return localStorage.getItem(FILTER_KEY) ?? "all";
    } catch {
      return "all";
    }
  }
  function setFilter(f: string) {
    filter = f;
    try {
      localStorage.setItem(FILTER_KEY, f);
    } catch {
      // Private mode: the filter resets on reload.
    }
  }
  const chips = $derived<{ id: string; label: string; icon?: IconName; tone?: Tone }[]>([
    { id: "all", label: "All" },
    ...db.series
      .filter((s) => s.active)
      .map((s) => ({ id: `series:${s.id}`, label: s.shortName, icon: s.icon, tone: s.tone })),
    ...db.tournamentTypes
      .filter((t) => t.active)
      .map((t) => ({ id: `type:${t.id}`, label: t.shortName, icon: t.icon, tone: t.tone })),
    { id: "social", label: "Socials", icon: "glass", tone: "amber" },
  ]);
  const items = $derived(calendar().filter((e) => filter === "all" || e.filter === filter));

  // Group by month for the running order
  const months = $derived.by(() => {
    const out: { label: string; events: typeof items }[] = [];
    for (const e of items) {
      const label = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "Europe/London" }).format(
        new Date(e.startsAt),
      );
      const last = out.at(-1);
      if (last?.label === label) last.events.push(e);
      else out.push({ label, events: [e] });
    }
    return out;
  });

  // ─── Add a one-off ───
  let adding = $state(false);
  let draft = $state({ title: "", date: "", time: "19:30", venue: "", signup: true });
  async function add(e: SubmitEvent) {
    e.preventDefault();
    if (!draft.title || !draft.date) return;
    const startsAt = londonISO(draft.date, draft.time);
    const created = await createClubEvent({
      title: draft.title,
      startsAt,
      endsAt: new Date(Date.parse(startsAt) + 3 * 3600_000).toISOString(),
      venue: draft.venue,
      signup: draft.signup,
      capacity: null,
    });
    if (!created) return;
    adding = false;
    draft = { title: "", date: "", time: "19:30", venue: "", signup: true };
  }
</script>

<div class="page">
  <PageHeader
    title="Calendar"
    subtitle="Training, tournaments and everything else that's on."
    active={filter === "all" ? 0 : 1}
    onclear={() => setFilter("all")}
  >
    {#snippet actions()}
      <!-- + Event: in the toolbar row on desktop, a floating button on a phone -->
      {#if can(perms, "create:Event") && !phone.current}
        <button class="btn sm primary" aria-haspopup="dialog" onclick={() => (adding = true)}>
          <Icon name="plus" size={16} />Event
        </button>
      {/if}
    {/snippet}
    {#snippet filters()}
      <div class="filters" role="group" aria-label="Show">
        {#each chips as c (c.id)}
          <button
            class="filter"
            aria-pressed={filter === c.id}
            style:--tone={c.tone ? `var(--tone-${c.tone})` : "var(--fg)"}
            onclick={() => setFilter(c.id)}
          >
            {#if c.icon}<Icon name={c.icon} size={14} />{/if}
            {c.label}
          </button>
        {/each}
      </div>
    {/snippet}
  </PageHeader>

  {#each months as month (month.label)}
    <h2 class="section-title">{month.label}</h2>
    {#each month.events as event (event.key)}
      <EventCard {event} compact canSignUp={can(perms, "signup:Event")} />
    {/each}
  {:else}
    <p class="hint">Nothing coming up{filter === "all" ? "" : " for this one"}.</p>
  {/each}
  {#if can(perms, "create:Event") && phone.current}
    <Fab label="Event" aria-haspopup="dialog" onclick={() => (adding = true)} />
  {/if}
  <!-- A one-off event, in a sheet (a modal on desktop): the list stays where it is -->
  <Sheet bind:open={adding} title="Add an event">
    <form class="form" onsubmit={add}>
      <p class="hint">
        A one-off: a social, a kit day. Trainings and tournaments are set up under Settings, so they repeat and keep
        their own pages.
      </p>
      <label class="field"
        >Title <input class="input" bind:value={draft.title} placeholder="e.g. Summer social" required /></label
      >
      <div class="two">
        <label class="field">Date <input class="input" type="date" bind:value={draft.date} required /></label>
        <label class="field">Starts <input class="input" type="time" bind:value={draft.time} /></label>
      </div>
      <label class="field">Where <input class="input" bind:value={draft.venue} placeholder="e.g. The pub" /></label>
      <label class="check"><input type="checkbox" bind:checked={draft.signup} /> Members say in or out</label>
      <button class="btn primary">Add to calendar</button>
    </form>
  </Sheet>
</div>
