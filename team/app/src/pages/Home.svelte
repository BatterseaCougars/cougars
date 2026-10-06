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
    <h1 class="display poster">{greeting}, {who.name.split(" ")[0]}</h1>
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

  {#each tournaments as { type, t } (type.id)}
    {@const b = tournamentBookable(t!)}
    <section class="next-tournament">
      <p class="eyebrow lead">{t!.status === "live" ? `${type.shortName} today` : `Next ${type.shortName}`}</p>
      <EventCard event={b} canSignUp={can(perms, "signup:Event")} />
    </section>
  {/each}

  <div class="list">
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
  .lead {
    margin-left: var(--s-1);
  }
  .quote {
    display: grid;
    gap: var(--s-1);
    margin: 0 0 var(--s-1);
    padding: 0 var(--s-1) 0 var(--s-4);
    border-left: 3px solid var(--red);
  }
  /* The quote changes on every answer: it always takes the same room (two lines on a phone, one on desktop),
     sitting on the card, so a long one never pushes the card down */
  .quote {
    align-content: end;
    font-size: clamp(1.5rem, 6.5vw, 2rem);
    line-height: 1;
    min-height: 2lh;
  }
  .quote p {
    font-size: inherit;
    color: var(--fg);
    text-wrap: balance;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }
  @media (min-width: 901px) {
    .quote {
      min-height: 1lh;
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
  .owe {
    font-size: 1.35rem;
    color: var(--red-hot);
  }
  .owe.zero {
    color: var(--green);
  }
</style>
