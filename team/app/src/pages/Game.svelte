<script lang="ts">
  import { onDestroy } from "svelte";
  import Icon from "../app/shell/Icon.svelte";
  import BackBar from "../app/shell/BackBar.svelte";
  import { PLAYERS } from "../demo/data";
  import { KUMITE_TEAMS, MATCHES } from "../demo/kumite";

  const match = MATCHES.find((m) => m.status === "live")!;
  const teams = [match.home, match.away].map((id) => KUMITE_TEAMS.find((t) => t.id === id)!);
  const GAME_MS = 12 * 60_000;

  // The clock is derived from start/pause events, so it survives a reload or a locked phone (T5 stores them).
  let remaining = $state(GAME_MS);
  let runningSince: number | null = $state(null);
  let goals = $state([...match.goals]);
  let picking: { team: number; scorer?: number } | null = $state(null);
  let tick = $state(0);
  let wakeLock: WakeLockSentinel | null = null;

  const timer = setInterval(() => (tick = Date.now()), 250);
  onDestroy(() => {
    clearInterval(timer);
    wakeLock?.release();
  });

  const left = $derived.by(() => {
    void tick;
    return Math.max(0, remaining - (runningSince ? Date.now() - runningSince : 0));
  });
  const clock = $derived(`${Math.floor(left / 60_000)}:${String(Math.floor(left / 1000) % 60).padStart(2, "0")}`);
  const progress = $derived(left / GAME_MS);

  $effect(() => {
    if (left === 0 && runningSince) {
      runningSince = null;
      remaining = 0;
      navigator.vibrate?.([400, 150, 400]);
    }
  });

  async function startPause() {
    if (runningSince) {
      remaining = left;
      runningSince = null;
    } else if (left > 0) {
      runningSince = Date.now();
      wakeLock ??= await navigator.wakeLock?.request("screen").catch(() => null);
    }
  }

  const score = (team: number) => goals.filter((g) => g.team === team).length;
  const roster = (team: number) =>
    KUMITE_TEAMS.find((t) => t.id === team)!.players.map((id) => PLAYERS.find((p) => p.id === id)!);

  function choose(id?: number) {
    if (!picking) return;
    if (picking.scorer === undefined) {
      if (id === undefined) return;
      picking = { ...picking, scorer: id };
    } else {
      goals = [...goals, { team: picking.team, scorer: picking.scorer, assist: id }];
      picking = null;
    }
  }
</script>

<BackBar
  href="/kumite"
  label="Games"
  title="Game {match.id}"
  right={runningSince ? "Running" : left === 0 ? "Full time" : "Paused"}
/>

<div class="game">
  <button
    class="clock"
    class:running={runningSince}
    class:done={left === 0}
    onclick={startPause}
    aria-label="{clock}, tap to {runningSince ? 'pause' : 'start'}"
  >
    <span class="time display num">{clock}</span>
    <span class="meter"><span style:transform="scaleX({progress})"></span></span>
    <span class="cue hint">
      <Icon name={runningSince ? "pause" : "play"} size={14} />
      {left === 0 ? "Full time" : runningSince ? "Tap to pause" : "Tap to start"}
    </span>
  </button>

  <div class="sides">
    {#each teams as team, i (team.id)}
      <div class="side" class:away={i === 1}>
        <span class="display name">{team.name}</span>
        <span class="display goals num">{score(team.id)}</span>
        <button class="btn primary goal" onclick={() => (picking = { team: team.id })}>Goal</button>
      </div>
    {/each}
  </div>

  <section class="log">
    <div class="log-head">
      <h2 class="section-title">Goals</h2>
      <button class="btn ghost sm" disabled={!goals.length} onclick={() => (goals = goals.slice(0, -1))}>
        <Icon name="undo" size={16} /> Undo
      </button>
    </div>
    {#if goals.length}
      <ol class="list">
        {#each [...goals].reverse() as g, i (goals.length - i)}
          <li class="row">
            <span class="who display">{KUMITE_TEAMS.find((t) => t.id === g.team)?.name}</span>
            <span class="grow">
              <span class="title">{PLAYERS.find((p) => p.id === g.scorer)?.name}</span>
              {#if g.assist}<span class="sub">Assist · {PLAYERS.find((p) => p.id === g.assist)?.name}</span>{/if}
            </span>
          </li>
        {/each}
      </ol>
    {:else}
      <p class="hint">No goals yet.</p>
    {/if}
  </section>
</div>

{#if picking}
  <button class="sheet-backdrop" onclick={() => (picking = null)} aria-label="Cancel"></button>
  <div class="sheet rise" role="dialog" aria-label="Who scored?">
    <h2>{picking.scorer === undefined ? "Who scored?" : "Assist?"}</h2>
    <div class="grid">
      {#each roster(picking.team).filter((p) => p.id !== picking?.scorer) as p (p.id)}
        <button class="btn outline" onclick={() => choose(p.id)}>{p.name.split(" ")[0]}</button>
      {/each}
    </div>
    {#if picking.scorer !== undefined}<button class="btn ghost" onclick={() => choose()}>No assist</button>{/if}
  </div>
{/if}

<style>
  .game {
    display: grid;
    gap: var(--s-6);
    width: 100%;
    max-width: 36rem;
    margin: 0 auto;
    padding: var(--s-5) var(--gutter) var(--s-10);
  }
  .clock {
    display: grid;
    justify-items: center;
    gap: var(--s-3);
    padding: var(--s-4) 0 var(--s-2);
    border: 0;
    background: none;
    color: var(--fg);
  }
  .clock:active .time {
    transform: scale(0.98);
  }
  .time {
    font-size: clamp(6rem, 32vw, 9rem);
    letter-spacing: 0.02em;
    transition:
      color var(--t-slow) var(--ease),
      transform var(--t-fast) var(--ease);
  }
  .running .time {
    color: var(--fg);
  }
  .done .time {
    color: var(--red-hot);
  }
  .meter {
    width: min(100%, 18rem);
    height: 3px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--fg) 10%, transparent);
    overflow: hidden;
  }
  .meter span {
    display: block;
    height: 100%;
    transform-origin: left;
    background: var(--red);
    transition: transform 0.25s linear;
  }
  .running .meter span {
    box-shadow: 0 0 12px var(--red);
  }
  .cue {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
  }
  .sides {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-block: 1px solid var(--border);
  }
  .side {
    display: grid;
    justify-items: center;
    gap: var(--s-2);
    padding: var(--s-5) var(--s-4);
  }
  .side.away {
    border-left: 1px solid var(--border);
  }
  .name {
    font-size: 1.4rem;
    color: var(--fg-muted);
  }
  .goals {
    font-size: 4.5rem;
    color: var(--fg);
  }
  .goal {
    width: 100%;
    height: 3.5rem;
    margin-top: var(--s-2);
    font-size: var(--text-md);
    font-weight: 600;
  }
  .log-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--s-3);
  }
  .log-head .section-title {
    margin: 0 var(--s-1);
  }
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .who {
    width: 4rem;
    color: var(--red-hot);
    font-size: 1rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
    gap: var(--s-2);
  }
</style>
