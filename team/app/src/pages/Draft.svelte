<script lang="ts">
  import { can } from "../access/actions";
  import { PLAYERS } from "../demo/data";
  import { granted } from "../demo/session.svelte";
  import Icon from "../app/shell/Icon.svelte";
  import Person from "../lib/Person.svelte";

  const perms = $derived(granted());
  const captains = [
    { name: "Red", captain: PLAYERS[0] },
    { name: "White", captain: PLAYERS[5] },
    { name: "Black", captain: PLAYERS[10] },
  ];
  const pool = PLAYERS.filter((p) => !captains.some((c) => c.captain.id === p.id)).slice(0, 12);
  let picks = $state<{ team: number; player: number }[]>([]);

  // Snake order: 1-2-3-3-2-1-... (a setting until the draft rules arrive).
  const onClock = $derived.by(() => {
    const n = captains.length;
    const round = Math.floor(picks.length / n);
    const slot = picks.length % n;
    return round % 2 ? n - 1 - slot : slot;
  });
  const left = $derived(pool.filter((p) => !picks.some((x) => x.player === p.id)));
  const canPick = $derived(can(perms, "pick:Draft") || can(perms, "run:Draft"));
</script>

<div class="page">
  <div class="page-head">
    <div>
      <h1>Draft</h1>
      <p class="hint num">Pick {Math.min(picks.length + 1, pool.length)} of {pool.length} · snake order</p>
    </div>
    {#if can(perms, "run:Draft") && picks.length}
      <button class="btn ghost sm" onclick={() => (picks = picks.slice(0, -1))}
        ><Icon name="undo" size={16} /> Undo</button
      >
    {/if}
  </div>

  <div class="boards">
    {#each captains as c, i (c.name)}
      <section class="board" class:clock={i === onClock && left.length}>
        <h2 class="display">{c.name}</h2>
        <p class="hint">C · {c.captain.name.split(" ")[0]}</p>
        <ol>
          {#each picks.filter((p) => p.team === i) as p (p.player)}
            <li class="rise">{PLAYERS.find((x) => x.id === p.player)?.name.split(" ")[0]}</li>
          {/each}
        </ol>
      </section>
    {/each}
  </div>

  {#if left.length}
    <h2 class="section-title">On the clock · {captains[onClock].name}</h2>
    <div class="list">
      {#each left as p (p.id)}
        <div class="row">
          <Person player={p} showRating={can(perms, "read:Rating")} />
          {#if canPick}
            <button class="btn primary sm" onclick={() => (picks = [...picks, { team: onClock, player: p.id }])}
              >Pick</button
            >
          {/if}
        </div>
      {/each}
    </div>
    {#if !canPick}<p class="hint">Only this draft's captains can pick.</p>{/if}
  {:else}
    <div class="panel pad feature">Draft complete. The teams go into the Kumite.</div>
  {/if}
  <p class="note">
    Demo: one phone picks for every captain. The live room, each captain on their own phone, comes in T6.
  </p>
</div>

<style>
  .boards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-block: 1px solid var(--border);
  }
  .board {
    position: relative;
    display: grid;
    align-content: start;
    gap: 0.1rem;
    padding: var(--s-4) var(--s-3);
    transition: background-color var(--t-slow) var(--ease);
  }
  .board + .board {
    border-left: 1px solid var(--border);
  }
  .board.clock {
    background: linear-gradient(180deg, var(--red-wash), transparent);
  }
  .board.clock::before {
    content: "";
    position: absolute;
    top: -1px;
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
