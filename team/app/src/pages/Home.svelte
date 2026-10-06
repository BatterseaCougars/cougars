<script lang="ts">
  import { can } from "../access/actions";
  import { PLAYERS, ledgerFor, referenceFor } from "../demo/data";
  import { granted, me } from "../demo/session.svelte";
  import { db } from "../demo/store.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import EventCard from "../lib/EventCard.svelte";
  import { formatDayDate, pounds } from "../lib/dates";
  import { currentTournament, nextSession, sessionBookable, tournamentBookable } from "../demo/schedule.svelte";
  import { ASK, IN, OUT, WAITLIST, pick, type Quip } from "../lib/quips";

  const perms = $derived(granted());
  const who = $derived(me());
  // The main training (the first one set up) leads Home; the next tournament of each type follows.
  const series = $derived(db.series.find((s) => s.active));
  const session = $derived(series && nextSession(series));
  const booking = $derived(session && sessionBookable(session));
  const next = $derived(session ?? { id: 0, going: [] as number[], waitlist: [] as number[] });
  const day = $derived(series?.shortName ?? "week");
  const tournaments = $derived(
    db.tournamentTypes
      .filter((t) => t.active)
      .map((type) => ({ type, t: currentTournament(type.id) }))
      .filter((x) => x.t && x.t.status !== "finished"),
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
    <h1 class="display">{greeting}, {who.name.split(" ")[0]}</h1>
  </header>

  {#if series && session && booking}
    <section>
      <p class="eyebrow lead">{answered ? `This ${day}` : `Are you in this ${day}?`}</p>
      {#if quip}
        {#key quip.text}
          <blockquote class="quote rise">
            <p class="display">“{quip.text}”</p>
            {#if quip.by}<footer class="hint">{quip.by}</footer>{/if}
          </blockquote>
        {/key}
      {/if}
      <EventCard event={booking} canSignUp={can(perms, "signup:Event")} feature={!answered} {onanswer} />
      {#if !answered}<p class="hint nag">Teams are made from sign-ups, so say in or out before {day}.</p>{/if}
    </section>
  {/if}

  <div class="list">
    {#if series && booking}
      <a class="row" href="/training/{series.slug}">
        <span class="glyph"><Icon name="teams" /></span>
        <span class="grow">
          {#if myTeam}
            <span class="title">You're on {myTeam.name}</span>
            <span class="sub">With {teammates(myTeam.players)} and {myTeam.players.length - 4} more</span>
          {:else if isIn}
            <span class="title">You're in, number {position} of {next.going.length}</span>
            <span class="sub">Teams are out after sign-up closes on {formatDayDate(booking.startsAt)}</span>
          {:else if waiting}
            <span class="title">You're on the waitlist</span>
            <span class="sub">You'll move up if someone drops out</span>
          {:else}
            <span class="title">Who's in this {day}</span>
            <span class="sub">{next.going.length} signed up so far</span>
          {/if}
        </span>
        {#if myTeam}<span class="display team">{myTeam.name}</span>{/if}
        <Icon name="chevronRight" size={18} />
      </a>
    {/if}
    <a class="row" href="/me/tab">
      <span class="glyph"><Icon name="pound" /></span>
      <span class="grow">
        <span class="title">Your tab</span>
        <span class="sub">{owed > 0 ? `Pay by bank transfer, reference ${referenceFor(who.id)}` : "All square"}</span>
      </span>
      <span class="display owe num" class:zero={owed <= 0}>{pounds(owed)}</span>
      <Icon name="chevronRight" size={18} />
    </a>
  </div>

  {#each tournaments as { type, t } (type.id)}
    {@const b = tournamentBookable(t!)}
    <section class="next-tournament">
      <p class="eyebrow lead">{t!.status === "live" ? `${type.shortName} today` : `Next ${type.shortName}`}</p>
      <EventCard event={b} canSignUp={can(perms, "signup:Event")} />
    </section>
  {/each}
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
  .lead,
  .nag {
    margin-left: var(--s-1);
  }
  .quote {
    display: grid;
    gap: var(--s-1);
    margin: 0 0 var(--s-1);
    padding: 0 var(--s-1) 0 var(--s-4);
    border-left: 3px solid var(--red);
  }
  .quote p {
    font-size: clamp(1.5rem, 6.5vw, 2rem);
    color: var(--fg);
    text-wrap: balance;
  }
  .team {
    font-size: 1.25rem;
    color: var(--fg);
  }
  .owe {
    font-size: 1.35rem;
    color: var(--red-hot);
  }
  .owe.zero {
    color: var(--green);
  }
</style>
