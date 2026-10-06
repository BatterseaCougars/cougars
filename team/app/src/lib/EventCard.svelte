<script lang="ts">
  // One session, tournament or social, with In/Out. Every kind carries its own icon and colour (set by an admin
  // per training and tournament type), so the calendar reads at a glance.
  import type { Snippet } from "svelte";
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
    footer,
  }: {
    event: Bookable;
    canSignUp?: boolean;
    feature?: boolean;
    /** Calendar rows: the type label and a link, no capacity meter. */
    compact?: boolean;
    /** Called after a tap on In or Out with where the member ended up. */
    onanswer?: (status: "in" | "waitlist" | "out") => void;
    /** A link row along the bottom of the card (Home: where you stand, and the way to the teams). */
    footer?: Snippet;
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
  class="event panel glass {event.kind}"
  class:feature
  class:compact
  class:cancelled={event.cancelled}
  style:--tone="var(--tone-{event.tone})"
>
  <div class="date">
    <span class="eyebrow">{badge.weekday}</span>
    <span class="display day">{badge.day}</span>
    <span class="eyebrow">{badge.month}</span>
  </div>
  <div class="body">
    <!-- What matters first: which session (icon and name) and when. Where is a quiet second line. -->
    <div class="head">
      <span class="chip" title={KIND[event.kind]}><Icon name={event.icon} size={18} /></span>
      <h3>
        {#if compact && event.href}<a href={event.href}>{event.title}</a>{:else}{event.title}{/if}
      </h3>
      {#if event.cancelled}<span class="badge">Cancelled</span>{/if}
    </div>
    <p class="time num">{formatTime(event.startsAt)}–{formatTime(event.endsAt)}</p>
    {#if event.venue}<p class="venue"><Icon name="pin" size={13} />{event.venue}</p>{/if}
    {#if event.signup}
      {#if !compact && event.capacity}
        <div class="meter" aria-hidden="true"><span style:width="{fill * 100}%"></span></div>
      {/if}
      <!-- One fixed-height line: the badge swaps in place, so answering never moves anything -->
      <p class="count hint num">
        <span><strong>{entries.going.length}</strong>{event.capacity ? ` / ${event.capacity}` : ""} in</span>
        {#if entries.waitlist.length}<span>· {entries.waitlist.length} waiting</span>{/if}
        {#if inIt}<span class="badge green">You're in</span>{:else if waiting}<span class="badge amber">Waitlist</span
          >{/if}
      </p>
    {/if}
  </div>
  {#if event.signup && canSignUp}
    <div class="seg answer" role="group" aria-label="Are you in?">
      <button class="yes" aria-pressed={inIt || waiting} disabled={locked} onclick={() => setIn(true)}>
        {#if inIt}<Icon name="check" size={16} />{/if}
        {waiting ? "Waitlist" : full && out ? "Join waitlist" : "In"}
      </button>
      <button class="no" aria-pressed={out} disabled={locked} onclick={() => setIn(false)}>Out</button>
    </div>
  {/if}
  {#if footer}<div class="foot">{@render footer()}</div>{/if}
</article>

<style>
  .event {
    display: grid;
    grid-template-columns: 3.25rem 1fr;
    gap: var(--s-3) var(--s-4);
    align-items: start;
    padding: var(--s-4);
  }
  .event.cancelled {
    opacity: 0.55;
  }
  .event.cancelled h3 {
    text-decoration: line-through;
  }
  .date {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 0.1rem;
    padding-right: var(--s-3);
    border-right: 1px solid var(--border);
    text-align: center;
  }
  /* Calendar rows: the divider beside the date takes the type's colour, a short lit bar, so a month reads at a
     glance without colouring the whole card */
  .compact .date {
    border-right-color: transparent;
  }
  .compact .date::after {
    content: "";
    position: absolute;
    top: 0.2rem;
    bottom: 0.2rem;
    right: -1px;
    width: 2px;
    border-radius: 2px;
    background: var(--tone);
    box-shadow: 0 0 10px color-mix(in srgb, var(--tone) 55%, transparent);
  }
  .day {
    font-size: 1.9rem;
    color: var(--fg);
  }
  .head {
    display: flex;
    align-items: center;
    gap: var(--s-3);
  }
  /* The only colour on the card: the type's icon */
  .chip {
    display: grid;
    place-items: center;
    flex: none;
    width: 2rem;
    height: 2rem;
    border-radius: var(--r-sm);
    background: color-mix(in srgb, var(--tone) 16%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tone) 28%, transparent);
    color: var(--tone);
  }
  h3 {
    flex: 1;
    min-width: 0;
    font-size: var(--text-md);
    font-weight: 600;
    line-height: 1.2;
    color: var(--fg);
  }
  .time {
    margin-top: var(--s-2);
    font-size: var(--text-md);
    font-weight: 500;
    color: var(--fg);
  }
  .venue {
    display: flex;
    align-items: center;
    gap: var(--s-1);
    margin-top: 0.15rem;
    font-size: var(--text-xs);
    color: var(--fg-subtle);
  }
  .feature h3 {
    font-size: var(--text-lg);
  }
  h3 a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .meter {
    height: 3px;
    margin-top: var(--s-3);
    border-radius: 2px;
    background: color-mix(in srgb, var(--fg) 9%, transparent);
    overflow: hidden;
  }
  .meter span {
    display: block;
    height: 100%;
    border-radius: 2px;
    background: color-mix(in srgb, var(--fg) 55%, transparent);
    transition: width var(--t-slow) var(--ease);
  }
  .count {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    min-height: 1.5rem;
    margin-top: var(--s-2);
    white-space: nowrap;
  }
  .count strong {
    color: var(--fg);
  }
  .count .badge {
    margin-left: auto;
  }
  .seg {
    grid-column: 1 / -1;
    display: flex;
  }
  .seg > button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-1);
    min-height: 2.5rem;
    border: 1px solid transparent;
  }
  /* In and Out read differently: In lights up green, Out is a quiet neutral tile */
  .answer > .yes[aria-pressed="true"] {
    background: var(--green-wash);
    border-color: var(--green-border);
    color: var(--green);
    box-shadow: none;
  }
  .answer > .no[aria-pressed="true"] {
    background: color-mix(in srgb, var(--fg) 12%, transparent);
    border-color: var(--border-strong);
    color: var(--fg);
    box-shadow: none;
  }
  .foot {
    grid-column: 1 / -1;
    margin: 0 calc(-1 * var(--s-4)) calc(-1 * var(--s-4));
    border-top: 1px solid var(--border);
  }
  .seg button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
</style>
