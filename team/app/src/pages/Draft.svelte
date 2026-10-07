<script lang="ts">
  // A captains' draft (ADR 0060). An admin opens it on the night; the captains take turns, in snake order, picking
  // from the members who said they're in (captains are in automatically, never picked). The captain on the clock picks
  // on their own phone; whoever runs the draft can pick for them, undo the last pick, and close it once everyone's
  // picked. Closed, the teams are set and the fixtures can be made (ADR 0061).
  import { can } from "../access/actions";
  import { PLAYERS } from "../demo/data";
  import { granted, me } from "../demo/session.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import Person from "../lib/Person.svelte";
  import TournamentHead from "../lib/TournamentHead.svelte";
  import { currentTournament, typeById } from "../demo/schedule.svelte";
  import {
    closeDraft,
    draftPick,
    makeFixtures,
    openDraft,
    refreshIfChanged,
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

  const teams = $derived(tournament?.teams ?? []);
  const picked = $derived(new Set(teams.flatMap((t) => t.players.map((p) => p.memberId))));
  const captains = $derived(new Set(teams.map((t) => t.captainMemberId)));
  const made = $derived(teams.reduce((n, t) => n + t.players.length, 0));
  // Who's left: everyone who said they're in, but not the captains or anyone already picked
  const pool = $derived(
    (tournament?.going ?? []).filter((id) => !picked.has(id) && !captains.has(id)).flatMap((id) => byId(id) ?? []),
  );
  const phase = $derived(tournament?.draftState ?? "none");
  const open = $derived(phase === "open");
  const clock = $derived(teams.length ? onTheClock(teams.length, made) : -1);
  const running = $derived(can(perms, "run:Draft"));
  const mine = $derived(clock >= 0 && teams[clock].captainMemberId === me().id);
  const canPick = $derived(open && (running || mine));
  const teamName = (i: number) => teams[i].name || `Team ${firstName(teams[i].captainMemberId)}`;
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

<div class="page">
  {#if tournament}
    <TournamentHead {type} {tournament} title="Draft" />
  {/if}

  {#if !tournament || tournament.kind !== "draft"}
    <p class="hint">No draft coming up.</p>
  {:else if teams.length < 2}
    <div class="panel pad">
      <p>The captains haven't been picked yet.</p>
      {#if can(perms, "manage:Tournament")}
        <a class="btn sm" href="/settings/tournaments">Add the captains</a>
      {/if}
    </div>
  {:else}
    <div class="page-head">
      <p class="hint num">
        {#if phase === "closed"}
          Draft closed · {made} picked
        {:else if open}
          {#if pool.length}Pick {made + 1} · snake order{:else}Everyone's picked{/if}
        {:else}
          {when ? `Draft ${when}` : "Draft date to be set"} · {pool.length} signed up so far
        {/if}
      </p>
      {#if running}
        <div class="run">
          {#if open && made}
            <button class="btn ghost sm" onclick={() => undoDraftPick(tournament.id)}
              ><Icon name="undo" size={16} /> Undo</button
            >
          {/if}
          {#if phase === "closed"}
            {#if !tournament.games?.length}
              <button class="btn primary sm" onclick={fixtures}>Make the fixtures</button>
            {/if}
          {:else if open}
            <button class="btn sm" class:primary={!pool.length} onclick={close}>Close the draft</button>
          {:else}
            <button class="btn primary sm" onclick={() => openDraft(tournament.id)}>Open the draft</button>
          {/if}
        </div>
      {/if}
    </div>
    {#if confirmLeaveOut}
      <div class="panel pad confirm" role="alert">
        <p>{pool.length} still to pick. Close the draft and leave them out?</p>
        <div class="run">
          <button class="btn sm" onclick={() => (confirmLeaveOut = false)}>Keep picking</button>
          <button class="btn primary sm" onclick={close}>Close it</button>
        </div>
      </div>
    {/if}

    <div class="boards">
      {#each teams as t, i (t.id ?? i)}
        <section class="board" class:clock={open && i === clock && pool.length}>
          <h2 class="display">{teamName(i)}</h2>
          <p class="hint">C · {firstName(t.captainMemberId)}</p>
          <ol>
            {#each t.players as p (p.memberId ?? p.name)}
              <li class="rise">{p.memberId ? firstName(p.memberId) : p.name}</li>
            {/each}
          </ol>
        </section>
      {/each}
    </div>

    {#if phase === "closed"}
      <div class="panel pad feature">
        The teams are set.
        {#if tournament.games?.length}<a href="/tournaments/{type.slug}">See the fixtures</a>{/if}
      </div>
    {:else if pool.length}
      <h2 class="section-title">
        {#if open}On the clock · {teamName(clock)}{#if mine}&nbsp;· your pick{/if}{:else}Signed up{/if}
      </h2>
      <div class="list">
        {#each pool as p (p.id)}
          <div class="row">
            <Person player={p} showRating={can(perms, "read:Rating")} />
            {#if canPick}
              <button class="btn primary sm" onclick={() => draftPick(tournament.id, p.id)}>Pick</button>
            {/if}
          </div>
        {/each}
      </div>
      {#if open}
        <p class="hint">
          {#if !canPick}Waiting for {firstName(teams[clock].captainMemberId)} to pick.{/if}
          Picks show up on everyone's phone within 10 seconds.
        </p>
      {:else}
        <p class="hint">The draft starts when an admin opens it{when ? `, ${when}` : ""}.</p>
      {/if}
    {:else if open}
      <div class="panel pad feature">Everyone's picked. An admin closes the draft to set the teams.</div>
    {:else}
      <p class="hint">Nobody's signed up yet.</p>
    {/if}
  {/if}
</div>

<style>
  .boards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: var(--s-2);
  }
  /* Each team a quiet tile; the one on the clock, a red wash with a bar along its top */
  .board {
    position: relative;
    display: grid;
    align-content: start;
    gap: 0.1rem;
    padding: var(--s-4) var(--s-3);
    overflow: hidden;
    border-radius: var(--r-md);
    background: var(--surface-1);
    transition: background-color var(--t) var(--ease-in-out);
  }
  .board.clock {
    background: var(--red-wash);
  }
  .board.clock::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--red-hot);
  }
  .board h2 {
    font-size: 1.4rem;
  }
  ol {
    margin: var(--s-3) 0 0;
    padding-left: 1.1rem;
    font-size: var(--text-sm);
    color: var(--fg-body);
    line-height: 1.7;
  }
  .run {
    display: flex;
    gap: var(--s-2);
  }
  .confirm {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    margin-bottom: var(--s-4);
  }
  .confirm p {
    margin: 0;
  }
</style>
