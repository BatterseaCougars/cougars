<script lang="ts">
  // A tournament's playoffs (ADR 0061): the games after the round robin, by table position. Three common shapes as
  // one tap (none, a Final, a Final and a 3rd-place game), or any list of games for something else.
  import type { Playoff } from "../demo/model";
  import Icon from "../app/shell/Icon.svelte";

  let { playoffs = $bindable() }: { playoffs: Playoff[] } = $props();

  const PRESETS: { id: string; label: string; games: Playoff[] }[] = [
    { id: "none", label: "No playoffs", games: [] },
    { id: "final", label: "Final", games: [{ name: "Final", home: 1, away: 2 }] },
    {
      id: "final3",
      label: "Final and 3rd place",
      games: [
        { name: "3rd place", home: 3, away: 4 },
        { name: "Final", home: 1, away: 2 },
      ],
    },
  ];
  const same = (a: Playoff[], b: Playoff[]) => JSON.stringify(a) === JSON.stringify(b);
  const preset = $derived(PRESETS.find((p) => same(p.games, playoffs))?.id ?? "custom");
  const nth = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
</script>

<div class="playoffs">
  <div class="seg" role="group" aria-label="Playoffs">
    {#each PRESETS as p (p.id)}
      <button type="button" aria-pressed={preset === p.id} onclick={() => (playoffs = structuredClone(p.games))}
        >{p.label}</button
      >
    {/each}
  </div>
  {#if playoffs.length}
    <ol class="games">
      {#each playoffs as game, i (i)}
        <li>
          <input class="input" aria-label="Game name" maxlength="40" bind:value={game.name} />
          <label class="pos"
            ><input class="input num" type="number" min="1" max="16" bind:value={game.home} aria-label="Home place" />
            <span class="hint">{nth(game.home || 1)}</span></label
          >
          <span class="v">v</span>
          <label class="pos"
            ><input class="input num" type="number" min="1" max="16" bind:value={game.away} aria-label="Away place" />
            <span class="hint">{nth(game.away || 1)}</span></label
          >
          <button
            type="button"
            class="btn sm ghost icon"
            aria-label="Remove {game.name || 'this game'}"
            onclick={() => playoffs.splice(i, 1)}><Icon name="x" size={16} /></button
          >
        </li>
      {/each}
    </ol>
    <p class="hint small">By place in the table once every group game has a result, played in this order.</p>
  {/if}
  {#if playoffs.length < 8}
    <button
      type="button"
      class="btn sm add"
      onclick={() => playoffs.push({ name: "", home: playoffs.length * 2 + 1, away: playoffs.length * 2 + 2 })}
    >
      <Icon name="plus" size={16} />Playoff game
    </button>
  {/if}
</div>

<style>
  .playoffs {
    display: grid;
    gap: var(--s-3);
    justify-items: start;
  }
  .games {
    display: grid;
    gap: var(--s-2);
    width: 100%;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .games li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto auto auto;
    gap: var(--s-2);
    align-items: center;
  }
  .pos {
    display: flex;
    align-items: center;
    gap: var(--s-1);
  }
  .pos .input {
    width: 4.5rem;
  }
  .v {
    color: var(--fg-subtle);
  }
  .hint {
    min-width: 2rem;
  }
</style>
