<script lang="ts">
  import { can } from "../access/actions";
  import { PLAYERS, ledgerFor, referenceFor } from "../demo/data";
  import { granted, me } from "../demo/session.svelte";
  import { db } from "../demo/store.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import EventCard from "../lib/EventCard.svelte";
  import { pounds } from "../lib/dates";
  import { currentTournament, nextSession, sessionBookable, tournamentBookable } from "../demo/schedule.svelte";
  import { ASK, IN, OUT, WAITLIST, pick, type Quip } from "../lib/quips";
  import { prefersReducedMotion } from "../app/motion";

  const perms = $derived(granted());
  const who = $derived(me());
  // The soonest session of any training leads Home; the other trainings' next sessions follow, then the next
  // tournament of each type.
  const nexts = $derived(
    db.series
      .filter((s) => s.active)
      .flatMap((series) => {
        const session = nextSession(series);
        return session ? [{ series, session, at: sessionBookable(session).startsAt }] : [];
      })
      .sort((a, b) => a.at.localeCompare(b.at)),
  );
  const series = $derived(nexts[0]?.series);
  const session = $derived(nexts[0]?.session);
  const others = $derived(nexts.slice(1));
  const booking = $derived(session && sessionBookable(session));
  const next = $derived(session ?? { id: 0, going: [] as number[], waitlist: [] as number[] });
  const day = $derived(series?.shortName ?? "week");
  const tournaments = $derived(
    db.tournamentTypes
      .filter((t) => t.active)
      .map((type) => ({ type, t: currentTournament(type.id) }))
      .filter((x) => x.t && x.t.status !== "finished"),
  );
  const later = $derived(
    [...others.map((o) => sessionBookable(o.session)), ...tournaments.map(({ t }) => tournamentBookable(t!))].sort(
      (x, y) => x.startsAt.localeCompare(y.startsAt),
    ),
  );
  const isIn = $derived(next.going.includes(who.id));
  const waiting = $derived(next.waitlist.includes(who.id));
  const answered = $derived(isIn || waiting);
  const position = $derived(next.going.indexOf(who.id) + 1);
  const myTeam = $derived(db.teams[next.id]?.find((t) => t.players.includes(who.id)));
  const owed = $derived(ledgerFor(who.id).reduce((sum, l) => sum + l.pence, 0));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  // The locker room has a word for you until you answer, and another once you have.
  let said: Quip | null = $state(null);
  const quip = $derived(said ?? (answered ? null : ASK));
  function onanswer(status: "in" | "waitlist" | "out") {
    said = pick(status === "in" ? IN : status === "waitlist" ? WAITLIST : OUT);
  }
  // The message types itself out, a letter at a time, each time it changes.
  let typed = $state("");
  $effect(() => {
    const text = quip?.text ?? "";
    if (prefersReducedMotion) {
      typed = text;
      return;
    }
    typed = "";
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      typed = text.slice(0, i);
      if (i >= text.length) clearInterval(timer);
    }, 34);
    return () => clearInterval(timer);
  });
  const teammates = (ids: number[]) =>
    ids
      .filter((id) => id !== who.id)
      .slice(0, 3)
      .map((id) => PLAYERS.find((p) => p.id === id)?.name.split(" ")[0])
      .join(", ");
</script>

<div class="page">
  <header class="hello">
    <p class="kicker">Battersea Cougars</p>
    <h1 class="display poster">{greeting}, {who.name.split(" ")[0]}</h1>
    {#if owed > 0}
      <!-- You owe: said up front, every visit, until it's paid -->
      <a class="owing" href="/me/tab">
        <span class="owing-text">
          <span class="owing-head">You owe the club <strong class="display num">{pounds(owed)}</strong></span>
          <span class="owing-sub">Bank transfer, reference <strong>{referenceFor(who.id)}</strong></span>
        </span>
        <span class="owing-cta">Settle up <Icon name="chevronRight" size={16} /></span>
      </a>
    {/if}
  </header>

  {#if series && session && booking}
    <section>
      <h2 class="section-title">{answered ? `This ${day}` : `Are you in this ${day}?`}</h2>
      <!-- The locker room's word, swapped in place when you answer. Its room is fixed, so nothing moves. -->
      <p class="message" aria-live="polite">
        <span class="sr-only">{quip?.text ?? ""}</span>
        <span aria-hidden="true"
          >{typed}{#if quip}<span class="caret" class:done={typed === quip.text}></span>{/if}</span
        >
      </p>
      <EventCard event={booking} canSignUp={can(perms, "signup:Event")} feature {onanswer}>
        {#snippet footer()}
          <!-- Where you stand, in one line that never changes height, and the way to the teams -->
          <a class="status" href="/training/{series.slug}">
            <Icon name="teams" size={18} />
            <span class="grow">
              {#if myTeam}
                You're on <strong>{myTeam.name}</strong> with {teammates(myTeam.players)}
              {:else if isIn}
                You're <strong>number {position}</strong> · teams out after sign-up closes
              {:else if waiting}
                <strong>Waitlist</strong> · you'll move up if someone drops out
              {:else}
                See who's in · say in or out before {day}
              {/if}
            </span>
            <Icon name="chevronRight" size={18} />
          </a>
        {/snippet}
      </EventCard>
    </section>
  {/if}

  <!-- Everything after the lead session, in date order: other trainings, then tournaments as they come -->
  {#if later.length}
    <section>
      <h2 class="section-title">Later</h2>
      {#each later as ev (ev.key)}
        <EventCard event={ev} canSignUp={can(perms, "signup:Event")} compact />
      {/each}
    </section>
  {/if}
</div>

<style>
  .hello {
    display: grid;
    gap: var(--s-3);
    padding-top: var(--s-2);
  }
  .hello h1 {
    font-size: clamp(2.6rem, 10vw, 3.4rem);
    letter-spacing: 0.005em;
  }
  section {
    display: grid;
    gap: var(--s-3);
  }
  /* Bigger breaks between blocks than within them */
  .page {
    gap: var(--s-8);
  }
  .owing {
    display: flex;
    align-items: center;
    gap: var(--s-4);
    margin-top: var(--s-2);
    padding: var(--s-3) var(--s-4);
    border: 1px solid var(--red-border);
    border-radius: var(--r-md);
    background:
      linear-gradient(100deg, var(--red-wash-strong), var(--red-wash) 60%, transparent),
      color-mix(in srgb, var(--surface-1) 50%, transparent);
    color: var(--fg-muted);
    transition: border-color var(--t) var(--ease-in-out);
  }
  .owing:hover {
    border-color: var(--red);
  }
  .owing-text {
    display: grid;
    flex: 1;
    min-width: 0;
    gap: 0.1rem;
  }
  .owing-head {
    color: var(--fg);
    font-size: var(--text-md);
    font-weight: 600;
  }
  .owing-head strong {
    margin-left: 0.15em;
    font-size: 1.5rem;
    font-weight: 400;
    color: var(--red-hot);
    vertical-align: -0.1em;
  }
  .owing-sub {
    font-size: var(--text-xs);
  }
  .owing-sub strong {
    color: var(--fg);
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  .owing-cta {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    color: var(--red-hot);
    font-size: var(--text-sm);
    font-weight: 600;
    white-space: nowrap;
  }
  /* The message: big enough to read as the club talking to you, right under its heading. Two lines' room on a
     phone, one on desktop, so a new one never moves anything. */
  .message {
    display: flex;
    align-items: flex-start;
    min-height: 2lh;
    margin: 0 var(--s-1);
    color: var(--fg);
    font-size: var(--text-lg);
    font-weight: 500;
    line-height: 1.25;
    letter-spacing: -0.01em;
    text-wrap: balance;
  }
  .caret {
    display: inline-block;
    width: 0.12em;
    height: 1em;
    margin-left: 0.08em;
    vertical-align: -0.12em;
    background: var(--red-hot);
    animation: blink 1s steps(1) infinite;
  }
  /* Blinking while it types, then a few blinks and gone */
  .caret.done {
    animation: caret-out 2.4s steps(1) forwards;
  }
  @keyframes caret-out {
    0%,
    20% {
      opacity: 1;
    }
    21%,
    40% {
      opacity: 0;
    }
    41%,
    60% {
      opacity: 1;
    }
    61%,
    100% {
      opacity: 0;
    }
  }
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
  @media (min-width: 901px) {
    .message {
      min-height: 1lh;
      white-space: nowrap;
    }
  }
  .status {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    min-height: 3rem;
    padding: 0 var(--s-4);
    color: var(--fg-muted);
    font-size: var(--text-sm);
  }
  .status .grow {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .status strong {
    color: var(--fg);
    font-weight: 600;
  }
  .status:hover {
    color: var(--fg);
  }
</style>
