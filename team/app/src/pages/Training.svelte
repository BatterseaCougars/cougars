<script lang="ts" module>
  import type { Team } from "../lib/snake";
  // Teams made but not published yet, by session: kept if an admin leaves the page and comes back
  const proposals = $state<Record<number, Team[] | undefined>>({});
</script>

<script lang="ts">
  // A training series' next session. Before the teams: who's in, in order, and your answer. Once there are teams,
  // they're the page: anyone who signed up after them first (an admin slots them in or remakes them), then the
  // teams, then sign-up. Ratings drive the teams but only admins see them (read:Rating), as in the old app.
  import PageHeader from "../lib/PageHeader.svelte";
  import { can } from "../access/actions";
  import { PLAYERS, TEAM_NAMES, TEAM_ORDER, type Player } from "../demo/data";
  import { granted, me } from "../demo/session.svelte";
  import { db } from "../demo/store.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import EventCard from "../lib/EventCard.svelte";
  import Person from "../lib/Person.svelte";
  import PlayerCard from "../lib/PlayerCard.svelte";
  import PlayerCardZoom from "../lib/PlayerCardZoom.svelte";
  import RegisterDrawer from "../lib/RegisterDrawer.svelte";
  import { publishTeams, setPlayer } from "../app/backend.svelte";
  import { formatDayDate } from "../lib/dates";
  import { describeRule } from "../lib/recurrence";
  import { slotIn, snakeTeams } from "../lib/snake";
  import EmptyState from "../lib/EmptyState.svelte";
  import { nextSession, resolve, seriesById, seriesPlace, sessionBookable } from "../demo/schedule.svelte";

  let { seriesId }: { seriesId: number } = $props();

  const perms = $derived(granted());
  // The last series found: while this page slides out, the next page's params (no seriesId) arrive here too
  const last: { series?: ReturnType<typeof seriesById> } = {};
  const series = $derived((last.series = seriesById(seriesId) ?? last.series)!);
  const session = $derived(nextSession(series));
  const info = $derived(session && resolve(session, series));
  const usual = $derived(seriesPlace(series));
  const who = $derived(me());
  const ratings = $derived(can(perms, "read:Rating"));
  const next = $derived(session ?? { id: 0, going: [] as number[], waitlist: [] as number[] });
  const byId = (id: number): Player => PLAYERS.find((p) => p.id === id)!;

  let registering = $state(false);
  // The card that's been picked up, and where it lies on the page
  let lifted = $state<{ id: number; el: HTMLElement; n?: number } | null>(null);

  // Take someone off the session (from their card): off the list and any team, and the waitlist moves up
  function removeFromSession(id: number) {
    const s = session;
    if (!s) return;
    void setPlayer(s.id, id, false);
    const wasIn = s.going.includes(id);
    s.going = s.going.filter((x) => x !== id);
    s.waitlist = s.waitlist.filter((x) => x !== id);
    s.walkIns = s.walkIns?.filter((x) => x !== id);
    s.noShows = s.noShows?.filter((x) => x !== id);
    if (wasIn && s.waitlist.length && (!info?.capacity || s.going.length < info.capacity)) {
      s.going = [...s.going, s.waitlist[0]];
      s.waitlist = s.waitlist.slice(1);
    }
    const out = db.teams[s.id];
    if (out) for (const t of out) t.players = t.players.filter((x) => x !== id);
    if (proposal) for (const t of proposal) t.players = t.players.filter((x) => x !== id);
    else if (out) void publishTeams(s.id, out);
  }

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
  const proposal = $derived(proposals[next.id] ?? null);
  const published = $derived(db.teams[next.id] ?? null);
  const teams = $derived(proposal ?? published);
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
    proposals[next.id] = snakeTeams(next.going.map(byId), TEAM_NAMES);
  }
  function move(id: number, from: Team, to: Team) {
    from.players = from.players.filter((p) => p !== id);
    to.players = [...to.players, id];
  }
  function publish() {
    if (!proposal) return;
    db.teams[next.id] = proposal;
    void publishTeams(next.id, proposal);
    proposals[next.id] = undefined;
  }
  // Signed up after the teams were made: onto the teams as they are (each to the weaker side), as draft teams to
  // check and publish
  function slot() {
    if (published) proposals[next.id] = slotIn(published, unplaced.map(byId), (id) => byId(id));
  }
  const firstNames = (ids: number[]) => {
    const names = ids.map((id) => (id === who.id ? "you" : byId(id).name.split(" ")[0]));
    const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
    return list.charAt(0).toUpperCase() + list.slice(1);
  };
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
        <PlayerCard
          player={byId(id)}
          n={numbered ? i + 1 : undefined}
          you={id === who.id}
          showRating={ratings}
          lifted={lifted?.id === id}
          onopen={(el) => (lifted = { id, el, n: numbered ? i + 1 : undefined })}
        />
      {/each}
    </div>
  {:else}
    <div class="list">
      {#each ids as id, i (id)}{@render player(id, numbered ? i + 1 : undefined)}{/each}
    </div>
  {/if}
{/snippet}

<div class="page wide reading">
  <PageHeader
    title={series.name}
    subtitle="{describeRule(series)} · {series.startTime}–{series.endTime}{usual ? ` · ${usual.name}` : ''}"
  >
    {#snippet actions()}
      {#if session && can(perms, "record:Attendance")}
        <button class="btn sm outline" onclick={() => (registering = true)}>
          <Icon name="userPlus" size={16} /> Add player
        </button>
      {/if}
      {#if session && can(perms, "generate:Teams") && next.going.length && !unplaced.length}
        <button class="btn sm" class:primary={!teams} class:outline={!!teams} onclick={generate}>
          {teams ? "Remake teams" : "Make teams"}
        </button>
      {/if}
    {/snippet}
  </PageHeader>

  {#snippet signUp()}
    <!-- This week's session and your answer, with the numbers -->
    <div class="stats num">
      <div class="stat"><span class="eyebrow">In</span><span class="value">{next.going.length}</span></div>
      <div class="stat"><span class="eyebrow">Waiting</span><span class="value">{next.waitlist.length}</span></div>
      <div class="stat">
        <span class="eyebrow">Spaces</span><span class="value">{spaces ?? "–"}</span>
      </div>
    </div>
    <EventCard event={sessionBookable(session!)} canSignUp={can(perms, "signup:Event")} beckon roster={false} />
  {/snippet}

  {#snippet waitlist()}
    {#if next.waitlist.length}
      <h2 class="section-title">Waitlist</h2>
      {@render players(next.waitlist, true)}
    {/if}
  {/snippet}

  {#if !session}
    <EmptyState icon="calendar" title="No sessions coming up">
      An admin sets the dates under Settings → Training.
    </EmptyState>
  {:else}
    {#if info && (info.place?.name !== usual?.name || info.startTime !== series.startTime)}
      <p class="note">
        This week: {formatDayDate(sessionBookable(session).startsAt)}, {info.startTime} at {info.place?.name ??
          "somewhere new"}.
      </p>
    {/if}

    {#if !ordered}
      <!-- Before the teams: who's in, in order -->
      {@render signUp()}
      <div class="list-head">
        <h2 class="section-title">Who's in · first come, first served</h2>
        {#if next.going.length || next.waitlist.length}
          <div class="seg sm" role="group" aria-label="Show players as">
            <button aria-pressed={view === "cards"} onclick={() => setView("cards")}>Cards</button>
            <button aria-pressed={view === "list"} onclick={() => setView("list")}>List</button>
          </div>
        {/if}
      </div>
      {#if next.going.length}
        {@render players(next.going, true)}
      {:else}
        <p class="hint">Nobody yet. If you ain't first, you last.</p>
      {/if}
      <p class="hint">Teams come out after sign-up closes.</p>
      {@render waitlist()}
    {:else}
      <!-- Once there are teams: anyone missing from them first, then sign-up and your answer, then the teams -->
      {#if unplaced.length}
        <div class="late rise">
          <span class="late-icon"><Icon name="alert" size={22} /></span>
          <p class="late-text">
            <span class="eyebrow">{unplaced.length} not on a team</span>
            <span
              ><strong>{firstNames(unplaced)}</strong>
              {unplaced.length === 1 && unplaced[0] !== who.id ? "is" : "are"} in, but signed up after the teams were made.{#if !can(perms, "generate:Teams")}
                The teams may change.{/if}</span
            >
          </p>
          {#if can(perms, "generate:Teams")}
            <div class="late-acts">
              <button class="btn primary sm" onclick={slot}>Slot them in</button>
              <button class="btn outline sm" onclick={generate}>Remake teams</button>
            </div>
          {/if}
        </div>
      {/if}

      {@render signUp()}

      {#if proposal}
        <div class="draft-bar rise">
          <p><strong>Not published yet.</strong> Only admins see these. Move a player with the arrow.</p>
          <div class="late-acts">
            {#if published}
              <button class="btn ghost" onclick={() => (proposals[next.id] = undefined)}>Discard</button>
            {/if}
            {#if can(perms, "publish:Teams")}
              <button class="btn primary" onclick={publish}>Publish teams</button>
            {/if}
          </div>
        </div>
      {/if}

      <div class="teams-grid">
        {#each ordered as team (team.name)}
          {@const mine = !proposal && team.players.includes(who.id)}
          <section class="team rise" class:mine>
            <header>
              <h2 class="display">{team.name}</h2>
              {#if mine}<span class="badge green">Your team</span>{/if}
              <span class="hint num count">
                {team.players.length}
                {team.players.length === 1 ? "player" : "players"}{ratings ? ` · rating ${rating(team.players)}` : ""}
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
      </div>

      {@render waitlist()}
    {/if}
  {/if}
</div>

{#if session && can(perms, "record:Attendance")}
  <RegisterDrawer {seriesId} bind:open={registering} />
{/if}

{#if lifted}
  {@const id = lifted.id}
  <PlayerCardZoom
    player={byId(id)}
    source={lifted.el}
    n={lifted.n}
    you={id === who.id}
    showRating={ratings}
    bio={byId(id).bio}
    removeLabel={can(perms, "update:Event") ? `Remove from ${series.shortName}` : undefined}
    onremove={() => removeFromSession(id)}
    detailsHref={can(perms, "manage:Member") ? `/more/teammates/${id}` : undefined}
    onclose={() => (lifted = null)}
  />
{/if}

<style>
  .list-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
  }
  .list-head .section-title {
    margin: 0;
  }
  /* The teams side by side where there's room, each a column of rows */
  .teams-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
    gap: var(--s-6);
    align-items: start;
  }
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
  /* The teams are out: a line on Who's in that goes to them */
  /* Draft teams: what they are and the one thing to do, together */
  .draft-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
  }
  .draft-bar p {
    margin: 0;
    color: var(--fg-muted);
  }
  .draft-bar strong {
    color: var(--fg);
  }
  /* Someone's missing from the teams: the first thing on the page, in amber */
  .late {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-4);
    padding: var(--s-4) var(--s-5);
    border-radius: var(--r-lg);
    background: color-mix(in srgb, var(--amber) 10%, var(--surface-1));
    color: var(--fg-muted);
  }
  .late-icon {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    flex-shrink: 0;
    border-radius: 50%;
    background: color-mix(in srgb, var(--amber) 22%, transparent);
    color: var(--amber-ink);
  }
  .late-text {
    display: grid;
    flex: 1;
    gap: 0.15rem;
    min-width: 14rem;
    margin: 0;
  }
  .late-text .eyebrow {
    color: var(--amber-ink);
  }
  .late strong {
    color: var(--fg);
  }
  .late-acts {
    display: flex;
    gap: var(--s-2);
  }
  .n {
    width: 1.25rem;
    color: var(--fg-subtle);
    font-size: var(--text-sm);
    text-align: right;
  }
</style>
