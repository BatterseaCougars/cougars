<script lang="ts">
  // Friday: who's in, and the teams. Members come here to see they're registered and which team they're on, so
  // that's what leads. Ratings drive the teams but only admins see them (read:Rating), as in the old app.
  import { can } from "../access/actions";
  import { PLAYERS, TEAM_NAMES, TEAM_ORDER, type Player } from "../demo/data";
  import { granted, me } from "../demo/session.svelte";
  import { db } from "../demo/store.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import EventCard from "../lib/EventCard.svelte";
  import Person from "../lib/Person.svelte";
  import { formatDayDate, formatTime } from "../lib/dates";
  import { snakeTeams, type Team } from "../lib/snake";

  const perms = $derived(granted());
  const who = $derived(me());
  const ratings = $derived(can(perms, "read:Rating"));
  const next = $derived(db.events.find((e) => e.kind === "friday")!);
  const byId = (id: number): Player => PLAYERS.find((p) => p.id === id)!;

  let proposal: Team[] | null = $state(null);
  const teams = $derived(proposal ?? db.teams);
  // Your team first, then the old app's order: Cougars, Black, White, then the rest.
  const ordered = $derived(
    teams
      ? [...teams].sort(
          (a, b) =>
            Number(b.players.includes(who.id)) - Number(a.players.includes(who.id)) ||
            (TEAM_ORDER[a.name] ?? 9) - (TEAM_ORDER[b.name] ?? 9),
        )
      : null,
  );
  const onTeam = $derived(new Set(teams?.flatMap((t) => t.players) ?? []));
  // Signed up after the teams were made: still in, waiting to be slotted onto a team.
  const unplaced = $derived(teams ? next.going.filter((id) => !onTeam.has(id)) : []);
  const spaces = $derived(next.capacity ? Math.max(0, next.capacity - next.going.length) : null);

  function generate() {
    proposal = snakeTeams(next.going.map(byId), TEAM_NAMES);
  }
  function move(id: number, from: Team, to: Team) {
    from.players = from.players.filter((p) => p !== id);
    to.players = [...to.players, id];
  }
  function publish() {
    db.teams = proposal;
    proposal = null;
  }
  const rating = (ids: number[]) => ids.reduce((s, id) => s + byId(id).rating, 0);
</script>

{#snippet player(id: number, n?: number)}
  {@const p = byId(id)}
  <div class="row" class:you={id === who.id}>
    {#if n !== undefined}<span class="n num">{n}</span>{/if}
    <Person player={p} showRating={ratings} />
    {#if id === who.id}<span class="badge green">You</span>{/if}
    {#if p.cougar}<span class="badge red">Cougar</span>{/if}
  </div>
{/snippet}

<div class="page">
  <div class="page-head">
    <div>
      <h1>Friday</h1>
      <p class="hint">{formatDayDate(next.startsAt)} · {formatTime(next.startsAt)} · {next.venue}</p>
    </div>
    {#if can(perms, "generate:Teams")}
      <button class="btn sm" class:primary={!teams} class:outline={!!teams} onclick={generate}>
        {teams ? "Regenerate" : "Make teams"}
      </button>
    {/if}
  </div>

  <EventCard event={next} canSignUp={can(perms, "signup:Event")} />

  <div class="stats num">
    <div class="stat"><span class="eyebrow">In</span><span class="value">{next.going.length}</span></div>
    <div class="stat"><span class="eyebrow">Waiting</span><span class="value">{next.waitlist.length}</span></div>
    <div class="stat">
      <span class="eyebrow">Spaces</span><span class="value">{spaces ?? "–"}</span>
    </div>
  </div>

  {#if proposal}
    <p class="note rise">
      Draft teams, not published yet. Move a player with the arrow; drag and drop comes with the solver in T3.
    </p>
  {/if}

  {#if ordered}
    {#each ordered as team (team.name)}
      {@const mine = team.players.includes(who.id)}
      <section class="team rise" class:mine>
        <header>
          <h2 class="display">{team.name}</h2>
          {#if mine}<span class="badge green">Your team</span>{/if}
          <span class="hint num count">
            {team.players.length} players{ratings ? ` · rating ${rating(team.players)}` : ""}
          </span>
        </header>
        <div class="list">
          {#each team.players as id (id)}
            {#if proposal}
              <div class="row">
                <Person player={byId(id)} showRating={ratings} />
                {#if byId(id).cougar}<span class="badge red">Cougar</span>{/if}
                <button
                  class="btn ghost icon"
                  aria-label="Move to the next team"
                  onclick={() => move(id, team, ordered[(ordered.indexOf(team) + 1) % ordered.length])}
                >
                  <Icon name="chevronRight" size={18} />
                </button>
              </div>
            {:else}
              {@render player(id)}
            {/if}
          {/each}
        </div>
      </section>
    {/each}
    {#if proposal && can(perms, "publish:Teams")}
      <button class="btn primary block" onclick={publish}>Publish teams</button>
    {/if}

    {#if unplaced.length}
      <h2 class="section-title">In, not on a team yet</h2>
      <div class="list">
        {#each unplaced as id (id)}{@render player(id)}{/each}
      </div>
    {/if}
  {:else}
    <h2 class="section-title">Who's in · first come, first served</h2>
    {#if next.going.length}
      <div class="list">
        {#each next.going as id, i (id)}{@render player(id, i + 1)}{/each}
      </div>
    {:else}
      <p class="hint">Nobody yet. If you ain't first, you last.</p>
    {/if}
    <p class="hint">Teams come out after sign-up closes.</p>
  {/if}

  {#if next.waitlist.length}
    <h2 class="section-title">Waitlist</h2>
    <div class="list">
      {#each next.waitlist as id, i (id)}{@render player(id, i + 1)}{/each}
    </div>
  {/if}
</div>

<style>
  .team {
    display: grid;
    gap: var(--s-3);
  }
  header {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: 0 var(--s-1);
  }
  h2.display {
    font-size: 1.6rem;
  }
  .count {
    margin-left: auto;
  }
  .mine .list {
    border-color: var(--green-border);
  }
  .row.you {
    background: color-mix(in srgb, var(--green) 7%, transparent);
  }
  .n {
    width: 1.25rem;
    color: var(--fg-subtle);
    font-size: var(--text-sm);
    text-align: right;
  }
</style>
