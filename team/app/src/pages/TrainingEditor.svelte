<script lang="ts">
  // One training's editor, full screen (Settings → Training → a card). A series is a rule (every N weeks on some
  // days, from a first date, optionally to a last one) plus what every session shares (ADR 0030). Saving makes its
  // sessions; each one can then be cancelled on its own. It zooms in over the list, as editors do in Gwenda ops.
  import type { TrainingSeries } from "../demo/model";
  import { resolve } from "../demo/schedule.svelte";
  import { db } from "../demo/store.svelte";
  import { createSeries, setCancelled, updateSeries } from "../app/backend.svelte";
  import BackBar from "../app/shell/BackBar.svelte";
  import { navigate } from "../app/router.svelte";
  import StylePicker from "../lib/StylePicker.svelte";
  import { formatDayDate, londonISO, londonToday, pounds } from "../lib/dates";
  import { feeOn } from "../lib/dues";
  import { collectedFor } from "../demo/dues.svelte";
  import { WEEKDAYS, describeRule, weekdayOf } from "../lib/recurrence";

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
      goalieCapacity: 2,
      public: true,
      active: true,
      fees: [{ pence: 1000, from: today }],
    };
  };

  $effect(() => {
    const s = selected === "new" ? blank() : db.series.find((x) => x.id === selected);
    form = s ? structuredClone($state.snapshot(s)) : null;
    saved = false;
  });

  // The fee, going forward: a new amount applies from its date; sessions already held keep theirs (ADR 0032).
  const current = $derived(form ? feeOn(form.fees, londonToday()) : 0);
  let feeAmount = $state("");
  let feeFrom = $state(londonToday());
  $effect(() => {
    feeAmount = form ? String(feeOn(form.fees, londonToday()) / 100) : "";
    feeFrom = londonToday();
  });
  function applyFee() {
    if (!form) return;
    const pence = Math.round(Number(feeAmount) * 100);
    if (!Number.isFinite(pence) || pence < 0 || pence === feeOn(form.fees, feeFrom)) return;
    form.fees = [...form.fees.filter((f) => f.from !== feeFrom), { pence, from: feeFrom }].sort((a, b) =>
      a.from.localeCompare(b.from),
    );
  }

  const fullDate = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Europe/London",
    });

  // Sessions already held: what each was due, and what it has collected so far
  const held = $derived(
    typeof selected === "number"
      ? db.sessions
          .filter((s) => s.seriesId === selected && s.heldOn < londonToday())
          .sort((a, b) => b.heldOn.localeCompare(a.heldOn))
          .slice(0, 8)
      : [],
  );

  const upcoming = $derived(
    typeof selected === "number" ? db.sessions.filter((s) => s.seriesId === selected && s.heldOn >= londonToday()) : [],
  );

  function toggleDay(d: (typeof WEEKDAYS)[number]) {
    if (!form) return;
    form.weekdays = form.weekdays.includes(d) ? form.weekdays.filter((x) => x !== d) : [...form.weekdays, d];
  }

  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (!form || !form.name || !form.weekdays.length) return;
    if (!form.shortName) form.shortName = form.name.split(" ")[0];
    applyFee();
    if (selected === "new") {
      const created = await createSeries(form);
      // The blank form gives way to the new training's editor: Back goes to the list, not to an empty form.
      if (created) navigate(`/settings/training/${created.slug}`, { replace: true });
    } else {
      saved = Boolean(await updateSeries(form));
    }
  }

  // Cancelling keeps the session (a row in D1), so whoever signed up can be told.
  function toggleCancel(id: number) {
    const s = db.sessions.find((x) => x.id === id)!;
    setCancelled(id, !s.cancelledAt);
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
      <label class="field">Venue <input class="input" bind:value={form.venue} placeholder="e.g. The rink" /></label>
      <div class="two">
        <label class="field">
          Skater places
          <input
            class="input"
            type="number"
            min="0"
            value={form.capacity ?? ""}
            onchange={(e) => form && (form.capacity = Number(e.currentTarget.value) || null)}
          />
        </label>
        <label class="field">
          Goalie places
          <input
            class="input"
            type="number"
            min="0"
            value={form.goalieCapacity ?? ""}
            onchange={(e) =>
              form && (form.goalieCapacity = e.currentTarget.value === "" ? null : Number(e.currentTarget.value))}
          />
        </label>
      </div>
      <p class="hint small">Leave either empty for no limit.</p>
      <fieldset class="field">
        <legend>Fee per session</legend>
        <div class="two">
          <label class="field">
            Amount (£)
            <input class="input num" inputmode="decimal" bind:value={feeAmount} />
          </label>
          <label class="field">From <input class="input" type="date" bind:value={feeFrom} /></label>
        </div>
        <p class="hint small">
          {current ? `${pounds(current)} now.` : "Free now."} A new fee applies from its date; sessions already held keep
          theirs. Subscribers aren't charged.
        </p>
        {#if form.fees.length > 1}
          <p class="hint small">
            {#each [...form.fees].reverse() as f, i (f.from)}{i ? " · " : ""}{pounds(f.pence)} from {fullDate(
                f.from,
              )}{/each}
          </p>
        {/if}
      </fieldset>
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
    {#if held.length}
      <h2 class="section-title">Held</h2>
      <div class="list">
        {#each held as session (session.id)}
          {@const c = collectedFor("session", session.id)}
          <div class="row">
            <span class="grow">
              <span class="title">{formatDayDate(londonISO(session.heldOn, session.startTime ?? form.startTime))}</span>
              <span class="sub num">
                {session.attended?.length ?? 0} came · {c.people} pay as you go at {pounds(session.feePence ?? 0)} · {c.paidPeople}
                paid
              </span>
            </span>
            <span class="collected num" class:short={c.paid < c.due}>
              <strong>{pounds(c.paid)}</strong> / {pounds(c.due)}
            </span>
          </div>
        {/each}
      </div>
      <p class="hint">What each session collected against what it was due. Mark payments on a member's profile.</p>
    {/if}
  {/if}
</div>

<style>
  .collected {
    color: var(--fg-muted);
    white-space: nowrap;
  }
  .collected strong {
    color: var(--green);
    font-weight: 600;
  }
  .collected.short strong {
    color: var(--fg);
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
