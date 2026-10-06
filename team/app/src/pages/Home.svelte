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
    <!-- The locker room's word: one line under the greeting, swapped in place when you answer -->
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
    <p class="message">
      {#if quip}{#key quip.text}<span class="rise">{quip.text}</span>{/key}{/if}
    </p>
  </header>

  {#if series && session && booking}
    <section>
      <p class="eyebrow lead">{answered ? `This ${day}` : `Are you in this ${day}?`}</p>
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

  {#if others.length}
    <section>
      <p class="eyebrow lead">Also coming up</p>
      {#each others as o (o.series.id)}
        <EventCard event={sessionBookable(o.session)} canSignUp={can(perms, "signup:Event")} compact />
      {/each}
    </section>
  {/if}

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
  .lead {
    margin-left: var(--s-1);
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
  /* One line, always there (empty or not), so a new message never moves the cards */
  .message {
    min-height: 1lh;
    margin-top: calc(-1 * var(--s-1));
    overflow: hidden;
    color: var(--fg-muted);
    font-size: var(--text-md);
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
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
