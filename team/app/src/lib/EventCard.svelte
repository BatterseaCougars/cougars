<script lang="ts">
  // One session, tournament or social, with In/Out ("Roster", picked 2026-10-07). The header says what and when, with
  // how soon it is and where you stand on the right. Below it, the question people bring to the card, who's going:
  // their faces and first names, the count and spaces left, and In and Out at the end of that row, so you answer
  // next to the people you'd be playing with. Every kind carries its own icon and colour (set by an admin per
  // training and tournament type), so the calendar reads at a glance. Nothing moves when you answer.
  import { goesByOf } from "./names";
  import type { Snippet } from "svelte";
  import type { Bookable } from "../demo/model";
  import { impersonating, me } from "../demo/session.svelte";
  import { answerFor } from "../app/backend.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import { PLAYERS } from "../demo/data";
  import { dateBadge, formatTime, londonToday } from "./dates";
  import { initials } from "./initials";

  let {
    event,
    canSignUp = true,
    feature = false,
    compact = false,
    onanswer,
    footer,
    beckon = false,
    roster = true,
  }: {
    event: Bookable;
    canSignUp?: boolean;
    feature?: boolean;
    /** Calendar rows: the title links to its page, and the date gets a bar in the type's colour. */
    compact?: boolean;
    /** Called after a tap on In or Out with where the member ended up. */
    onanswer?: (status: "in" | "waitlist" | "out") => void;
    /** A link row along the bottom of the card (Home: where you stand, and the way to the teams). */
    footer?: Snippet;
    /** The session you're being asked about (Home's next one, a training's page): until you're in, In pulses once,
     * and again if you say out. */
    beckon?: boolean;
    /** Who's going and the count; off where the page lists them itself (a training's Who's in). */
    roster?: boolean;
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

  // Who's going: the first five faces, in sign-up order, and first names (you first, when you're in)
  const nameOf = (pid: number) => goesByOf(PLAYERS.find((p) => p.id === pid));
  const faces = $derived(entries.going.slice(0, 5));
  const others = $derived(entries.going.filter((x) => x !== id));
  const names = $derived(
    others
      .slice(0, 3)
      .map((x) => nameOf(x).split(" ")[0])
      .filter(Boolean),
  );
  const rest = $derived(others.length - names.length);
  // "You, Aman, Chris" (then "and 4 more", a link to the full list), and "7 / 21 in · 14 spaces · 2 waiting": built here, so a formatter can't eat a space
  const crowd = $derived([inIt ? "You" : "", ...names].filter(Boolean).join(", "));
  const spaces = $derived(event.capacity ? Math.max(0, event.capacity - entries.going.length) : null);
  const tally = $derived(
    [
      `${event.capacity ? ` / ${event.capacity}` : ""} in`,
      spaces === null ? "" : `${spaces} ${spaces === 1 ? "space" : "spaces"}`,
      entries.waitlist.length ? `${entries.waitlist.length} waiting` : "",
    ]
      .filter(Boolean)
      .join(" · "),
  );

  // How soon, in days on London's calendar: Today, Tomorrow, In 3 days, In 2 weeks
  const soon = $derived.by(() => {
    if (event.dateTbc || event.cancelled) return "";
    const day = (iso: string) => Date.parse(`${iso}T12:00:00Z`) / 86_400_000;
    const n = Math.round(day(londonToday(new Date(event.startsAt))) - day(londonToday()));
    if (n < 0) return "";
    const when = n === 0 ? "Today" : n === 1 ? "Tomorrow" : n < 14 ? `In ${n} days` : `In ${Math.floor(n / 7)} weeks`;
    return event.signup ? `${when} · ${full ? "full" : "sign-up open"}` : when;
  });

  // Not in yet, whether unanswered or out: In pulses once to ask, and again if you say out
  const beckoning = $derived(beckon && canSignUp && event.signup && !inIt && !waiting && !locked);

  // The card answers at once; the server's word (in, or the waitlist) arrives with the refresh.
  function setIn(going: boolean) {
    if (locked) return;
    // Tapping the answer you've already given changes nothing: no call to the server, no new quip on Home
    if (going ? inIt || waiting : out) return;
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
  <div class="top">
    <div class="date">
      {#if event.season}
        <!-- Just a season so far: the season over its year -->
        <span class="eyebrow">{event.season.name}</span>
        <span class="display day">'{String(event.season.year).slice(2)}</span>
        <span class="eyebrow">&nbsp;</span>
      {:else if event.dateTbc}
        <!-- Not confirmed: the date it has only decides where it sorts, so it isn't shown -->
        <span class="eyebrow">Date</span>
        <span class="display day">TBC</span>
        <span class="eyebrow">&nbsp;</span>
      {:else}
        <span class="eyebrow">{badge.weekday}</span>
        <span class="display day">{badge.day}</span>
        <span class="eyebrow">{badge.month}</span>
      {/if}
    </div>
    <!-- What matters first: which session (icon and name) and when. Where is a quiet second line. -->
    <div class="what">
      <div class="head">
        <span class="chip" title={KIND[event.kind]}><Icon name={event.icon} size={18} /></span>
        <h3>
          {#if compact && event.href}<a href={event.href}>{event.title}</a>{:else}{event.title}{/if}
        </h3>
      </div>
      <p class="when">
        <span class="time num">
          {event.timeText
            ? event.timeText
            : event.season
              ? "Day and time to be confirmed"
              : event.dateTbc
                ? "Date and time to be confirmed"
                : `${formatTime(event.startsAt)}–${formatTime(event.endsAt)}`}
        </span>
        {#if event.venue}<span class="venue"><Icon name="pin" size={13} />{event.venue}</span>{/if}
        {#if soon}<span class="soon" class:open={event.signup && !full}>{soon}</span>{/if}
      </p>
    </div>
    <!-- How soon, and where you stand: a fixed slot, so answering swaps the badge in place -->
    <div class="side">
      <!-- At a glance, what a member checks first: have I answered, and how many are coming. The badge's slot is
           always filled, so it never appears from nowhere. -->
      {#if event.cancelled}
        <span class="badge">Cancelled</span>
      {:else if event.signup}
        {#if inIt}<span class="badge green num">You're in · number {entries.going.indexOf(id) + 1}</span>
        {:else if waiting}<span class="badge amber num">Waitlist · number {entries.waitlist.indexOf(id) + 1}</span>
        {:else if out}<span class="badge red">You're out</span>
        {:else}<span class="badge">Not answered yet</span>{/if}
        {#if roster}<span class="tally num"><strong>{entries.going.length}</strong>{tally}</span>{/if}
      {/if}
    </div>
  </div>

  {#if event.signup}
    <!-- Two rows at every width: who's going, then your answer -->
    <div class="going">
      {#if roster}
        <div class="crowd">
          <span class="faces" aria-hidden="true">
            {#each faces as pid (pid)}<span class:you={pid === id}>{initials(nameOf(pid))}</span>{/each}
            {#if entries.going.length > faces.length}<span class="more num">+{entries.going.length - faces.length}</span
              >{/if}
          </span>
          <span class="who">
            {#if !entries.going.length}
              Nobody yet. First in, first on the list.
            {:else}
              {crowd}{#if rest > 0}&nbsp;{#if event.href}<a href={event.href}>and {rest} more</a>{:else}and {rest} more{/if}{/if}
            {/if}
          </span>
        </div>
      {/if}
      <div class="reply">
        {#if canSignUp}
          <div class="answer" role="group" aria-label="Are you in?">
            <button
              class="yes"
              class:beckon={beckoning && !out}
              class:beckon-again={beckoning && out}
              aria-pressed={inIt || waiting}
              disabled={locked}
              onclick={() => setIn(true)}
            >
              {#if inIt}<Icon name="check" size={16} />{/if}
              {waiting ? "Waitlist" : full && !inIt ? "Join waitlist" : "In"}
            </button>
            <button class="no" aria-pressed={out} disabled={locked} onclick={() => setIn(false)}>
              {#if out}<Icon name="x" size={16} />{/if}Out
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
  {#if footer}<div class="foot">{@render footer()}</div>{/if}
</article>

<style>
  /* The card is a container, so it lays itself out by its own width: a phone, a calendar row, a wide desktop */
  .event {
    container-type: inline-size;
    display: grid;
    /* The column is the card's width, never its content's: nothing inside can push past the edge */
    grid-template-columns: minmax(0, 1fr);
    gap: var(--s-5);
    padding: var(--s-5) var(--s-6);
  }
  .event.cancelled {
    opacity: 0.55;
  }
  .event.cancelled h3 {
    text-decoration: line-through;
  }
  .event.feature {
    border-color: var(--border-strong);
    background: var(--panel-bg);
  }
  .feature h3 {
    font-size: var(--text-lg);
  }

  /* ─── Header: date, what and when, how soon and your status ─── */
  .top {
    display: flex;
    align-items: flex-start;
    gap: var(--s-4);
  }
  .date {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 0.1rem;
    min-width: 3.25rem;
    padding-right: var(--s-4);
    border-right: 1px solid var(--border);
    text-align: center;
  }
  .day {
    font-size: 1.9rem;
    color: var(--fg);
  }
  /* Calendar rows: the divider beside the date takes the type's colour, so a month reads at a glance */
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
  .what {
    flex: 1;
    display: grid;
    gap: var(--s-2);
    min-width: 0;
  }
  .head {
    display: flex;
    align-items: center;
    gap: var(--s-3);
  }
  /* The type's icon in its colour */
  .chip {
    display: grid;
    place-items: center;
    flex: none;
    width: 2rem;
    height: 2rem;
    border-radius: var(--r-sm);
    background: color-mix(in srgb, var(--tone) 16%, transparent);
    color: var(--tone);
  }
  h3 {
    min-width: 0;
    font-size: var(--text-md);
    font-weight: 600;
    line-height: 1.2;
    color: var(--fg);
  }
  h3 a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .when {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.15rem var(--s-3);
  }
  .time {
    font-size: var(--text-md);
    font-weight: 500;
    color: var(--fg);
  }
  .venue {
    display: inline-flex;
    align-items: center;
    gap: var(--s-1);
    font-size: var(--text-xs);
    color: var(--fg-subtle);
  }
  .side {
    display: grid;
    justify-items: end;
    gap: var(--s-2);
    flex-shrink: 0;
    text-align: right;
  }
  /* Your answer: the first thing on the card to read, so a size up from an ordinary badge */
  .side .badge {
    height: 1.875rem;
    padding: 0 var(--s-3);
    font-size: var(--text-sm);
  }
  .soon {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    color: var(--fg-muted);
    font-size: var(--text-xs);
    font-weight: 600;
    white-space: nowrap;
  }
  /* Sign-up open: a green light */
  .soon.open::before {
    content: "";
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    background: var(--green);
  }
  .reply {
    display: flex;
  }

  /* ─── Who's going, and your answer at the end of the row ─── */
  /* Two rows, at every width: who's going (faces, names, the count), then your answer. No box of its own: the
     card is the box. */
  .going {
    display: grid;
    gap: var(--s-4);
  }
  .crowd {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2) var(--s-3);
  }
  .faces {
    display: flex;
    flex-shrink: 0;
  }
  .faces > span {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    margin-left: -0.3rem;
    border-radius: 50%;
    background: var(--surface-3);
    box-shadow: 0 0 0 2px var(--surface-1);
    color: var(--fg-muted);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .faces > span:first-child {
    margin-left: 0;
  }
  .faces > .you {
    background: color-mix(in srgb, var(--green) 30%, var(--surface-1));
    color: var(--fg);
  }
  .faces > .more {
    background: var(--surface-2);
    color: var(--fg-subtle);
  }
  .faces:empty {
    display: none;
  }
  .who {
    flex: 1 1 10rem;
    min-width: 0;
    overflow: hidden;
    color: var(--fg-muted);
    font-size: var(--text-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .who a {
    color: var(--fg);
    font-weight: 500;
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, var(--fg) 35%, transparent);
    text-underline-offset: 3px;
    transition: text-decoration-color var(--t-fast) var(--ease-in-out);
  }
  .who a:hover {
    text-decoration-color: currentColor;
  }
  .tally {
    color: var(--fg-muted);
    font-size: var(--text-sm);
    white-space: nowrap;
  }
  .tally strong {
    color: var(--fg);
    font-family: var(--font-display);
    font-size: 1.35rem;
    font-weight: 400;
    line-height: 1;
    margin-right: 0.1em;
  }
  /* Two compact tiles, the same before and after you answer: a light fill until pressed, then In lights up green
     with a tick, Out goes red with a cross. Fixed widths, so the label changing never moves them. */
  /* The second row: two compact tiles on the left, under the faces */
  .answer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-2);
    width: min(100%, 18rem);
  }
  .answer > button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-1);
    min-width: 6.5rem;
    min-height: 2.5rem;
    padding: 0 var(--s-3);
    border: 0;
    border-radius: var(--r-md);
    background: color-mix(in srgb, var(--fg) 10%, transparent);
    color: var(--fg);
    font-size: var(--text-sm);
    font-weight: 600;
    white-space: nowrap;
    transition: background-color var(--t-fast) var(--ease-in-out);
  }
  .answer > button:hover:not(:disabled):not([aria-pressed="true"]) {
    background: color-mix(in srgb, var(--fg) 16%, transparent);
  }
  .answer > button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .answer > .yes[aria-pressed="true"] {
    background: color-mix(in srgb, var(--green) 18%, transparent);
    color: var(--green-ink);
  }
  /* Out, chosen: the mirror of In, in the club's red, so it can't be mistaken for "not answered yet" */
  .answer > .no[aria-pressed="true"] {
    background: color-mix(in srgb, var(--red) 24%, transparent);
    color: var(--red-ink);
  }
  /* The session you're asked about, while you're not in: In pulses once, a soft ring. A shadow, so nothing moves. */
  .answer > .yes.beckon,
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
  .foot {
    margin: 0 calc(-1 * var(--s-6)) calc(-1 * var(--s-5));
    border-top: 1px solid var(--border);
  }

  /* ─── Narrow (a phone, a calendar row on a phone): your answer and the count drop to a row of their own under the
     title, so the title keeps the width; the names drop under the faces, the buttons fill the row ─── */
  @container (max-width: 34rem) {
    .top {
      flex-wrap: wrap;
      row-gap: var(--s-4);
    }
    .side {
      display: flex;
      flex-basis: 100%;
      align-items: center;
      justify-content: space-between;
      text-align: left;
    }
    .side:not(:has(*)) {
      display: none;
    }
    .soon {
      display: none;
    }
    .who {
      flex-basis: calc(100% - 11rem);
    }
    .answer {
      width: 100%;
    }
    .answer > button {
      min-width: 0;
    }
  }
  /* The card's own padding can't follow its container (a container query only reaches what's inside), so a phone
     sets it */
  @media (max-width: 600px) {
    .event {
      padding: var(--s-4) var(--s-4) var(--s-5);
    }
    .foot {
      margin: 0 calc(-1 * var(--s-4)) calc(-1 * var(--s-5));
    }
  }
</style>
