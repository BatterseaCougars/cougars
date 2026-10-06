<script lang="ts">
  // One session, tournament or social, with In/Out. Every kind carries its own icon and colour (set by an admin
  // per training and tournament type), so the calendar reads at a glance.
  import type { Snippet } from "svelte";
  import type { Bookable } from "../demo/model";
  import { impersonating, me } from "../demo/session.svelte";
  import { answerFor } from "../app/backend.svelte";
  import { prefersReducedMotion } from "../app/motion";
  import { db } from "../demo/store.svelte";
  import { pick } from "./quips";
  import Icon from "../app/shell/Icon.svelte";
  import { dateBadge, formatTime } from "./dates";

  let {
    event,
    canSignUp = true,
    feature = false,
    compact = false,
    onanswer,
    footer,
    beckon = false,
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
    /** The session you're being asked about (Home's next one, a training's page): until you're in, In pulses once
     * and then its label types out a nudge ("Do it…"). Saying out starts both again. */
    beckon?: boolean;
  } = $props();

  const KIND = { training: "Training", tournament: "Tournament", social: "Social" } as const;

  const entries = $derived(event.entries);
  const badge = $derived(dateBadge(event.startsAt));
  const id = $derived(me().id);
  // Viewing as someone is read-only (ADR 0029): you see their answer, you can't change it.
  const locked = $derived(impersonating());
  // Three answers and none: in (or waitlisted), out, or not said yet, when neither button is pressed.
  const inIt = $derived(entries.going.includes(id));
  const waiting = $derived(entries.waitlist.includes(id));
  const out = $derived(entries.out?.includes(id) ?? false);
  const full = $derived(event.capacity != null && entries.going.length >= event.capacity);
  const fill = $derived(event.capacity ? Math.min(1, entries.going.length / event.capacity) : 0);

  // Not in yet, whether unanswered or out: Out doesn't get you off the hook. A full session's In says "Join
  // waitlist", which matters more than a nudge.
  const nudging = $derived(beckon && canSignUp && event.signup && !inIt && !waiting && !full && !locked);
  // One line per visit: once In has pulsed, its label clears and types this out instead
  const nudge = pick(db.quips.filter((q) => q.kind === "nudge" && q.text.trim()))?.text ?? "";
  let typed = $state("");
  let typing = $state(false);
  $effect(() => {
    void out; // saying out starts it again
    typing = false;
    typed = "";
    if (!nudging || !nudge) return;
    if (prefersReducedMotion) {
      typing = true;
      typed = nudge;
      return;
    }
    let i = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      typing = true;
      timer = setInterval(() => {
        i += 1;
        typed = nudge.slice(0, i);
        if (i >= nudge.length) clearInterval(timer);
      }, 70);
    }, 1500);
    return () => (clearTimeout(start), clearInterval(timer));
  });

  // The card answers at once; the server's word (in, or the waitlist) arrives with the refresh.
  function setIn(going: boolean) {
    if (locked) return;
    void answerFor(event.key, going ? "in" : "out");
    const wasIn = inIt;
    entries.going = entries.going.filter((x) => x !== id);
    entries.waitlist = entries.waitlist.filter((x) => x !== id);
    entries.out = (entries.out ?? []).filter((x) => x !== id);
    if (!going) {
      entries.out = [...entries.out, id];
      // Someone drops out: the first on the waitlist moves up.
      if (wasIn && entries.waitlist.length && event.capacity && entries.going.length < event.capacity) {
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
          >{:else if out}<span class="badge">You're out</span>{/if}
      </p>
    {/if}
  </div>
  {#if event.signup && canSignUp}
    <div class="seg answer" role="group" aria-label="Are you in?">
      <button
        class="yes"
        class:beckon={nudging && !out}
        class:beckon-again={nudging && out}
        aria-pressed={inIt || waiting}
        disabled={locked}
        aria-label={typing ? "In" : undefined}
        onclick={() => setIn(true)}
      >
        {#if typing}
          <span class="nudge" aria-hidden="true">{typed}<span class="caret" class:done={typed === nudge}></span></span>
        {:else}
          {#if inIt}<Icon name="check" size={16} />{/if}
          {waiting ? "Waitlist" : full && !inIt ? "Join waitlist" : "In"}
        {/if}
      </button>
      <button class="no" aria-pressed={out} disabled={locked} onclick={() => setIn(false)}>
        {#if out}<Icon name="x" size={16} />{/if}Out
      </button>
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
  /* The nudge on In: typed in the page-title face, leaning in, then its caret blinks out */
  .nudge {
    color: var(--green);
    font-family: var(--font-display);
    font-size: var(--text-md);
    font-style: italic;
    letter-spacing: 0.01em;
    line-height: 1;
  }
  .caret {
    display: inline-block;
    width: 2px;
    height: 0.95em;
    margin-left: 2px;
    vertical-align: -0.1em;
    background: currentColor;
  }
  .caret.done {
    animation: caret-out 2.4s steps(1) forwards;
  }
  @keyframes caret-out {
    0%,
    40% {
      opacity: 1;
    }
    20%,
    60%,
    100% {
      opacity: 0;
    }
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
  /* Two tiles, the same before and after you answer: a clear light fill until pressed, then In lights up green
     with a tick and Out turns brighter with a cross. No track around them. */
  .answer {
    gap: var(--s-2);
    border-color: transparent;
    background: none;
  }
  .answer > button {
    border-radius: var(--r-md);
    background: color-mix(in srgb, var(--fg) 10%, transparent);
    color: var(--fg);
    font-weight: 600;
  }
  .answer > button:hover:not(:disabled):not([aria-pressed="true"]) {
    background: color-mix(in srgb, var(--fg) 16%, transparent);
  }
  /* The session you're asked about, while you're not in: In pulses once, a soft ring. A shadow, so nothing moves. */
  .answer > .yes.beckon {
    animation: beckon 1.2s 300ms var(--ease-in-out) 1 both;
  }
  /* Said out: another class, so the pulse plays again for them */
  .answer > .yes.beckon-again {
    animation: beckon 1.2s 300ms var(--ease-in-out) 1 both;
  }
  @keyframes beckon {
    0%,
    100% {
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--green) 0%, transparent);
    }
    50% {
      box-shadow: 0 0 0 5px color-mix(in srgb, var(--green) 28%, transparent);
      background: color-mix(in srgb, var(--green) 14%, color-mix(in srgb, var(--fg) 10%, transparent));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .answer > .yes.beckon,
    .answer > .yes.beckon-again {
      animation: none;
    }
  }
  .answer > .yes[aria-pressed="true"] {
    background: var(--green-wash);
    border-color: var(--green-border);
    color: var(--green);
    box-shadow: none;
  }
  .answer > .no[aria-pressed="true"] {
    background: color-mix(in srgb, var(--fg) 24%, transparent);
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
