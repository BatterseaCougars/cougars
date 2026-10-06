<script lang="ts">
  // One training's editor, full screen (Settings → Training → a card). A series is a rule (every N weeks on some
  // days, from a first date, optionally to a last one) plus what every session shares (ADR 0030). Saving makes its
  // sessions; each one can then be cancelled on its own. It zooms in over the list, as editors do in Gwenda ops.
  import type { TrainingSeries } from "../demo/model";
  import { resolve } from "../demo/schedule.svelte";
  import { db, syncSessions } from "../demo/store.svelte";
  import BackBar from "../app/shell/BackBar.svelte";
  import { navigate } from "../app/router.svelte";
  import StylePicker from "../lib/StylePicker.svelte";
  import { formatDayDate, londonISO, londonToday } from "../lib/dates";
  import { WEEKDAYS, describeRule, weekdayOf } from "../lib/recurrence";
  import { slugify } from "../lib/slug";

  const DAY_NAMES = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

  let { seriesId }: { seriesId?: number } = $props();

  const selected = $derived<number | "new">(seriesId ?? "new");
  let form = $state<TrainingSeries | null>(null);
  let saved = $state(false);

  const blank = (): TrainingSeries => {
    const today = londonToday();
    return {
      id: 0,
      slug: "",
      name: "",
      shortName: "",
      icon: "skate",
      tone: "green",
      repeatEvery: 1,
      weekdays: [weekdayOf(today)],
      startsOn: today,
      endsOn: null,
      startTime: "19:30",
      endTime: "21:00",
      venue: "",
      capacity: 20,
      public: true,
      active: true,
    };
  };

  $effect(() => {
    const s = selected === "new" ? blank() : db.series.find((x) => x.id === selected);
    form = s ? structuredClone($state.snapshot(s)) : null;
    saved = false;
  });

  const upcoming = $derived(
    typeof selected === "number"
      ? db.sessions.filter((s) => s.seriesId === selected && s.heldOn >= londonToday()).slice(0, 10)
      : [],
  );

  function toggleDay(d: (typeof WEEKDAYS)[number]) {
    if (!form) return;
    form.weekdays = form.weekdays.includes(d) ? form.weekdays.filter((x) => x !== d) : [...form.weekdays, d];
  }

  function save(e: SubmitEvent) {
    e.preventDefault();
    if (!form || !form.name || !form.weekdays.length) return;
    if (!form.shortName) form.shortName = form.name.split(" ")[0];
    if (selected === "new") {
      const id = Math.max(0, ...db.series.map((s) => s.id)) + 1;
      const created = {
        ...form,
        id,
        slug: slugify(form.name, ["new", ...db.series.map((s) => s.slug)]),
      };
      db.series.push(created);
      syncSessions(db.series.at(-1)!);
      // The blank form gives way to the new training's editor: Back goes to the list, not to an empty form.
      navigate(`/settings/training/${created.slug}`, { replace: true });
    } else {
      const target = db.series.find((s) => s.id === selected)!;
      Object.assign(target, form);
      syncSessions(target);
      saved = true;
    }
  }

  function toggleCancel(id: number) {
    const s = db.sessions.find((x) => x.id === id)!;
    s.cancelledAt = s.cancelledAt ? null : new Date().toISOString();
  }
</script>

<BackBar href="/settings/training" label="Training" title={selected === "new" ? "New training" : (form?.name ?? "")} />

<div class="page">
  {#if form}
    <form class="panel pad form" onsubmit={save}>
      <div class="two">
        <label class="field"
          >Name <input class="input" bind:value={form.name} placeholder="e.g. Sunday Skills" required /></label
        >
        <label class="field">
          Short name
          <input class="input" bind:value={form.shortName} placeholder="e.g. Sunday" maxlength="12" />
        </label>
      </div>
      <StylePicker bind:icon={form.icon} bind:tone={form.tone} />

      <fieldset class="field">
        <legend>Repeats</legend>
        <div class="repeat">
          Every
          <input class="input num every" type="number" min="1" max="8" bind:value={form.repeatEvery} />
          {form.repeatEvery === 1 ? "week" : "weeks"} on
        </div>
        <div class="days" role="group" aria-label="Days">
          {#each WEEKDAYS as d (d)}
            <button type="button" class="day" aria-pressed={form.weekdays.includes(d)} onclick={() => toggleDay(d)}>
              {DAY_NAMES[d]}
            </button>
          {/each}
        </div>
        <p class="hint">{describeRule(form)}</p>
      </fieldset>

      <div class="two">
        <label class="field"
          >First session <input class="input" type="date" bind:value={form.startsOn} required /></label
        >
        <label class="field">
          Last session
          <input
            class="input"
            type="date"
            value={form.endsOn ?? ""}
            onchange={(e) => form && (form.endsOn = e.currentTarget.value || null)}
          />
        </label>
      </div>
      <p class="hint small">Leave Last session empty to keep going; sessions are made 12 weeks ahead.</p>
      <div class="two">
        <label class="field">Starts <input class="input" type="time" bind:value={form.startTime} /></label>
        <label class="field">Ends <input class="input" type="time" bind:value={form.endTime} /></label>
      </div>
      <div class="two">
        <label class="field">Venue <input class="input" bind:value={form.venue} placeholder="e.g. The rink" /></label>
        <label class="field">
          Places
          <input
            class="input"
            type="number"
            min="0"
            value={form.capacity ?? ""}
            onchange={(e) => form && (form.capacity = Number(e.currentTarget.value) || null)}
          />
        </label>
      </div>
      <label class="check"><input type="checkbox" bind:checked={form.public} /> Show on the website calendar</label>
      <label class="check"
        ><input type="checkbox" bind:checked={form.active} /> Running (untick to pause: no new sessions)</label
      >
      <div class="actions">
        <button class="btn primary">{selected === "new" ? "Add training" : "Save"}</button>
        {#if saved}<span class="badge green rise">Saved</span>{/if}
      </div>
    </form>
    {#if upcoming.length}
      <h2 class="section-title">Next sessions</h2>
      <div class="list">
        {#each upcoming as session (session.id)}
          {@const r = resolve(session)}
          <div class="row" class:off={r.cancelled}>
            <span class="grow">
              <span class="title">{formatDayDate(londonISO(r.heldOn, r.startTime))}</span>
              <span class="sub">
                {r.startTime}–{r.endTime} · {r.venue} · {session.going.length} in
              </span>
            </span>
            {#if r.cancelled}<span class="badge">Cancelled</span>{/if}
            <button class="btn sm ghost" onclick={() => toggleCancel(session.id)}
              >{r.cancelled ? "Restore" : "Cancel"}</button
            >
          </div>
        {/each}
      </div>
      <p class="hint">
        Cancelling keeps the session, so whoever signed up can be told. Moving a session comes with the real data (T2).
      </p>
    {/if}
  {/if}
</div>

<style>
  h2 {
    font-size: var(--text-md);
    font-weight: 600;
  }
  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
  }
  legend {
    padding: 0;
    margin-bottom: var(--s-2);
  }
  .repeat {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    color: var(--fg-body);
  }
  .every {
    width: 4.5rem;
    text-align: center;
  }
  .days {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-1);
    margin: var(--s-2) 0;
  }
  .day {
    min-width: 3rem;
    height: 2.25rem;
    border: 1px solid var(--border-strong);
    border-radius: var(--r-pill);
    background: none;
    color: var(--fg-muted);
    font-size: var(--text-sm);
    font-weight: 500;
  }
  .day[aria-pressed="true"] {
    border-color: var(--red-border);
    background: var(--red-wash);
    color: var(--fg);
  }
  .check {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    color: var(--fg-body);
  }
  .small {
    margin-top: calc(-1 * var(--s-2));
    font-size: var(--text-xs);
  }
  .actions {
    display: flex;
    align-items: center;
    gap: var(--s-3);
  }
  .row.off .title {
    text-decoration: line-through;
    opacity: 0.6;
  }
</style>
