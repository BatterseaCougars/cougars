<script lang="ts">
  // A captains' draft (ADR 0060). An admin opens it on the night; the captains take turns, in snake order, picking
  // from the members who said they're in (captains are in automatically, never picked). The captain on the clock picks
  // on their own phone; whoever runs the draft can pick for them, undo the last pick, close it, reopen it (ADR 0066).
  // A team takes one goalie (ADR 0067).
  //
  // Laid out as a draft room: a ticker of picks across the top (the one on the clock lit, yours green), then three
  // views, My team, Players and Teams: columns on a desktop, tabs on a phone. The players are a ranked list with a
  // Pick on each row on your turn; a name opens the player's card.
  import { can } from "../access/actions";
  import { PLAYERS, type Player, type Position } from "../demo/data";
  import { granted, me } from "../demo/session.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import PlayerCardZoom from "../lib/PlayerCardZoom.svelte";
  import { flip } from "svelte/animate";
  import { prefersReducedMotion } from "../app/motion";
  import TournamentPlayersDrawer from "../lib/TournamentPlayersDrawer.svelte";
  import TeamDrawer from "../lib/TeamDrawer.svelte";
  import { phone } from "../lib/viewport.svelte";
  import TeamCrest from "../lib/TeamCrest.svelte";
  import { teamTone } from "../lib/team-tones";
  import TeamLookSheet from "../lib/TeamLookSheet.svelte";
  import TournamentHead from "../lib/TournamentHead.svelte";
  import { editTournament } from "../lib/TournamentEditorPanel.svelte";
  import { currentTournament, typeById } from "../demo/schedule.svelte";
  import {
    closeDraft,
    draftPick,
    makeFixtures,
    openDraft,
    refreshIfChanged,
    resetDraft,
    undoDraftPick,
  } from "../app/backend.svelte";
  import { formatDayDate, londonISO } from "../lib/dates";
  import { onTheClock } from "../lib/draft";
  import { navigate } from "../app/router.svelte";

  let { typeId }: { typeId: number } = $props();

  const perms = $derived(granted());
  const type = $derived(typeById(typeId)!);
  const tournament = $derived(currentTournament(typeId));
  const byId = (id: number) => PLAYERS.find((p) => p.id === id);
  const firstName = (id: number | null) => (id ? (byId(id)?.name.split(" ")[0] ?? "") : "");
  const ratings = $derived(can(perms, "read:Rating"));

  const teams = $derived(tournament?.teams ?? []);
  const picked = $derived(new Set(teams.flatMap((t) => t.players.map((p) => p.memberId))));
  const captains = $derived(new Set(teams.map((t) => t.captainMemberId)));
  const made = $derived(teams.reduce((n, t) => n + t.players.length, 0));
  // Who's left: everyone who said they're in, but not the captains or anyone already picked; best first
  const pool = $derived(
    (tournament?.going ?? [])
      .filter((id) => !picked.has(id) && !captains.has(id))
      .flatMap((id) => byId(id) ?? [])
      .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name)),
  );
  const phase = $derived(tournament?.draftState ?? "none");
  const open = $derived(phase === "open");
  const live = $derived(open && pool.length > 0);
  const clock = $derived(teams.length ? onTheClock(teams.length, made) : -1);
  const running = $derived(can(perms, "run:Draft"));
  const mine = $derived(clock >= 0 && teams[clock].captainMemberId === me().id);
  const canPick = $derived(open && (running || mine));
  // An admin puts in someone who didn't sign up (sign-up shut or not), until the draft closes and the teams are set
  const adding = $derived(can(perms, "update:Event") && phase !== "closed");
  let addingOpen = $state(false);
  // An admin edits a team directly, outside the draft: a replacement when someone drops out (ADR 0066)
  const editTeams = $derived(can(perms, "manage:Tournament"));
  let teamOpen = $state(false);
  let teamIndex = $state(0);
  // A team's name and logo: its captain or an admin, from its crest
  let lookOpen = $state(false);
  let lookIndex = $state(0);
  const canLook = (i: number) => !!teams[i]?.id && (editTeams || teams[i].captainMemberId === me().id);

  // Your team: you're its captain, or you've been picked onto it
  const isMine = (i: number) =>
    teams[i].captainMemberId === me().id || teams[i].players.some((p) => p.memberId === me().id);
  const myTeam = $derived(teams.findIndex((_, i) => isMine(i)));
  const others = $derived(teams.map((_, i) => i).filter((i) => i !== myTeam));
  // How many picks until a team's turn (0: now); never, once the pool runs out first
  const turnIn = (i: number) => {
    for (let k = 0; k < pool.length; k++) if (onTheClock(teams.length, made + k) === i) return k;
    return Infinity;
  };
  const untilMine = $derived(myTeam < 0 || turnIn(myTeam) === Infinity ? -1 : turnIn(myTeam));
  const teamName = (i: number) => teams[i].name || `Team ${firstName(teams[i].captainMemberId)}`;
  const round = $derived(teams.length ? Math.floor(made / teams.length) + 1 : 1);
  // The last pick, for the status line: the team that made pick N in snake order, and its newest player
  const last = $derived.by(() => {
    if (!made || !teams.length) return null;
    const i = onTheClock(teams.length, made - 1);
    const p = teams[i].players.at(-1);
    return p ? { team: teamName(i), name: p.memberId ? (byId(p.memberId)?.name ?? p.name) : p.name } : null;
  });

  // Positions: what a team has, counting its captain; one goalie a team (ADR 0067)
  const membersOf = (i: number) =>
    [teams[i].captainMemberId, ...teams[i].players.map((p) => p.memberId)].flatMap((id) =>
      id ? (byId(id) ?? []) : [],
    );
  const tallyOf = (players: Player[]) => {
    const t: Record<Position, number> = { D: 0, F: 0, G: 0 };
    for (const p of players) t[p.position]++;
    return t;
  };
  const myTally = $derived(myTeam >= 0 ? tallyOf(membersOf(myTeam)) : null);
  const haveGoalie = $derived(!!myTally?.G);
  const poolTally = $derived(tallyOf(pool));
  // Goalies left against teams still without one: when they run short, say so
  const keeperless = $derived(teams.filter((_, i) => !membersOf(i).some((p) => p.position === "G")).length);
  // The team on the clock has a goalie: the goalies' rows can't be picked for it
  const clockHasGoalie = $derived(clock >= 0 && membersOf(clock).some((p) => p.position === "G"));

  // The ticker: the picks just made (who was taken), then every pick to come, each with its team. Fixed-size chips,
  // so it scrolls but never grows; the one on the clock is kept in view
  const SHOWN_BEFORE = 3;
  const ticker = $derived.by(() => {
    if (!teams.length || phase === "none" || (phase === "closed" && !made)) return [];
    const out: { n: number; team: number; took?: string }[] = [];
    for (let n = Math.max(1, made - SHOWN_BEFORE + 1); n <= made; n++) {
      const team = onTheClock(teams.length, n - 1);
      // A team's k-th pick is its players[k]: picks land in order
      const p = teams[team].players[Math.floor((n - 1) / teams.length)];
      out.push({ n, team, took: p ? (p.memberId ? firstName(p.memberId) : p.name) : "" });
    }
    if (phase !== "closed")
      for (let n = made + 1; n <= made + pool.length; n++) out.push({ n, team: onTheClock(teams.length, n - 1) });
    return out;
  });
  let tickerEl = $state<HTMLElement | undefined>();
  $effect(() => {
    void made;
    tickerEl
      ?.querySelector(".tick.now")
      ?.scrollIntoView({ inline: "center", block: "nearest", behavior: prefersReducedMotion ? "auto" : "smooth" });
  });
  const tickMeta = (t: { n: number; team: number; took?: string }) => {
    if (t.n <= made) return `${t.n} · ${t.took ? `took ${t.took}` : "picked"}`;
    const k = t.n - made - 1;
    if (k === 0) return `${t.n} · picking`;
    if (t.team === myTeam) return `${t.n} · in ${k}`;
    return k === 1 ? `${t.n} · next` : `${t.n}`;
  };

  // Players: a ranked list, by rating, in tiers; filtered by position
  type Filter = "all" | Position;
  let filter = $state<Filter>("all");
  const shown = $derived(filter === "all" ? pool : pool.filter((p) => p.position === filter));
  const TIERS = [
    { min: 65, label: "Tier 1", sub: "rated 65 and up" },
    { min: 50, label: "Tier 2", sub: "50 to 64" },
    { min: -Infinity, label: "Tier 3", sub: "under 50" },
  ];
  const tierOf = (p: Player) => TIERS.findIndex((t) => p.rating >= t.min);
  // Ratings are for admins (read:Rating): without them there are no tiers, and the list is by name
  const listed = $derived(ratings ? shown : [...shown].sort((a, b) => a.name.localeCompare(b.name)));
  // A goalie's row: greyed for you once you have one, and not offered to whoever's on the clock if they have one
  const dimmed = (p: Player) => p.position === "G" && haveGoalie;
  const pickable = (p: Player) => canPick && !(p.position === "G" && clockHasGoalie);
  const leftOut = $derived(phase === "closed" ? pool : []);

  // A name turns the player's card over (PlayerCardZoom); Pick lives on the row
  let lifted = $state<{ id: number; el: HTMLElement } | null>(null);
  async function pick(id: number) {
    if (tournament) await draftPick(tournament.id, id);
  }

  // On a phone, one view at a time
  type View = "players" | "mine" | "teams";
  let view = $state<View>("players");

  const moveMs = prefersReducedMotion ? 0 : 360;
  const when = $derived(
    tournament?.draftOn
      ? `${formatDayDate(londonISO(tournament.draftOn, tournament.draftTime ?? "12:00"))}${tournament.draftTime ? ` at ${tournament.draftTime}` : ""}`
      : "",
  );

  // Closing with members still to pick: say so, and ask before leaving them out
  let confirmLeaveOut = $state(false);
  async function close() {
    if (!tournament) return;
    if (pool.length && !confirmLeaveOut) return void (confirmLeaveOut = true);
    await closeDraft(tournament.id, pool.length > 0);
    confirmLeaveOut = false;
  }
  // Start again: once there's a pick to take back. The fixtures stay (ADR 0066). Asked first, as it can't be undone
  const resettable = $derived(made > 0);
  let confirmReset = $state(false);
  async function reset() {
    if (!tournament) return;
    if (!confirmReset) return void (confirmReset = true);
    await resetDraft(tournament.id);
    confirmReset = false;
  }
  async function fixtures() {
    if (tournament && (await makeFixtures(tournament.id))) navigate(`/tournaments/${type.slug}`);
  }

  // While it's open, the other captains' picks show up within 10 seconds. Each check is a Worker request and a few
  // small queries (session, roles, data version), so it's slow enough that a room of phones on one wifi stays
  // inside the per-address limit (ADR 0056) and a draft night is a small part of the free day (ADR 0058)
  $effect(() => {
    if (!open) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") refreshIfChanged().catch(() => {});
    }, 10_000);
    return () => clearInterval(t);
  });
</script>

<!-- A team's turn, as a badge: Picking, Next, In N -->
{#snippet turnBadge(i: number)}
  {@const k = turnIn(i)}
  {#if live && k === 0}<span class="badge red live">Picking</span>
  {:else if live && k === 1}<span class="badge">Next</span>
  {:else if live && k !== Infinity}<span class="badge num">In {k}</span>
  {/if}
{/snippet}

<!-- A team's players as rows: the captain, then its picks in order; `next` draws your coming pick already -->
{#snippet roster(i: number, next = false)}
  {@const t = teams[i]}
  <ol class="rows">
    {#if t.captainMemberId}
      {@const c = byId(t.captainMemberId)}
      <li class="row" class:you={t.captainMemberId === me().id}>
        <span class="c" title="Captain">C</span>
        <span class="name">{c?.name ?? ""}</span>
        {#if c}<span class="pos" class:g={c.position === "G"}>{c.position}</span>{/if}
      </li>
    {/if}
    {#each t.players as p, n (p.memberId ?? p.name)}
      {@const m = p.memberId ? byId(p.memberId) : undefined}
      <li class="row" class:you={p.memberId === me().id} animate:flip={{ duration: moveMs }}>
        <span class="n num">{n + 1}</span>
        <span class="name">{m?.name ?? p.name}</span>
        {#if m}<span class="pos" class:g={m.position === "G"}>{m.position}</span>{/if}
      </li>
    {/each}
    {#if next}
      <li class="row slot">
        <span class="n num">{t.players.length + 1}</span>
        <span class="name num">pick {made + turnIn(i) + 1}</span>
      </li>
    {/if}
  </ol>
{/snippet}

{#snippet myTeamView()}
  {#if myTeam >= 0 && myTally}
    {@const t = teams[myTeam]}
    <section class="panel mine" aria-label="My team">
      <header>
        <TeamCrest
          name={teamName(myTeam)}
          logo={t.logo}
          tone={teamTone(myTeam)}
          onclick={canLook(myTeam) ? () => ((lookIndex = myTeam), (lookOpen = true)) : undefined}
        />
        <h3 class="display">{teamName(myTeam)}</h3>
      </header>
      <div class="needs">
        {#each ["D", "F", "G"] as const as pos (pos)}
          <span class="stat" class:short={open && myTally[pos] === 0}><b class="num">{myTally[pos]}</b>{pos}</span>
        {/each}
        <span class="say">
          {#if phase === "closed"}{haveGoalie ? "Set in goal." : "No goalie."}
          {:else}{haveGoalie ? "You're set in goal." : "You need a goalie."}{/if}
        </span>
      </div>
      {@render roster(myTeam, live && untilMine >= 0)}
      {#if editTeams && t.id}
        <button class="btn ghost sm edit" onclick={() => ((teamIndex = myTeam), (teamOpen = true))}
          >Edit the team</button
        >
      {/if}
    </section>
  {/if}
{/snippet}

{#snippet playersView()}
  <section class="players" aria-label="Players">
    {#if phase === "closed"}
      {#if leftOut.length}
        <h3 class="title display">Left out <span>· {leftOut.length} · still signed up</span></h3>
        <div class="plist">
          {#each leftOut as p (p.id)}
            <div class="prow">
              <span class="rk"></span>
              <button class="nm" onclick={(e) => (lifted = { id: p.id, el: e.currentTarget })}>{p.name}</button>
              <span class="ps" class:g={p.position === "G"}>{p.position}</span>
              <span class="rt num">{ratings ? p.rating : ""}</span>
              <span class="pl num">{p.played ?? 0}</span>
              <span class="act"></span>
            </div>
          {/each}
        </div>
        <p class="hint">Left out on purpose when the draft closed. An admin can put them on a team from its Edit.</p>
      {:else}
        <p class="hint">Everyone who signed up is on a team.</p>
      {/if}
    {:else if pool.length}
      <h3 class="title display">{open ? "Players" : "Signed up"} <span>· {pool.length} left</span></h3>
      <div class="seg chips" role="group" aria-label="Show">
        <button aria-pressed={filter === "all"} onclick={() => (filter = "all")}>All {pool.length}</button>
        <button aria-pressed={filter === "D"} onclick={() => (filter = "D")}>D {poolTally.D}</button>
        <button aria-pressed={filter === "F"} onclick={() => (filter = "F")}>F {poolTally.F}</button>
        <button aria-pressed={filter === "G"} onclick={() => (filter = "G")} class="g"
          >G {poolTally.G} · one a team</button
        >
      </div>
      <div class="plist" role="table" aria-label="Players left">
        <div class="phead" role="row">
          <span>#</span><span>Player</span><span>Pos</span><span>{ratings ? "Rtg" : ""}</span><span>Played</span><span
          ></span>
        </div>
        {#each listed as p, i (p.id)}
          {#if ratings && (i === 0 || tierOf(p) !== tierOf(listed[i - 1]))}
            <div class="tier"><b>{TIERS[tierOf(p)].label}</b> {TIERS[tierOf(p)].sub}</div>
          {/if}
          <div class="prow" class:dim={dimmed(p)} role="row">
            <span class="rk num">{i + 1}</span>
            <button class="nm" onclick={(e) => (lifted = { id: p.id, el: e.currentTarget })}>
              {p.name}{#if p.cougar}<small>Cougar</small>{/if}
            </button>
            <span class="ps" class:g={p.position === "G"}>{p.position}</span>
            <span class="rt num">{ratings ? p.rating : ""}</span>
            <span class="pl num">{p.played ?? 0}</span>
            <!-- Room for Pick is always kept, so the rows don't change when your turn comes -->
            <span class="act">
              {#if pickable(p)}
                <button class="btn primary sm" onclick={() => pick(p.id)}>Pick</button>
              {/if}
            </span>
          </div>
        {/each}
      </div>
      <p class="hint">
        {#if !open}The draft starts when an admin opens it{when ? `, ${when}` : ""}.
        {:else if poolTally.G > 0 && keeperless > poolTally.G}{poolTally.G}
          {poolTally.G === 1 ? "goalie" : "goalies"} left for {keeperless} teams without one.
        {:else}Picks show up on everyone's phone within 10 seconds.{/if}
      </p>
    {:else if open}
      <p class="hint">Everyone's picked. Whoever runs the draft closes it to set the teams.</p>
    {:else}
      <p class="hint">Nobody's signed up yet.</p>
    {/if}
  </section>
{/snippet}

{#snippet teamsView()}
  <section class="teams" aria-label="Teams">
    {#each others as i (teams[i].id ?? i)}
      {@const t = teams[i]}
      <div class="panel">
        <header>
          <TeamCrest
            name={teamName(i)}
            logo={t.logo}
            tone={teamTone(i)}
            onclick={canLook(i) ? () => ((lookIndex = i), (lookOpen = true)) : undefined}
          />
          <h3 class="display">{teamName(i)}</h3>
          {@render turnBadge(i)}
        </header>
        {@render roster(i)}
        {#if editTeams && t.id}
          <button class="btn ghost sm edit" onclick={() => ((teamIndex = i), (teamOpen = true))}
            >Edit {teamName(i)}</button
          >
        {/if}
      </div>
    {/each}
  </section>
{/snippet}

<div class="page wide draft">
  {#if tournament}
    <TournamentHead {type} {tournament} title="Draft" />
  {/if}

  {#if !tournament || tournament.kind !== "draft"}
    <p class="hint">No draft coming up.</p>
  {:else if teams.length < 2}
    <section class="panel">
      <h3 class="display">No captains yet</h3>
      <p class="hint">Two or more captains, then the draft can be opened.</p>
      {#if can(perms, "manage:Tournament")}
        <div class="run">
          <button class="btn primary sm" onclick={() => editTournament(tournament.id, { tab: "teams" })}
            >Add the captains</button
          >
        </div>
      {/if}
    </section>
  {:else}
    <!-- Running it: quiet buttons along the top, out of the picker's way -->
    {#if running || adding}
      <div class="controls run">
        {#if running && phase === "closed"}
          <button class="btn sm outline" onclick={() => openDraft(tournament.id)}>Reopen</button>
          {#if !tournament.games?.length}
            <button class="btn primary sm" onclick={fixtures}>Make the fixtures</button>
          {/if}
        {:else if running && open}
          <button class="btn sm" class:primary={!pool.length} onclick={close}>Close the draft</button>
        {:else if running}
          <button class="btn primary sm" onclick={() => openDraft(tournament.id)}>Open the draft</button>
        {/if}
        {#if running && open && made}
          <button class="btn ghost sm" onclick={() => undoDraftPick(tournament.id)}
            ><Icon name="undo" size={16} /> Undo</button
          >
        {/if}
        {#if adding}
          <button class="btn ghost sm" onclick={() => (addingOpen = true)}
            ><Icon name="userPlus" size={16} /> Add player</button
          >
        {/if}
        {#if running && resettable}
          <button class="btn ghost sm" onclick={reset}>Reset</button>
        {/if}
      </div>
    {/if}
    {#if confirmReset}
      <div class="panel confirm" role="alert">
        <p>Start the draft again? Every pick comes off. Sign-ups, captains and fixtures stay.</p>
        <div class="run">
          <button class="btn sm" onclick={() => (confirmReset = false)}>Keep it</button>
          <button class="btn primary sm" onclick={reset}>Reset the draft</button>
        </div>
      </div>
    {/if}
    {#if confirmLeaveOut}
      <div class="panel confirm" role="alert">
        <p>{pool.length} still to pick. Close the draft and leave them out?</p>
        <div class="run">
          <button class="btn sm" onclick={() => (confirmLeaveOut = false)}>Keep picking</button>
          <button class="btn primary sm" onclick={close}>Close it</button>
        </div>
      </div>
    {/if}

    <!-- Where the draft is, from where you stand: one line, always the same height -->
    <div class="strip">
      {#if phase === "closed"}
        <span class="turn done">Teams set</span>
        <p class="line">
          Closed · {made} picked{#if tournament.games?.length}&nbsp;·&nbsp;<a href="/tournaments/{type.slug}"
              >See the fixtures</a
            >{/if}
        </p>
      {:else if live}
        {#if myTeam >= 0}
          {#if untilMine === 0}<span class="turn now">Your pick</span>
          {:else if untilMine > 0}<span class="turn num">You pick in {untilMine}</span>
          {:else}<span class="turn done">Your picks are done</span>{/if}
        {/if}
        <p class="line">
          <span class="num">Pick {made + 1} · round {round}</span>{#if !mine}&nbsp;· {teamName(clock)} picking{/if}{#if last}&nbsp;·
            {last.team} took <strong>{last.name}</strong>{/if}
        </p>
      {:else if open}
        <span class="turn done">Everyone's picked</span>
        <p class="line">Whoever runs the draft closes it to set the teams.</p>
      {:else}
        <span class="turn">{when ? `Draft ${when}` : "Draft date to be set"}</span>
        <p class="line">{pool.length} signed up · {teams.length} captains · snake order</p>
      {/if}
    </div>

    <!-- The ticker: the picks just made, then every pick to come -->
    {#if ticker.length}
      <div class="ticker" bind:this={tickerEl} aria-label="Picks">
        {#each ticker as t (t.n)}
          <div
            class="tick"
            class:done={t.n <= made}
            class:now={live && t.n === made + 1}
            class:you={t.team === myTeam}
            animate:flip={{ duration: moveMs }}
          >
            <TeamCrest name={teamName(t.team)} logo={teams[t.team].logo} tone={teamTone(t.team)} size="1.9rem" />
            <span class="who display">{t.team === myTeam ? "You" : teamName(t.team)}</span>
            <span class="meta num">{tickMeta(t)}</span>
          </div>
        {/each}
      </div>
    {/if}

    {#if phone.current}
      <!-- A phone: one view at a time; My team carries a red G while you still need a goalie -->
      <div class="seg block tabs" role="tablist" aria-label="Draft">
        <button role="tab" aria-selected={view === "players"} onclick={() => (view = "players")}>Players</button>
        {#if myTeam >= 0}
          <button role="tab" aria-selected={view === "mine"} onclick={() => (view = "mine")}
            >My team{#if open && !haveGoalie}<b class="need">G</b>{/if}</button
          >
        {/if}
        <button role="tab" aria-selected={view === "teams"} onclick={() => (view = "teams")}>Teams</button>
      </div>
      {#if view === "mine" && myTeam >= 0}{@render myTeamView()}
      {:else if view === "teams"}{@render teamsView()}
      {:else}{@render playersView()}{/if}
    {:else}
      <div class="views" class:solo={myTeam < 0}>
        {#if myTeam >= 0}<div class="col">{@render myTeamView()}</div>{/if}
        <div class="col">{@render playersView()}</div>
        <div class="col side">{@render teamsView()}</div>
      </div>
    {/if}
  {/if}
</div>

{#if lifted}
  {@const p = byId(lifted.id)}
  {#if p}
    <PlayerCardZoom
      player={p}
      source={lifted.el}
      you={p.id === me().id}
      showRating={ratings}
      bio={p.bio}
      onclose={() => (lifted = null)}
    />
  {/if}
{/if}

{#if tournament && lookOpen && teams[lookIndex]?.id}
  {@const t = teams[lookIndex]}
  <TeamLookSheet
    tournamentId={tournament.id}
    teamId={t.id!}
    name={t.name}
    logo={t.logo}
    fallback="Team {firstName(t.captainMemberId)}"
    bind:open={lookOpen}
  />
{/if}

{#if tournament && editTeams && teams[teamIndex]}
  <TeamDrawer {tournament} {teamIndex} name={teamName(teamIndex)} bind:open={teamOpen} />
{/if}

{#if tournament && adding}
  <TournamentPlayersDrawer
    tournamentId={tournament.id}
    going={tournament.going ?? []}
    {captains}
    sub="{tournament.name}{when ? ` · draft ${when}` : ''}"
    bind:open={addingOpen}
  />
{/if}

<style>
  /* Never wider than the view: the shell clips sideways, so anything wider would be cut off, not scrolled */
  .draft {
    grid-template-columns: minmax(0, 1fr);
  }
  .run {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
  }
  .controls {
    justify-content: flex-end;
  }
  .confirm {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
  }
  .confirm p {
    margin: 0;
  }
  .hint {
    margin: 0;
  }

  /* The strip: the big badge, then one line. Fixed height whatever the draft is doing */
  .strip {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    min-height: 2.6rem;
    min-width: 0;
  }
  .line {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    color: var(--fg-muted);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .line strong {
    color: var(--fg);
  }
  .turn {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--s-2);
    height: 2.6rem;
    padding: 0 var(--s-4);
    border-radius: var(--r-md);
    background: var(--surface-3);
    color: var(--fg);
    font-family: var(--font-display);
    font-size: 1.35rem;
    line-height: 1;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .turn.now {
    background: var(--red);
    color: #fff;
    box-shadow: 0 6px 20px -6px rgb(229 19 31 / 0.6);
  }
  .turn.now::before {
    content: "";
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    background: currentColor;
    animation: pulse 1.4s var(--ease-in-out) infinite;
  }
  .turn.done {
    color: var(--fg-muted);
  }

  /* The ticker: one chip a pick, scrolling sideways; never wraps, never grows */
  .ticker {
    display: flex;
    gap: var(--s-2);
    overflow-x: auto;
    padding-bottom: var(--s-1);
    scrollbar-width: thin;
  }
  .tick {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: auto auto;
    column-gap: var(--s-2);
    align-content: center;
    align-items: center;
    flex: 0 0 auto;
    width: 8.5rem;
    height: 3.25rem;
    padding: 0 var(--s-3) 0 var(--s-2);
    border-radius: var(--r-md);
    background: var(--surface-2);
  }
  .tick :global(.crest) {
    grid-row: 1 / 3;
  }
  .who {
    overflow: hidden;
    color: var(--fg);
    font-size: 0.95rem;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .meta {
    overflow: hidden;
    color: var(--fg-subtle);
    font-size: var(--text-2xs);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .tick.done {
    opacity: 0.55;
  }
  .tick.done .meta {
    color: var(--fg-muted);
  }
  .tick.you {
    background: color-mix(in srgb, var(--green) 12%, var(--surface-2));
  }
  .tick.you .who {
    color: var(--green-ink);
  }
  .tick.now {
    box-shadow: inset 0 0 0 2px var(--red-hot);
  }
  .tick.now .meta {
    color: var(--red-ink);
    font-weight: 700;
  }
  .tick.now::after {
    content: "";
    position: absolute;
    top: 0.35rem;
    right: 0.35rem;
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background: var(--red-hot);
    animation: pulse 1.4s var(--ease-in-out) infinite;
  }

  /* Three views: My team, Players, Teams. A desktop has them side by side; the teams stay in view */
  .views {
    display: grid;
    grid-template-columns: 15rem minmax(0, 1fr) 16rem;
    gap: var(--s-4);
    align-items: start;
  }
  .views.solo {
    grid-template-columns: minmax(0, 1fr) 16rem;
  }
  .col {
    min-width: 0;
  }
  .side {
    position: sticky;
    top: var(--s-5);
  }
  .tabs .need {
    display: inline-block;
    min-width: 1.1rem;
    margin-left: 0.35rem;
    padding: 0 0.3rem;
    border-radius: var(--r-pill);
    background: var(--red);
    color: #fff;
    font-size: var(--text-2xs);
    line-height: 1.1rem;
  }

  .panel {
    display: grid;
    gap: var(--s-2);
    min-width: 0;
    padding: var(--s-3);
    border-radius: var(--r-lg);
    background: var(--surface-2);
  }
  .panel header {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    min-width: 0;
    min-height: 2.25rem;
  }
  .panel h3 {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    color: var(--fg);
    font-size: 1.25rem;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .panel.mine h3 {
    color: var(--green-ink);
  }
  .teams {
    display: grid;
    gap: var(--s-2);
  }
  .edit {
    justify-self: start;
    margin-left: calc(-1 * var(--s-2));
    color: var(--fg-muted);
  }

  /* What your team has, by position; the empty one red while the draft is open */
  .needs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-1);
    min-height: 1.5rem;
  }
  .stat {
    display: inline-flex;
    align-items: baseline;
    gap: 0.2rem;
    height: 1.35rem;
    padding: 0 0.4rem;
    border-radius: var(--r-sm);
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    color: var(--fg-muted);
    font-size: var(--text-2xs);
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .stat b {
    color: var(--fg);
    font-family: var(--font-display);
    font-size: 0.9375rem;
    font-weight: 400;
  }
  .stat.short {
    background: color-mix(in srgb, var(--red) 24%, transparent);
    color: var(--red-ink);
  }
  .stat.short b {
    color: var(--red-ink);
  }
  .say {
    margin-left: var(--s-1);
    color: var(--fg-muted);
    font-size: var(--text-xs);
  }

  /* A team's players: compact rows */
  .rows {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    min-height: 2.1rem;
    padding: 0 var(--s-2);
    border-radius: var(--r-md);
    background: var(--surface-3);
    font-size: var(--text-sm);
  }
  .row.slot {
    background: color-mix(in srgb, var(--surface-3) 45%, transparent);
  }
  .row.slot .name {
    color: var(--fg-subtle);
    font-weight: 400;
  }
  .row.you .name {
    color: var(--green-ink);
  }
  .n {
    width: 1.1rem;
    color: var(--fg-subtle);
    font-size: var(--text-xs);
    text-align: center;
  }
  .c {
    display: grid;
    flex-shrink: 0;
    place-items: center;
    width: 1.1rem;
    height: 1.1rem;
    border-radius: 50%;
    background: var(--red);
    color: #fff;
    font-family: var(--font-display);
    font-size: 0.65rem;
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--fg);
    font-weight: 500;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .pos {
    color: var(--fg-subtle);
    font-size: var(--text-2xs);
    font-weight: 700;
  }
  .pos.g {
    color: var(--amber-ink);
  }

  /* The players: a ranked list, as a draft room does it; tiers as bands; Pick on the row on your turn */
  .players {
    display: grid;
    gap: var(--s-3);
    min-width: 0;
  }
  .title {
    display: flex;
    align-items: baseline;
    gap: var(--s-2);
    margin: 0;
    color: var(--red-hot);
    font-size: 1.25rem;
    font-style: italic;
  }
  .title span {
    color: var(--fg-muted);
    font-family: var(--font);
    font-size: var(--text-xs);
    font-style: normal;
    font-weight: 500;
    text-transform: none;
  }
  .chips {
    justify-self: start;
    flex-wrap: wrap;
    max-width: 100%;
  }
  .chips .g {
    color: var(--amber-ink);
  }
  .plist {
    display: grid;
    gap: 2px;
  }
  .phead,
  .prow {
    display: grid;
    grid-template-columns: 1.6rem minmax(0, 1fr) 2.1rem 2.4rem 3rem 4.4rem;
    align-items: center;
    gap: var(--s-2);
    min-height: 2.5rem;
    padding: 0 var(--s-2) 0 var(--s-3);
    border-radius: var(--r-md);
  }
  .phead {
    min-height: 1.6rem;
    color: var(--fg-subtle);
    font-size: var(--text-2xs);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .phead span:nth-child(n + 3) {
    text-align: right;
  }
  .prow {
    background: var(--surface-2);
  }
  .prow.dim {
    opacity: 0.4;
  }
  .rk {
    color: var(--fg-subtle);
    font-size: var(--text-xs);
  }
  .nm {
    min-width: 0;
    padding: 0;
    overflow: hidden;
    border: 0;
    background: none;
    color: var(--fg);
    font: inherit;
    font-weight: 500;
    text-align: left;
    white-space: nowrap;
    text-overflow: ellipsis;
    cursor: pointer;
  }
  .nm:hover {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  .nm small {
    margin-left: var(--s-2);
    color: var(--red-muted);
    font-size: var(--text-2xs);
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  .ps {
    display: inline-grid;
    justify-self: end;
    place-items: center;
    width: 1.6rem;
    height: 1.4rem;
    border-radius: var(--r-sm);
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    color: var(--fg-muted);
    font-size: var(--text-2xs);
    font-weight: 700;
  }
  .ps.g {
    background: color-mix(in srgb, var(--amber) 18%, transparent);
    color: var(--amber-ink);
  }
  .rt,
  .pl {
    text-align: right;
  }
  .rt {
    color: var(--fg);
    font-family: var(--font-display);
    font-size: 1.05rem;
  }
  .pl {
    color: var(--fg-muted);
    font-size: var(--text-sm);
  }
  .act {
    display: flex;
    justify-content: flex-end;
  }
  .tier {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    min-height: 1.75rem;
    margin-top: var(--s-1);
    padding: 0 var(--s-3);
    color: var(--fg-muted);
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .tier::after {
    content: "";
    flex: 1;
    height: 1px;
    background: color-mix(in srgb, var(--fg) 10%, transparent);
  }
  .tier b {
    color: var(--fg);
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 400;
    letter-spacing: 0.02em;
  }

  /* Narrower desktops: the teams drop under the list */
  @media (min-width: 901px) and (max-width: 1180px) {
    .views {
      grid-template-columns: 14rem minmax(0, 1fr);
    }
    .views.solo {
      grid-template-columns: minmax(0, 1fr);
    }
    .side {
      position: static;
      grid-column: 1 / -1;
    }
    .side .teams {
      grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
      align-items: start;
    }
  }

  /* A phone: games played goes, the rest tightens */
  @media (max-width: 900px) {
    .phead,
    .prow {
      grid-template-columns: 1.4rem minmax(0, 1fr) 2rem 2.2rem 4rem;
      padding-left: var(--s-2);
    }
    .phead span:nth-child(5),
    .pl {
      display: none;
    }
    .tick {
      width: 7.5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .turn.now::before,
    .tick.now::after {
      animation: none;
    }
  }
</style>
