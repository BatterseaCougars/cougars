<script lang="ts">
  // One session, tournament or social, with In/Out. Every kind carries its own icon and colour (set by an admin
  // per training and tournament type), so the calendar reads at a glance.
  import type { Bookable } from "../demo/model";
  import { impersonating, me } from "../demo/session.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import { dateBadge, formatTime } from "./dates";

  let {
    event,
    canSignUp = true,
    feature = false,
    compact = false,
    onanswer,
  }: {
    event: Bookable;
    canSignUp?: boolean;
    feature?: boolean;
    /** Calendar rows: the type label and a link, no capacity meter. */
    compact?: boolean;
    /** Called after a tap on In or Out with where the member ended up. */
    onanswer?: (status: "in" | "waitlist" | "out") => void;
  } = $props();

  const KIND = { training: "Training", tournament: "Tournament", social: "Social" } as const;

  const entries = $derived(event.entries);
  const badge = $derived(dateBadge(event.startsAt));
  const id = $derived(me().id);
  // Viewing as someone is read-only (ADR 0029): you see their answer, you can't change it.
  const locked = $derived(impersonating());
  const inIt = $derived(entries.going.includes(id));
  const waiting = $derived(entries.waitlist.includes(id));
  const out = $derived(!inIt && !waiting);
  const full = $derived(event.capacity != null && entries.going.length >= event.capacity);
  const fill = $derived(event.capacity ? Math.min(1, entries.going.length / event.capacity) : 0);

  function setIn(going: boolean) {
    if (locked) return;
    entries.going = entries.going.filter((x) => x !== id);
    entries.waitlist = entries.waitlist.filter((x) => x !== id);
    if (!going) {
      // Someone drops out: the first on the waitlist moves up.
      if (entries.waitlist.length && event.capacity && entries.going.length < event.capacity) {
        entries.going = [...entries.going, entries.waitlist[0]];
        entries.waitlist = entries.waitlist.slice(1);
      }
      onanswer?.("out");
      return;
    }
    if (full) {
      entries.waitlist = [...entries.waitlist, id];
      onanswer?.("waitlist");
    } else {
      entries.going = [...entries.going, id];
      onanswer?.("in");
    }
  }
</script>

<article
  class="event panel {event.kind}"
  class:feature
  class:compact
  class:in={inIt}
  class:cancelled={event.cancelled}
  style:--tone="var(--tone-{event.tone})"
>
  <div class="date">
    <span class="eyebrow">{badge.weekday}</span>
    <span class="display day">{badge.day}</span>
    <span class="eyebrow">{badge.month}</span>
  </div>
  <div class="body">
    <p class="type">
      <span class="chip"><Icon name={event.icon} size={14} /></span>
      <span class="kind">{KIND[event.kind]}</span>
      {#if event.cancelled}<span class="badge">Cancelled</span>{/if}
    </p>
    <h3>
      {#if compact && event.href}<a href={event.href}>{event.title}</a>{:else}{event.title}{/if}
    </h3>
    <p class="hint">{formatTime(event.startsAt)}–{formatTime(event.endsAt)} · {event.venue}</p>
    {#if event.signup}
      {#if !compact && event.capacity}
        <div class="meter" aria-hidden="true"><span style:width="{fill * 100}%"></span></div>
      {/if}
      <p class="count hint num">
        <span><strong>{entries.going.length}</strong>{event.capacity ? ` / ${event.capacity}` : ""} in</span>
        {#if entries.waitlist.length}<span>· {entries.waitlist.length} waiting</span>{/if}
        {#if inIt}<span class="badge green">You're in</span>{:else if waiting}<span class="badge amber">Waitlist</span
          >{/if}
      </p>
    {/if}
  </div>
  {#if event.signup && canSignUp}
    <div class="seg red" role="group" aria-label="Are you in?">
      <button aria-pressed={inIt || waiting} disabled={locked} onclick={() => setIn(true)}>
        {full && out ? "Waitlist" : "In"}
      </button>
      <button aria-pressed={out} disabled={locked} onclick={() => setIn(false)}>Out</button>
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
    overflow: hidden;
  }
  /* The colour stripe down the left: the training's or tournament's own tone */
  .event::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: var(--tone);
  }
  .event.in {
    border-color: var(--green-border);
  }
  /* Tournaments stand out more: a wash of their colour */
  .event.tournament:not(.feature) {
    border-color: color-mix(in srgb, var(--tone) 40%, transparent);
    background:
      linear-gradient(150deg, color-mix(in srgb, var(--tone) 16%, transparent), transparent 60%), var(--panel-bg);
  }
  /* Socials are lighter: a dashed edge */
  .event.social {
    border-style: dashed;
  }
  .event.cancelled {
    opacity: 0.55;
  }
  .event.cancelled h3 {
    text-decoration: line-through;
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
  .tournament .day {
    color: var(--tone);
  }
  .type {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    margin-bottom: var(--s-1);
  }
  .chip {
    display: grid;
    place-items: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: var(--r-sm);
    background: color-mix(in srgb, var(--tone) 18%, transparent);
    color: var(--tone);
  }
  .kind {
    font-size: var(--text-2xs);
    font-weight: 600;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--tone);
  }
  h3 {
    font-size: var(--text-md);
    font-weight: 600;
  }
  h3 a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
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
    background: var(--tone);
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
  .seg button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .seg {
    grid-column: 1 / -1;
    display: flex;
  }
</style>
