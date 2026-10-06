<script lang="ts">
  // A training series' next session: who's in, and the teams. Members come here to see they're registered and
  // which team they're on, so that's what leads. Ratings drive the teams but only admins see them (read:Rating),
  // as in the old app.
  import PageHeader from "../lib/PageHeader.svelte";
  import { can } from "../access/actions";
  import { PLAYERS, TEAM_NAMES, TEAM_ORDER, type Player } from "../demo/data";
  import { granted, me } from "../demo/session.svelte";
  import { db } from "../demo/store.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import EventCard from "../lib/EventCard.svelte";
  import Person from "../lib/Person.svelte";
  import PlayerCard from "../lib/PlayerCard.svelte";
  import RegisterDrawer from "../lib/RegisterDrawer.svelte";
  import { formatDayDate } from "../lib/dates";
  import { describeRule } from "../lib/recurrence";
  import { snakeTeams, type Team } from "../lib/snake";
  import { nextSession, resolve, seriesById, sessionBookable } from "../demo/schedule.svelte";

  let { seriesId }: { seriesId: number } = $props();

  const perms = $derived(granted());
  const series = $derived(seriesById(seriesId)!);
  const session = $derived(nextSession(series));
  const info = $derived(session && resolve(session, series));
  const who = $derived(me());
  const ratings = $derived(can(perms, "read:Rating"));
  const next = $derived(session ?? { id: 0, going: [] as number[], waitlist: [] as number[] });
  const byId = (id: number): Player => PLAYERS.find((p) => p.id === id)!;

  let proposal: Team[] | null = $state(null);
  let registering = $state(false);

  // Trial: players as trading cards, or the plain list. Remembered per device.
  const VIEW_KEY = "team.training.view";
  let view = $state<"cards" | "list">(readView());
  function readView(): "cards" | "list" {
    try {
      return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "cards";
    } catch {
      return "cards";
    }
  }
  function setView(v: "cards" | "list") {
    view = v;
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // Private mode: the choice just isn't remembered.
    }
  }
  const teams = $derived(proposal ?? db.teams[next.id] ?? null);
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
  const spaces = $derived(info?.capacity ? Math.max(0, info.capacity - next.going.length) : null);

  function generate() {
    proposal = snakeTeams(next.going.map(byId), TEAM_NAMES);
  }
  function move(id: number, from: Team, to: Team) {
    from.players = from.players.filter((p) => p !== id);
    to.players = [...to.players, id];
  }
  function publish() {
    if (!proposal) return;
    db.teams[next.id] = proposal;
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

{#snippet players(ids: number[], numbered = false)}
  {#if view === "cards"}
    <div class="cards">
      {#each ids as id, i (id)}
        <PlayerCard player={byId(id)} n={numbered ? i + 1 : undefined} you={id === who.id} showRating={ratings} />
      {/each}
    </div>
  {:else}
    <div class="list">
      {#each ids as id, i (id)}{@render player(id, numbered ? i + 1 : undefined)}{/each}
    </div>
  {/if}
{/snippet}

<div class="page">
  <PageHeader
    title={series.name}
    subtitle="{describeRule(series)} · {series.startTime}–{series.endTime} · {series.venue}"
  >
    {#snippet actions()}
      {#if session && can(perms, "record:Attendance")}
        <button class="btn sm outline" onclick={() => (registering = true)}>
          <Icon name="check" size={16} /> Register
        </button>
      {/if}
      {#if session && can(perms, "generate:Teams")}
        <button class="btn sm" class:primary={!teams} class:outline={!!teams} onclick={generate}>
          {teams ? "Regenerate" : "Make teams"}
        </button>
      {/if}
    {/snippet}
  </PageHeader>

  {#if !session}
    <p class="note">No sessions coming up. An admin can set the dates under Settings → Training.</p>
  {:else}
    {#if info && (info.venue !== series.venue || info.startTime !== series.startTime)}
      <p class="note">
        This week: {formatDayDate(sessionBookable(session).startsAt)}, {info.startTime} at {info.venue}.
      </p>
    {/if}

    <EventCard event={sessionBookable(session)} canSignUp={can(perms, "signup:Event")} />

    <div class="stats num">
      <div class="stat"><span class="eyebrow">In</span><span class="value">{next.going.length}</span></div>
      <div class="stat"><span class="eyebrow">Waiting</span><span class="value">{next.waitlist.length}</span></div>
      <div class="stat">
        <span class="eyebrow">Spaces</span><span class="value">{spaces ?? "–"}</span>
      </div>
    </div>

    <div class="view-row">
      <div class="seg" role="group" aria-label="Show players as">
        <button aria-pressed={view === "cards"} onclick={() => setView("cards")}>Cards</button>
        <button aria-pressed={view === "list"} onclick={() => setView("list")}>List</button>
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
          {#if !proposal}
            {@render players(team.players)}
          {:else}
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
          {/if}
        </section>
      {/each}
      {#if proposal && can(perms, "publish:Teams")}
        <button class="btn primary block" onclick={publish}>Publish teams</button>
      {/if}

      {#if unplaced.length}
        <h2 class="section-title">In, not on a team yet</h2>
        {@render players(unplaced)}
      {/if}
    {:else}
      <h2 class="section-title">Who's in · first come, first served</h2>
      {#if next.going.length}
        {@render players(next.going, true)}
      {:else}
        <p class="hint">Nobody yet. If you ain't first, you last.</p>
      {/if}
      <p class="hint">Teams come out after sign-up closes.</p>
    {/if}

    {#if next.waitlist.length}
      <h2 class="section-title">Waitlist</h2>
      {@render players(next.waitlist, true)}
    {/if}
  {/if}
</div>

{#if session && can(perms, "record:Attendance")}
  <RegisterDrawer {seriesId} bind:open={registering} />
{/if}

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
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6.4rem, 1fr));
    gap: var(--s-3);
  }
  @media (min-width: 901px) {
    .cards {
      grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
      gap: var(--s-4);
    }
  }
  /* The toggle floats over the cards on its own as you scroll, no band behind it */
  .view-row {
    display: flex;
    justify-content: flex-end;
    width: auto;
    background: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    pointer-events: none;
  }
  .view-row .seg {
    pointer-events: auto;
    background: var(--chrome-bg-solid);
    backdrop-filter: var(--blur);
    -webkit-backdrop-filter: var(--blur);
  }
  .view-row .seg button {
    min-height: 1.85rem;
    font-size: var(--text-xs);
  }
  .n {
    width: 1.25rem;
    color: var(--fg-subtle);
    font-size: var(--text-sm);
    text-align: right;
  }
</style>
