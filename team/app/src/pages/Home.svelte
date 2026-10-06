<script lang="ts">
  import { can } from "../access/actions";
  import { ME, MY_LEDGER, PLAYERS } from "../demo/data";
  import { granted } from "../demo/session.svelte";
  import { db } from "../demo/store.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import EventCard from "../lib/EventCard.svelte";
  import { formatDayDate, pounds } from "../lib/dates";

  const perms = $derived(granted());
  const next = $derived(db.events.find((e) => e.kind === "friday")!);
  const answered = $derived(next.going.includes(ME.id) || next.waitlist.includes(ME.id));
  const myTeam = $derived(db.teams?.find((t) => t.players.includes(ME.id)));
  const owed = MY_LEDGER.reduce((sum, l) => sum + l.pence, 0);
  const first = ME.name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
</script>

<div class="page">
  <header class="hello">
    <p class="kicker">Battersea Cougars</p>
    <h1 class="display">{greeting}, {first}</h1>
  </header>

  <section>
    <p class="eyebrow lead">{answered ? "This Friday" : "Are you in this Friday?"}</p>
    <EventCard event={next} canSignUp={can(perms, "signup:Event")} feature={!answered} />
    {#if !answered}<p class="hint nag">Teams are made from sign-ups, so say in or out before Friday.</p>{/if}
  </section>

  <div class="list">
    <a class="row" href="/calendar/teams">
      <Icon name="teams" />
      <span class="grow">
        <span class="title">{myTeam ? `You're on ${myTeam.name}` : "Your team"}</span>
        <span class="sub">
          {#if myTeam}
            With {myTeam.players
              .filter((id) => id !== ME.id)
              .slice(0, 3)
              .map((id) => PLAYERS.find((p) => p.id === id)?.name.split(" ")[0])
              .join(", ")} and {myTeam.players.length - 4} more
          {:else}
            Out after sign-up closes on {formatDayDate(next.startsAt)}
          {/if}
        </span>
      </span>
      {#if myTeam}<span class="display team">{myTeam.name}</span>{/if}
      <Icon name="chevronRight" size={18} />
    </a>
    <a class="row" href="/more/tab">
      <Icon name="pound" />
      <span class="grow">
        <span class="title">Your tab</span>
        <span class="sub">{owed > 0 ? "Pay by bank transfer, reference COU-0001" : "All square"}</span>
      </span>
      <span class="display owe num" class:zero={owed <= 0}>{pounds(owed)}</span>
      <Icon name="chevronRight" size={18} />
    </a>
  </div>

  <section class="notice">
    <p class="eyebrow">Notice</p>
    <h2>Kumite draft</h2>
    <p class="hint">Captains draft their teams the week before. Rules to follow.</p>
  </section>
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
  .nag {
    margin-left: var(--s-1);
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
  .notice {
    gap: var(--s-2);
    padding: var(--s-4) 0 0;
    border-top: 1px solid var(--border);
  }
  .notice h2 {
    font-size: var(--text-md);
    font-weight: 600;
  }
</style>
