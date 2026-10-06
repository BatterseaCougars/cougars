<script lang="ts">
  // Settings → Training: every training as a card, as Gwenda ops shows its series. A card opens that training's
  // editor, full screen; "New training" opens a blank one. New trainings appear in the menu and calendar at once.
  import PageHeader from "../lib/PageHeader.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import { nextSession, sessionBookable } from "../demo/schedule.svelte";
  import { db } from "../demo/store.svelte";
  import { formatDayDate, londonToday, pounds } from "../lib/dates";
  import { feeOn } from "../lib/dues";
  import { describeRule } from "../lib/recurrence";

  const cards = $derived(
    db.series.map((s) => {
      const next = s.active ? nextSession(s) : undefined;
      return {
        s,
        next: next ? formatDayDate(sessionBookable(next).startsAt) : "No sessions coming up",
        signedUp: next ? `${next.going.length}${s.capacity ? ` / ${s.capacity}` : ""} in` : "",
      };
    }),
  );
</script>

<div class="page">
  <PageHeader
    title="Training"
    subtitle="Repeating sessions. Each one gets its own page, menu link and place in the calendar."
  />

  <ul class="grid">
    {#each cards as { s, next, signedUp } (s.id)}
      <li>
        <a class="card panel glass" href="/settings/training/{s.slug}" style:--tone="var(--tone-{s.tone})">
          <span class="top">
            <span class="chip"><Icon name={s.icon} size={20} /></span>
            {#if !s.active}<span class="badge">Paused</span>{:else if !s.public}<span class="badge">Members only</span
              >{:else}<span class="badge green">Running</span>{/if}
          </span>
          <span class="eyebrow">{describeRule(s)}</span>
          <span class="name">{s.name}</span>
          <span class="line"><span class="label">Next</span> {next}</span>
          <span class="line muted">{s.startTime}–{s.endTime} · {s.venue || "No venue"}</span>
          <span class="line muted num">{pounds(feeOn(s.fees, londonToday())) || "Free"} a session</span>
          {#if signedUp}<span class="line muted num">{signedUp}</span>{/if}
          <span class="go"><Icon name="chevronRight" size={18} /></span>
        </a>
      </li>
    {/each}
    <li>
      <a class="card new" href="/settings/training/new">
        <span class="plus"><Icon name="plus" size={22} /></span>
        <span class="name">New training</span>
        <span class="line muted">A day, a time, a place. Sessions are made 12 weeks ahead.</span>
      </a>
    </li>
  </ul>
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
    gap: var(--s-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .card {
    position: relative;
    display: grid;
    align-content: start;
    gap: var(--s-1);
    height: 100%;
    padding: var(--s-4);
    color: var(--fg-muted);
    transition:
      translate var(--t) var(--ease),
      border-color var(--t) var(--ease-in-out);
  }
  .card:hover {
    translate: 0 -2px;
    border-color: var(--border-strong);
  }
  .card:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--s-2);
  }
  .chip {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--r-md);
    background: color-mix(in srgb, var(--tone) 16%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tone) 28%, transparent);
    color: var(--tone);
  }
  .name {
    color: var(--fg);
    font-size: var(--text-md);
    font-weight: 600;
  }
  .line {
    font-size: var(--text-sm);
    color: var(--fg);
  }
  .line.muted {
    color: var(--fg-muted);
  }
  .label {
    color: var(--fg-subtle);
    font-size: var(--text-2xs);
    font-weight: 700;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }
  .go {
    position: absolute;
    right: var(--s-3);
    bottom: var(--s-3);
    color: var(--fg-subtle);
    transition: translate var(--t) var(--ease);
  }
  .card:hover .go {
    translate: 3px 0;
    color: var(--fg);
  }
  .card.new {
    place-content: center;
    justify-items: center;
    min-height: 12rem;
    border: 1px dashed var(--border-strong);
    border-radius: var(--r-lg);
    text-align: center;
  }
  .card.new:hover {
    border-color: var(--fg-subtle);
  }
  .plus {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    margin-bottom: var(--s-2);
    border-radius: 50%;
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    color: var(--fg);
  }
</style>
