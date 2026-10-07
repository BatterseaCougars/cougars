<script lang="ts">
  // A captains' draft (ADR 0052): on draft day the captains take turns, in snake order, picking from the members who
  // said they're in. The captain on the clock picks on their own phone; whoever's running the draft can pick for them
  // and undo the last pick. Everyone else watches the boards fill.
  import { can } from "../access/actions";
  import { PLAYERS } from "../demo/data";
  import { granted, me } from "../demo/session.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import Person from "../lib/Person.svelte";
  import TournamentHead from "../lib/TournamentHead.svelte";
  import { currentTournament, typeById } from "../demo/schedule.svelte";
  import { draftPick, refreshIfChanged, undoDraftPick } from "../app/backend.svelte";
  import { formatDayDate, londonISO, londonToday } from "../lib/dates";
  import { onTheClock } from "../lib/draft";

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
  const clock = $derived(teams.length ? onTheClock(teams.length, made) : -1);
  const started = $derived(!!tournament?.draftOn && londonToday() >= tournament.draftOn);
  const running = $derived(can(perms, "run:Draft"));
  const mine = $derived(clock >= 0 && teams[clock].captainMemberId === me().id);
  const canPick = $derived(started && (running || mine));
  const teamName = (i: number) => teams[i].name || `Team ${firstName(teams[i].captainMemberId)}`;

  // During the draft, the other captains' picks show up within 10 seconds. Each check is a Worker request and a few
  // small queries (session, roles, data version), so it's slow enough that a room of phones on one wifi stays
  // inside the per-address limit (ADR 0056) and a draft night is a small part of the free day (ADR 0058)
  $effect(() => {
    if (!started || !pool.length) return;
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
  {:else if !teams.length}
    <div class="panel pad">
      <p>The captains haven't been picked yet.</p>
      {#if can(perms, "manage:Tournament")}
        <a class="btn sm" href="/settings/tournaments">Add the captains</a>
      {/if}
    </div>
  {:else}
    <div class="page-head">
      <p class="hint num">
        {#if !started}
          {#if tournament.draftOn}
            Draft {formatDayDate(londonISO(tournament.draftOn, tournament.draftTime ?? "12:00"))}{tournament.draftTime
              ? ` at ${tournament.draftTime}`
              : ""}
          {:else}
            Draft date to be set
          {/if}
          · {pool.length} signed up so far
        {:else if pool.length}
          Pick {made + 1} · snake order
        {:else}
          {made} picked
        {/if}
      </p>
      {#if running && started && made}
        <button class="btn ghost sm" onclick={() => undoDraftPick(tournament.id)}
          ><Icon name="undo" size={16} /> Undo</button
        >
      {/if}
    </div>

    <div class="boards">
      {#each teams as t, i (t.id ?? i)}
        <section class="board" class:clock={started && i === clock && pool.length}>
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

    {#if pool.length}
      <h2 class="section-title">
        {#if started}On the clock · {teamName(clock)}{#if mine}&nbsp;· your pick{/if}{:else}Signed up{/if}
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
      {#if started}
        <p class="hint">
          {#if !canPick}Waiting for {firstName(teams[clock].captainMemberId)} to pick.{/if}
          Picks show up on everyone's phone within 10 seconds.
        </p>
      {/if}
    {:else if started}
      <div class="panel pad feature">Draft complete. The teams go into the {type.name}.</div>
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
</style>
