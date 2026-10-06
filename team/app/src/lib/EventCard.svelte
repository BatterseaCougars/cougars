<script lang="ts">
  import type { ClubEvent } from "../demo/data";
  import { ME } from "../demo/data";
  import { dateBadge, formatTime } from "./dates";

  let {
    event,
    canSignUp = true,
    feature = false,
  }: { event: ClubEvent; canSignUp?: boolean; feature?: boolean } = $props();

  const badge = $derived(dateBadge(event.startsAt));
  const inIt = $derived(event.going.includes(ME.id));
  const waiting = $derived(event.waitlist.includes(ME.id));
  const out = $derived(!inIt && !waiting);
  const full = $derived(event.capacity !== undefined && event.going.length >= event.capacity);
  const fill = $derived(event.capacity ? Math.min(1, event.going.length / event.capacity) : 0);

  function setIn(going: boolean) {
    event.going = event.going.filter((id) => id !== ME.id);
    event.waitlist = event.waitlist.filter((id) => id !== ME.id);
    if (!going) {
      // Someone drops out: the first on the waitlist moves up.
      if (event.waitlist.length && event.capacity && event.going.length < event.capacity) {
        event.going = [...event.going, event.waitlist[0]];
        event.waitlist = event.waitlist.slice(1);
      }
      return;
    }
    if (full) event.waitlist = [...event.waitlist, ME.id];
    else event.going = [...event.going, ME.id];
  }
</script>

<article class="event panel" class:feature class:kumite={event.kind === "kumite"} class:in={inIt}>
  <div class="date">
    <span class="eyebrow">{badge.weekday}</span>
    <span class="display day">{badge.day}</span>
    <span class="eyebrow">{badge.month}</span>
  </div>
  <div class="body">
    <h3>{event.title}</h3>
    <p class="hint">{formatTime(event.startsAt)}–{formatTime(event.endsAt)} · {event.venue}</p>
    {#if event.signup}
      <div class="meter" aria-hidden="true"><span style:width="{fill * 100}%"></span></div>
      <p class="count hint num">
        <span><strong>{event.going.length}</strong>{event.capacity ? ` / ${event.capacity}` : ""} in</span>
        {#if event.waitlist.length}<span>· {event.waitlist.length} waiting</span>{/if}
        {#if inIt}<span class="badge green">You're in</span>{:else if waiting}<span class="badge amber">Waitlist</span
          >{/if}
      </p>
    {/if}
  </div>
  {#if event.signup && canSignUp}
    <div class="seg red" role="group" aria-label="Are you in?">
      <button aria-pressed={inIt || waiting} onclick={() => setIn(true)}>{full && out ? "Waitlist" : "In"}</button>
      <button aria-pressed={out} onclick={() => setIn(false)}>Out</button>
    </div>
  {/if}
</article>

<style>
  .event {
    display: grid;
    grid-template-columns: 3.25rem 1fr;
    gap: var(--s-3) var(--s-4);
    align-items: start;
    padding: var(--s-4);
  }
  .event.in {
    border-color: var(--green-border);
  }
  .event.kumite:not(.feature) {
    border-color: var(--red-border);
  }
  .date {
    display: grid;
    justify-items: center;
    gap: 0.1rem;
    padding-right: var(--s-3);
    border-right: 1px solid var(--border);
    text-align: center;
  }
  .day {
    font-size: 1.9rem;
    color: var(--fg);
  }
  .kumite .day {
    color: var(--red-hot);
  }
  h3 {
    font-size: var(--text-md);
    font-weight: 600;
  }
  .meter {
    height: 3px;
    margin-top: var(--s-3);
    border-radius: 2px;
    background: color-mix(in srgb, var(--fg) 10%, transparent);
    overflow: hidden;
  }
  .meter span {
    display: block;
    height: 100%;
    border-radius: 2px;
    background: var(--red);
    transition: width var(--t-slow) var(--ease);
  }
  .count {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2);
    margin-top: var(--s-2);
  }
  .count strong {
    color: var(--fg);
  }
  .seg {
    grid-column: 1 / -1;
    display: flex;
  }
</style>
