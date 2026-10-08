<script lang="ts">
  // A captains' draft (ADR 0060). An admin opens it on the night; the captains take turns, in snake order, picking
  // from the members who said they're in (captains are in automatically, never picked). The captain on the clock picks
  // on their own phone: Pick marks a player, End turn sends it (ADR 0068). Whoever runs the draft can pick for them,
  // undo the last pick, close it, reopen it (ADR 0066). A team takes one goalie (ADR 0067). Teams are edited on the
  // Teams page, not here.
  //
  // Laid out as a draft room: a ticker of picks across the top (the one on the clock brought forward with a badge),
  // then three views, My team, Players and Teams: columns on a wide screen, tabs on anything narrower. The
  // players are a plain list with a Pick on each row on your turn; a name opens the player's card.
  import EmptyState from "../lib/EmptyState.svelte";
  import { can } from "../access/actions";
  import { PLAYERS, type Player, type Position } from "../demo/data";
  import { granted, me } from "../demo/session.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import PlayerCardZoom from "../lib/PlayerCardZoom.svelte";
  import { flip } from "svelte/animate";
  import { easeOut, flyMs, prefersReducedMotion } from "../app/motion";
  import { fly } from "svelte/transition";
  import TournamentPlayersDrawer from "../lib/TournamentPlayersDrawer.svelte";
  import TeamCrest from "../lib/TeamCrest.svelte";
  import { teamTone } from "../lib/team-tones";
  import TeamLookSheet from "../lib/TeamLookSheet.svelte";
  import Drawer from "../lib/Drawer.svelte";
  import TournamentHead from "../lib/TournamentHead.svelte";
  import { editTournament } from "../lib/TournamentEditorPanel.svelte";
  import { currentTournament, typeById } from "../demo/schedule.svelte";
  import { closeDraft, draftPick, makeFixtures, openDraft, resetDraft, undoDraftPick } from "../app/backend.svelte";
  import { checkForUpdates, everyHowOften } from "../lib/live-updates.svelte";
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
  // The draft's picks in the order they were made, each with the team that has the player now. Counted from the
  // stored pick numbers, as the server counts them: a player an admin put on directly isn't a pick (no number), and
  // one an admin moved keeps theirs, so whose turn it is matches the server's whatever's been edited
  const picks = $derived(
    teams
      .flatMap((t, team) =>
        t.players.flatMap((p) => (typeof p.pick === "number" ? [{ ...p, pick: p.pick, team }] : [])),
      )
      .sort((a, b) => a.pick - b.pick)
      .map((p, i) => ({ ...p, n: i + 1 })),
  );
  const made = $derived(picks.length);
  // Who's left: everyone who said they're in, but not the captains or anyone already picked
  const pool = $derived(
    (tournament?.going ?? []).filter((id) => !picked.has(id) && !captains.has(id)).flatMap((id) => byId(id) ?? []),
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
  // A team's name and logo: its captain or an admin, from its crest
  let lookOpen = $state(false);
  let lookIndex = $state(0);
  const canLook = (i: number) =>
    !!teams[i]?.id && (can(perms, "manage:Tournament") || teams[i].captainMemberId === me().id);

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
  // The team on the clock has a goalie: the goalies' rows can't be picked for it
  const clockHasGoalie = $derived(clock >= 0 && membersOf(clock).some((p) => p.position === "G"));

  // The ticker: the picks just made (who was taken), then every pick to come, each with its team. Fixed-size chips,
  // so it scrolls but never grows; the one on the clock is kept in view
  const SHOWN_BEFORE = 3;
  const ticker = $derived.by(() => {
    if (!teams.length || phase === "none" || (phase === "closed" && !made)) return [];
    const out: { n: number; team: number; took?: string }[] = [];
    for (const p of picks.slice(-SHOWN_BEFORE))
      out.push({ n: p.n, team: p.team, took: p.memberId ? firstName(p.memberId) : p.name });
    if (phase !== "closed")
      for (let n = made + 1; n <= made + pool.length; n++) out.push({ n, team: onTheClock(teams.length, n - 1) });
    return out;
  });
  let tickerEl = $state<HTMLElement | undefined>();
  // Only the ticker scrolls: scrollIntoView would also move the page under you (it scrolls every scroller around it)
  $effect(() => {
    void made;
    const now = tickerEl?.querySelector<HTMLElement>(".tick.now");
    if (!tickerEl || !now) return;
    tickerEl.scrollTo({
      left: now.offsetLeft - (tickerEl.clientWidth - now.offsetWidth) / 2,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  });
  // The pick log: every pick so far, in order, who went where
  const log = $derived(
    picks.map((p) => ({
      n: p.n,
      team: p.team,
      name: p.memberId ? (byId(p.memberId)?.name ?? p.name) : p.name,
      you: p.memberId === me().id,
    })),
  );
  // In a drawer from the strip, by round
  let logOpen = $state(false);
  // The rules, in a drawer beside it
  let rulesOpen = $state(false);
  const rounds = $derived.by(() => {
    const out: { round: number; picks: typeof log }[] = [];
    for (const l of log) {
      const r = Math.ceil(l.n / teams.length);
      if (out.at(-1)?.round !== r) out.push({ round: r, picks: [] });
      out.at(-1)!.picks.push(l);
    }
    return out;
  });
  const tickMeta = (t: { n: number; team: number; took?: string }) => {
    if (t.n <= made) return `${t.n} · ${t.took ? `took ${t.took}` : "picked"}`;
    const k = t.n - made - 1;
    if (t.team === myTeam) return `${t.n} · in ${k}`;
    return k === 1 ? `${t.n} · next` : `${t.n}`;
  };

  // Players: the pool, filtered by position
  type Filter = "all" | Position;
  let filter = $state<Filter>("all");
  const shown = $derived(filter === "all" ? pool : pool.filter((p) => p.position === filter));
  // Just the pool, by name: who's good is the captain's call, not the app's
  const listed = $derived([...shown].sort((a, b) => a.name.localeCompare(b.name)));
  // A goalie's row: greyed for you once you have one, and not offered to whoever's on the clock if they have one
  const dimmed = (p: Player) => p.position === "G" && haveGoalie;
  const pickable = (p: Player) => canPick && !(p.position === "G" && clockHasGoalie);
  const leftOut = $derived(phase === "closed" ? pool : []);

  // A name turns the player's card over (PlayerCardZoom); Pick lives on the row
  let lifted = $state<{ id: number; el: HTMLElement } | null>(null);
  // Picking is two steps: Pick marks a player (tap another to change your mind), End turn sends it. Nobody else sees
  // it until then. A new pick on the clock, or the player going, clears it
  let chosen = $state<number | null>(null);
  $effect(() => {
    void made;
    chosen = null;
  });
  const chosenPlayer = $derived(chosen !== null && canPick ? pool.find((p) => p.id === chosen) : undefined);
  let ending = $state(false);
  async function endTurn() {
    if (!tournament || !chosenPlayer || ending) return;
    ending = true;
    try {
      await draftPick(tournament.id, chosenPlayer.id);
    } finally {
      ending = false;
    }
  }

  // Three columns only where they fit (by the page's own width); anything narrower gets the phone's tabs, one view at
  // a time. No in-between layout
  let pageW = $state(0);
  const columns = $derived(pageW >= 960);
  type View = "players" | "mine" | "teams";
  let view = $state<View>("players");
  // Switching tabs slides the new view in from the side it's on (no slide out: the old one just goes, so the page
  // never holds both and nothing below jumps)
  const ORDER: View[] = ["players", "mine", "teams"];
  let dir = $state(1);
  const show = (v: View) => {
    dir = ORDER.indexOf(v) >= ORDER.indexOf(view) ? 1 : -1;
    view = v;
  };

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
    if (tournament && (await makeFixtures(tournament.id))) navigate(`/tournaments/${type.slug}/schedule`);
  }

  // While it's open, the other captains' picks show up on the admins' beat (every 10 seconds unless they've changed
  // it, ADR 0072). Each check is a Worker request and a few small queries (session, roles, data version), so it's
  // slow enough that a room of phones on one wifi stays inside the per-address limit (ADR 0056) and a draft night is
  // a small part of the free day (ADR 0058)
  $effect(() => {
    if (open) return checkForUpdates();
  });
</script>

<!-- A team's turn, as a badge: Picking, Next, In N -->
{#snippet turnBadge(i: number)}
  {@const k = turnIn(i)}
  {#if live && k === 0}<span class="badge red"><Icon name="clock" size={13} />Picking</span>
  {:else if live && k === 1}<span class="badge">Up next</span>
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
        <span class="c display" title="Captain" aria-label="Captain">C</span>
        <span class="name"
          >{c?.name ?? ""}{#if t.captainMemberId === me().id}<small>you</small>{/if}</span
        >
        {#if c}<span class="pos" class:g={c.position === "G"}>{c.position}</span>{/if}
      </li>
    {/if}
    {#each t.players as p, n (p.memberId ?? p.name)}
      {@const m = p.memberId ? byId(p.memberId) : undefined}
      <li class="row" class:you={p.memberId === me().id} animate:flip={{ duration: moveMs }}>
        <span class="n num">{n + 1}</span>
        <span class="name"
          >{m?.name ?? p.name}{#if p.memberId === me().id}<small>you</small>{/if}</span
        >
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
      {@render roster(myTeam, live && untilMine >= 0)}
    </section>
  {/if}
{/snippet}

{#snippet playerRow(p: Player, action: boolean)}
  <div class="prow" class:dim={dimmed(p)} class:chosen={chosenPlayer?.id === p.id}>
    <button class="nm" onclick={(e) => (lifted = { id: p.id, el: e.currentTarget })}>
      {p.name}{#if p.cougar}<small>Cougar</small>{/if}
    </button>
    <span class="ps" class:g={p.position === "G"}>{p.position}</span>
    <!-- Room for Pick is always kept, so the rows don't change when your turn comes -->
    <span class="act">
      {#if action && pickable(p)}
        {@const on = chosenPlayer?.id === p.id}
        <button class="btn sm pick" aria-pressed={on} onclick={() => (chosen = on ? null : p.id)}
          >{#if on}<Icon name="check" size={14} />Picked{:else}Pick{/if}</button
        >
      {/if}
    </span>
  </div>
{/snippet}

{#snippet playersView()}
  <section class="players" aria-label="Players">
    {#if phase === "closed"}
      {#if leftOut.length}
        <p class="hint">Left out when the draft closed, still signed up. An admin can put them on a team.</p>
        <div class="plist">
          {#each leftOut as p (p.id)}{@render playerRow(p, false)}{/each}
        </div>
      {:else}
        <p class="hint">Everyone who signed up is on a team.</p>
      {/if}
    {:else if pool.length}
      <div class="seg chips" role="group" aria-label="Show">
        <button aria-pressed={filter === "all"} onclick={() => (filter = "all")}>All {pool.length}</button>
        <button aria-pressed={filter === "D"} onclick={() => (filter = "D")}>D {poolTally.D}</button>
        <button aria-pressed={filter === "F"} onclick={() => (filter = "F")}>F {poolTally.F}</button>
        <button aria-pressed={filter === "G"} onclick={() => (filter = "G")}>G {poolTally.G}</button>
      </div>
      <div class="plist" aria-label="Players left">
        {#each listed as p (p.id)}{@render playerRow(p, true)}{/each}
      </div>
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
      </div>
    {/each}
  </section>
{/snippet}

<div class="page wide draft" bind:clientWidth={pageW}>
  {#if tournament}
    <TournamentHead {type} {tournament} title="Draft" />
  {/if}

  {#if !tournament || tournament.kind !== "draft"}
    <p class="hint">No draft coming up.</p>
  {:else if teams.length < 2}
    <!-- Nothing to draft yet: said plainly on the page, not in a box, with the one thing to do about it -->
    <EmptyState icon="draft" title="No captains yet">
      {can(perms, "manage:Tournament")
        ? "Name two or more captains and the draft can open. They pick the teams, a player at a time."
        : "The captains are named before draft night. They pick the teams, a player at a time."}
      {#snippet action()}
        {#if can(perms, "manage:Tournament")}
          <button class="btn outline" onclick={() => editTournament(tournament.id, { tab: "teams" })}
            ><Icon name="userPlus" size={18} />Name the captains</button
          >
        {/if}
      {/snippet}
    </EmptyState>
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

    <!-- Where you stand, as one badge; on your turn, who you've picked and End turn. Always the same height -->
    <div class="strip">
      {#if phase === "closed"}
        <span class="turn done">Teams set</span>
        {#if tournament.games?.length}<a class="btn ghost sm" href="/tournaments/{type.slug}/schedule"
            >See the fixtures</a
          >{/if}
      {:else if live}
        {#if mine}<span class="turn now"><i class="dot"></i>Your pick</span>
        {:else if canPick}<span class="turn now"><i class="dot"></i>Picking for {teamName(clock)}</span>
        {:else if myTeam >= 0 && untilMine > 0}<span class="turn num">You pick in {untilMine}</span>
        {:else if myTeam >= 0}<span class="turn done">Your picks are done</span>{/if}
        {#if canPick}
          <p class="end hint">
            {chosenPlayer ? "Happy? End your turn to lock them in." : "Pick a player, then end your turn."}
          </p>
        {/if}
      {:else if open}
        <span class="turn done">Everyone's picked</span>
      {:else}
        <span class="turn">{when ? `Draft ${when}` : "Draft date to be set"}</span>
      {/if}
      <div class="tools">
        {#if open}
          <!-- The club's on a free plan: picks show up on the admins' beat (ADR 0072) -->
          <span
            class="updates hint"
            title="Other captains' picks show up {everyHowOften()}, to keep the club on the free plan"
            ><Icon name="clock" size={14} /><span class="lbl">Updates {everyHowOften()}</span></span
          >
        {/if}
        <button class="btn ghost sm" onclick={() => (rulesOpen = true)} aria-label="Rules"
          ><Icon name="whistle" size={16} /><span class="lbl">Rules</span></button
        >
        <button class="btn ghost sm" onclick={() => (logOpen = true)} aria-label="Pick log"
          ><Icon name="list" size={16} /><span class="lbl">Pick log</span></button
        >
      </div>
    </div>

    <!-- The ticker: the picks just made, then every pick to come -->
    {#if ticker.length}
      <div class="ticker" bind:this={tickerEl} aria-label="Picks">
        {#each ticker as t (t.n)}
          <div
            class="tick"
            class:done={t.n <= made}
            class:now={live && t.n === made + 1}
            style:--d={Math.min(Math.abs(t.n - (made + 1)), 4)}
            animate:flip={{ duration: moveMs }}
          >
            <TeamCrest name={teamName(t.team)} logo={teams[t.team].logo} tone={teamTone(t.team)} size="2.25rem" />
            <span class="who display"
              >{#if t.team === myTeam}<Icon name="user" size={12} />You{:else}{teamName(t.team)}{/if}</span
            >
            {#if live && t.n === made + 1}<span class="badge red clock">On the clock</span>
            {:else}<span class="meta num">{tickMeta(t)}</span>{/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if !columns}
      <!-- Narrower than three columns: one view at a time; My team warns while you still need a goalie -->
      <div class="seg block tabs" role="tablist" aria-label="Draft">
        <button role="tab" aria-selected={view === "players"} onclick={() => show("players")}>Players</button>
        {#if myTeam >= 0}
          <button role="tab" aria-selected={view === "mine"} onclick={() => show("mine")}
            >My team{#if open && !haveGoalie}<span class="need" title="No goalie yet"
                ><Icon name="alert" size={13} />G</span
              >{/if}</button
          >
        {/if}
        <button role="tab" aria-selected={view === "teams"} onclick={() => show("teams")}>Teams</button>
      </div>
      {#key view}
        <div class="pane" in:fly={{ x: 32 * dir, duration: flyMs, easing: easeOut, opacity: 0 }}>
          {#if view === "mine" && myTeam >= 0}{@render myTeamView()}
          {:else if view === "teams"}{@render teamsView()}
          {:else}{@render playersView()}{/if}
        </div>
      {/key}
    {:else}
      <div class="views" class:solo={myTeam < 0}>
        {#if myTeam >= 0}<div class="col">{@render myTeamView()}</div>{/if}
        <div class="col">{@render playersView()}</div>
        <div class="col side">{@render teamsView()}</div>
      </div>
    {/if}
  {/if}
</div>

<!-- End turn: a bar floating at the bottom once you've picked someone, over the page (so nothing moves), where your
     thumb is -->
{#if chosenPlayer}
  <div
    class="end-bar"
    role="region"
    aria-label="Your pick"
    transition:fly={{ y: 24, duration: flyMs, easing: easeOut, opacity: 0 }}
  >
    <div class="who-picked">
      <span class="eyebrow">Your pick</span>
      <span class="chosen-name">{chosenPlayer.name}<small>{chosenPlayer.position}</small></span>
    </div>
    <button class="btn ghost sm" onclick={() => (chosen = null)}>Change</button>
    <button class="btn end-turn" disabled={ending} onclick={endTurn}
      >End turn<Icon name="chevronRight" size={18} /></button
    >
  </div>
{/if}

{#if tournament}
  <Drawer bind:open={rulesOpen} title="Draft rules" sub="{teams.length} captains · snake order">
    <ol class="rules">
      <li>
        <strong>Snake order.</strong>
        <span
          >Captains pick one at a time. Each round the order flips, so whoever picks last picks first next round.</span
        >
      </li>
      <li>
        <strong>Captains are already on their teams.</strong>
        <span>Nobody can pick a captain. Everyone else who said they're in is up for grabs.</span>
      </li>
      <li>
        <strong>One goalie a team.</strong>
        <span>Once you've got one, the rest are off the menu. No hoarding.</span>
      </li>
      <li>
        <strong>Pick, then end your turn.</strong>
        <span>Tap Pick to choose; change your mind as often as you like. Nobody sees it until you press End turn.</span>
      </li>
      <li>
        <strong>Whoever runs the draft can step in.</strong>
        <span>They can pick for a captain who's gone quiet and undo the last pick if someone fat-fingers it.</span>
      </li>
      <li>
        <strong>Nobody left behind.</strong>
        <span>Anyone not picked when the draft closes stays signed up, and an admin can put them on a team.</span>
      </li>
    </ol>
  </Drawer>

  <Drawer bind:open={logOpen} title="Pick log" sub="{made} {made === 1 ? 'pick' : 'picks'} so far">
    {#if rounds.length}
      <div class="log">
        {#each rounds as r (r.round)}
          <section>
            <h4 class="eyebrow">Round {r.round}</h4>
            <ol>
              {#each r.picks as l (l.n)}
                <li>
                  <span class="n num">{l.n}</span>
                  <span class="lp"
                    >{l.name}{#if l.you}<small>you</small>{/if}</span
                  >
                  <span class="lt">{teamName(l.team)}</span>
                </li>
              {/each}
            </ol>
          </section>
        {/each}
      </div>
    {:else}
      <p class="hint">Nobody's picked yet. Brick not hit back.</p>
    {/if}
  </Drawer>
{/if}

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
    padding-bottom: 6rem;
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

  /* The strip: the big badge; on your turn, who you've picked and End turn at the end. Fixed height */
  .updates {
    display: inline-flex;
    align-items: center;
    gap: var(--s-1);
    padding-inline: var(--s-2);
    font-size: var(--text-xs);
    white-space: nowrap;
  }
  .strip {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    min-height: 2.6rem;
    min-width: 0;
  }
  .end {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-align: right;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  /* End turn: floats at the bottom centre over the page, above the tabs on a phone; the page keeps room for it at
     the bottom so it never covers the last player */
  .end-bar {
    position: fixed;
    left: 50%;
    bottom: calc(var(--s-5) + env(safe-area-inset-bottom, 0px));
    z-index: 60;
    display: flex;
    align-items: center;
    gap: var(--s-3);
    width: min(30rem, calc(100vw - 2 * var(--gutter)));
    padding: var(--s-3) var(--s-3) var(--s-3) var(--s-5);
    border-radius: var(--r-xl);
    background: var(--surface-3);
    box-shadow: var(--shadow-pop);
    translate: -50% 0;
  }
  .who-picked {
    display: grid;
    flex: 1;
    gap: 0.15rem;
    min-width: 0;
  }
  .chosen-name {
    min-width: 0;
    overflow: hidden;
    color: var(--fg);
    font-size: var(--text-md);
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .chosen-name small {
    margin-left: var(--s-2);
    color: var(--fg-subtle);
    font-size: var(--text-xs);
    font-weight: 700;
  }
  /* End turn: the one red button on the page, the club's accent, so it can't be missed */
  .end-turn {
    gap: var(--s-1);
    padding-right: var(--s-3);
    background: var(--red);
    color: #fff;
  }
  .end-turn:hover:not(:disabled) {
    background: var(--red-hover);
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
  /* Your pick: said in words, with a live dot; red is the accent, not the fill */
  .turn.now {
    background: var(--red-wash);
    color: var(--red-ink);
  }
  .dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--red-hot);
    animation: pulse 1.4s var(--ease-in-out) infinite;
  }
  .turn.done {
    color: var(--fg-muted);
  }

  /* The ticker, as a carousel: the pick on the clock sits in the middle, larger and brought forward; the picks
     either side step back and fade with their distance (--d). Fixed sizes: it scrolls, never grows */
  .ticker {
    display: flex;
    align-items: center;
    position: relative;
    gap: var(--s-2);
    height: 7.5rem;
    margin-block: var(--s-2);
    padding-inline: calc(50% - 5.5rem);
    overflow-x: auto;
    scrollbar-width: none;
    mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
  }
  .ticker::-webkit-scrollbar {
    display: none;
  }
  .tick {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: auto auto;
    column-gap: var(--s-3);
    row-gap: 0.2rem;
    align-content: center;
    align-items: center;
    flex: 0 0 auto;
    width: 11rem;
    height: 4rem;
    padding: 0 var(--s-4) 0 var(--s-3);
    border-radius: var(--r-md);
    background: var(--surface-2);
    opacity: calc(1 - var(--d, 0) * 0.18);
    scale: calc(0.94 - var(--d, 0) * 0.05);
    transition:
      scale var(--t-slow) var(--ease),
      opacity var(--t-slow) var(--ease),
      box-shadow var(--t-slow) var(--ease);
  }
  .tick :global(.crest) {
    grid-row: 1 / 3;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 0.3rem;
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
  /* On the clock: half as big again, a card reaching over the chips either side, and a badge that says so */
  .tick.now {
    z-index: 1;
    scale: 1.45;
    /* The home page's cards: the panel ground, a firm edge and a lit top */
    border-radius: var(--r-lg);
    background: var(--panel-bg);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.05),
      0 0 0 1px var(--border-strong);
  }
  .clock {
    justify-self: start;
    height: 1.15rem;
    padding: 0 0.4rem;
    font-size: 0.6rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* Three views: My team, Players, Teams. A desktop has them side by side; the teams stay in view */
  /* The pool is a name, a position and Pick: it needs no more than 30rem. My team and the other teams share what's
     left evenly, either side of it */
  .views {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 30rem) minmax(0, 1fr);
    gap: var(--s-6);
    align-items: start;
  }
  .views.solo {
    grid-template-columns: minmax(0, 30rem) minmax(16rem, 1fr);
  }
  /* No team of your own: the teams get the rest of the width, side by side where there's room */
  .views.solo .teams {
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    align-items: start;
  }
  .pane {
    min-width: 0;
  }
  .col {
    min-width: 0;
  }
  .side {
    position: sticky;
    top: var(--s-5);
  }
  .tabs .need {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    margin-left: 0.4rem;
    color: var(--amber-ink);
    font-size: var(--text-2xs);
    font-weight: 700;
  }

  /* A team is its name and a list: no panel behind it (dark on dark said nothing). The row is what lights up */
  .panel {
    display: grid;
    gap: var(--s-2);
    min-width: 0;
  }
  /* The header sits clear of the rows and the column's edges: the same inset as the rows, room above */
  .panel header {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    min-width: 0;
    min-height: 3rem;
    padding: var(--s-2) var(--s-2) var(--s-1);
  }
  .panel header .badge {
    gap: 0.3rem;
    flex-shrink: 0;
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
  .teams {
    display: grid;
    gap: var(--s-6);
  }

  /* A team's players: compact rows */
  .rows {
    display: grid;
    gap: 0;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    min-height: 2.5rem;
    padding: 0 var(--s-2);
    border-radius: var(--r-md);
    font-size: var(--text-sm);
    transition: background-color var(--t-fast) var(--ease);
  }
  .row:hover {
    background: var(--surface-2);
  }
  .row.slot .name {
    color: var(--fg-subtle);
    font-weight: 400;
  }
  .name small,
  .lp small {
    margin-left: var(--s-2);
    color: var(--fg-subtle);
    font-size: var(--text-2xs);
    font-weight: 600;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }
  .n {
    width: 1.1rem;
    color: var(--fg-subtle);
    font-size: var(--text-xs);
    text-align: center;
  }
  /* The captain: a red C where the pick number would be */
  .c {
    flex-shrink: 0;
    width: 1.1rem;
    color: var(--red-hot);
    font-size: 0.95rem;
    text-align: center;
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

  /* The players: a ranked list, as a draft room does it; tiers as bands; Pick on the row on your turn */
  .players {
    display: grid;
    gap: var(--s-3);
    min-width: 0;
  }
  .chips {
    justify-self: start;
    flex-wrap: wrap;
    max-width: 100%;
  }
  .plist {
    display: grid;
    gap: var(--s-1);
  }
  .prow {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 1.6rem 5.5rem;
    align-items: center;
    gap: var(--s-3);
    min-height: 3rem;
    padding: 0 var(--s-1) 0 var(--s-3);
    border-radius: var(--r-md);
    transition: background-color var(--t-fast) var(--ease);
  }
  .prow:hover {
    background: var(--surface-2);
  }
  .prow.chosen {
    background: var(--surface-3);
  }
  .prow.dim {
    opacity: 0.4;
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
    color: var(--fg-subtle);
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
  .act {
    display: flex;
    justify-content: flex-end;
  }
  /* Pick: the app's small button, quiet in the list; the row you point at fills it cream */
  .pick {
    min-width: 4.5rem;
    border-color: var(--border-strong);
    font-weight: 600;
  }
  .prow:hover .pick,
  .pick:focus-visible,
  .pick[aria-pressed="true"] {
    border-color: transparent;
    background: var(--primary);
    color: var(--primary-fg);
  }
  .pick:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }

  /* The pick log, in its drawer: a round, then its picks, the player over the team */
  .log {
    display: grid;
    gap: var(--s-6);
  }
  .log section {
    display: grid;
    gap: var(--s-2);
  }
  .log h4 {
    margin: 0;
  }
  .log ol {
    display: grid;
    gap: var(--s-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .log li {
    display: grid;
    grid-template-columns: 1.6rem minmax(0, 1fr);
    column-gap: var(--s-3);
    align-items: center;
    padding: var(--s-2) 0;
  }
  .log .n {
    grid-row: 1 / 3;
    width: auto;
    font-size: var(--text-sm);
  }
  .lp {
    overflow: hidden;
    color: var(--fg);
    font-weight: 500;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .lt {
    overflow: hidden;
    color: var(--fg-muted);
    font-size: var(--text-xs);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .tools {
    display: flex;
    flex-shrink: 0;
    gap: var(--s-1);
    margin-left: auto;
  }
  .end + .tools {
    margin-left: 0;
  }
  .rules {
    display: grid;
    gap: var(--s-4);
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: rule;
  }
  .rules li {
    display: grid;
    grid-template-columns: 1.6rem minmax(0, 1fr);
    gap: 0.15rem var(--s-3);
    counter-increment: rule;
  }
  .rules li::before {
    content: counter(rule);
    grid-row: 1 / 3;
    color: var(--red-hot);
    font-family: var(--font-display);
    font-size: 1.25rem;
    line-height: 1.2;
  }
  .rules strong {
    color: var(--fg);
    font-weight: 600;
  }
  .rules span {
    color: var(--fg-muted);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  @media (max-width: 900px) {
    .end-bar {
      bottom: calc(var(--tab-h) + var(--s-3));
    }
    .tools .lbl {
      display: none;
    }
    .tick {
      width: 9.5rem;
    }
    .ticker {
      padding-inline: calc(50% - 4.75rem);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dot {
      animation: none;
    }
  }
</style>
